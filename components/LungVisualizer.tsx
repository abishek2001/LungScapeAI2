
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LungMetrics, VisualizationLayers } from '../types';
import { X, List, AlertCircle } from 'lucide-react';

interface LungVisualizerProps {
    metrics: LungMetrics;
    layers: VisualizationLayers;
    showOverlay: boolean;
    externalControlsRef?: React.MutableRefObject<OrbitControls | null>;
    className?: string;
    onStructureClick?: (name: string) => void;
}

const STRUCTURE_POINTS: Record<string, THREE.Vector3> = {
    bronchi: new THREE.Vector3(0, 2.8, 0), // Bifurcation area
    bronchioles: new THREE.Vector3(2.0, 1.5, 0.5),
    alveoli: new THREE.Vector3(-2.8, -1.5, 1.8),
    vasculature: new THREE.Vector3(2.8, 0.5, 1.5),
    pleura: new THREE.Vector3(-4.0, 0.0, 0.0), // Outer edge
    fibrosisMap: new THREE.Vector3(3.0, -3.5, 1.0),
    airflow: new THREE.Vector3(0, 1.5, 0.0), // Central flow area
    lobes: new THREE.Vector3(-3.0, 1.5, 1.0),
    pathology: new THREE.Vector3(-2.8, 1.2, 0.8), // Moved from 3.5 to 1.2 (Middle)
};

// --- SHADERS ---

const lungVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewPosition;
  
  uniform float time;
  uniform float expansionRatio;
  uniform float stiffnessIndex;
  uniform float uMotion;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position; 
    
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;

    float rawCycle = sin(time * 1.5);
    float breathCycle = (rawCycle + 1.0) * 0.5;
    
    // Stiffness effect: lower parts move less if stiffness is high
    float stiffnessThreshold = -6.0 + stiffnessIndex; 
    float elasticity = 1.0;
    
    if (position.y < stiffnessThreshold) {
       float depth = stiffnessThreshold - position.y;
       elasticity = max(0.15, 1.0 - (depth * 0.3)); // INCREASED MIN VISIBILITY
    }

    // Expansion Logic
    float expansion = expansionRatio * 0.35 * breathCycle * elasticity * uMotion; // INCREASED BASE MAGNITUDE
    vec3 newPos = position + (normal * expansion);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
  }
`;

const lungFragmentShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewPosition;
  
  uniform float uIsRightLung;
  uniform float uShowLobes;
  uniform float uShowAlveoli;
  uniform float uShowFibrosisMap;

  float rand(vec2 co){
      return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
  }

  void main() {
    vec3 topColor = vec3(0.65, 0.45, 0.65); // Healthy tissue
    vec3 bottomColor = vec3(0.45, 0.25, 0.45); // Denser/Lower
    
    float heightFactor = smoothstep(-3.0, 3.0, vPosition.y);
    vec3 color = mix(bottomColor, topColor, heightFactor);

    // Fissures for Lobes
    float fissure = 0.0;
    if (uIsRightLung > 0.5) {
       // Right Lung Fissures (approximate)
       float f1 = 1.0 - smoothstep(0.0, 0.05, abs(vPosition.y - 1.2 - vPosition.x * 0.2));
       float f2 = 1.0 - smoothstep(0.0, 0.05, abs(vPosition.y + 1.5 - vPosition.z * 0.5));
       fissure = max(f1, f2);
    } else {
       // Left Lung Fissure
       float f1 = 1.0 - smoothstep(0.0, 0.05, abs(vPosition.y - 0.5 - vPosition.z * 0.8));
       fissure = f1;
    }

    if (uShowLobes > 0.5) {
        color = mix(color, vec3(0.2, 0.1, 0.2), fissure * 0.6); // Darken fissures
        // Color code lobes slightly
        if (vPosition.y > 1.2) color += vec3(0.05, 0.0, 0.0); // Upper
        else if (vPosition.y < -1.5) color += vec3(0.0, 0.0, 0.05); // Lower
    } else {
        color *= (1.0 - fissure * 0.2); // Subtle fissures normally
    }

    // Lighting
    vec3 viewDir = normalize(vViewPosition);
    vec3 normal = normalize(vNormal);
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
    
    vec3 lightDir = normalize(vec3(5.0, 10.0, 10.0));
    vec3 halfVector = normalize(lightDir + viewDir);
    float NdotH = max(0.0, dot(normal, halfVector));
    float specular = pow(NdotH, 64.0);

    float alpha = 0.45 + (0.4 * fresnel); // Base opacity
    
    // Alveoli Texture
    if (uShowAlveoli > 0.5) {
        float noise = rand(vPosition.xy * 20.0);
        color += noise * 0.05;
        alpha += noise * 0.1;
    }

    // Fibrosis Heatmap (Basal predominant)
    if (uShowFibrosisMap > 0.5 && vPosition.y < -0.5) {
        float scar = smoothstep(-0.5, -4.0, vPosition.y);
        vec3 scarColor = vec3(0.8, 0.6, 0.2); // Fibrotic yellow/brown
        color = mix(color, scarColor, scar * 0.8);
        alpha = mix(alpha, 0.95, scar * 0.8);
    }

    vec3 finalColor = color + (vec3(1.0) * specular * 0.4) + (vec3(0.8, 0.6, 0.8) * fresnel * 0.5);

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

const pathologyVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  uniform float time;
  void main() {
    vUv = uv;
    vNormal = normal;
    float pulse = 1.0 + sin(time * 4.0) * 0.08;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position * pulse, 1.0);
  }
`;

const pathologyFragmentShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  uniform float time;
  void main() {
    vec3 baseColor = vec3(1.0, 0.4, 0.1); 
    float noise = sin(vUv.x * 20.0 + time) * cos(vUv.y * 20.0 + time);
    float alpha = 0.8 + noise * 0.2;
    float fresnel = pow(1.0 - dot(normalize(vNormal), vec3(0,0,1)), 2.0);
    gl_FragColor = vec4(baseColor + fresnel * 0.6, alpha);
  }
`;

const LungVisualizer: React.FC<LungVisualizerProps> = ({
    metrics,
    layers,
    showOverlay,
    externalControlsRef,
    className,
    onStructureClick
}) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const materialsRef = useRef<THREE.ShaderMaterial[]>([]);
    const frameIdRef = useRef<number>(0);

    // Interaction State
    const [activeLabel, setActiveLabel] = useState<string | null>(null);
    const [isLegendOpen, setIsLegendOpen] = useState(false);

    // UI References for connecting lines
    const labelRef = useRef<HTMLDivElement>(null);
    const svgLineRef = useRef<SVGLineElement>(null);

    // References
    const rightLungRef = useRef<THREE.Mesh | null>(null);
    const leftLungRef = useRef<THREE.Mesh | null>(null);
    const bronchiGroupRef = useRef<THREE.Group | null>(null);
    const bronchiolesGroupRef = useRef<THREE.Group | null>(null);
    const vesselsGroupRef = useRef<THREE.Group | null>(null);
    const airflowSystemRef = useRef<THREE.Points | null>(null);
    const pathologyMeshRef = useRef<THREE.Mesh | null>(null);

    const layersRef = useRef(layers);
    const metricsRef = useRef(metrics);

    const raycaster = useRef(new THREE.Raycaster());
    const mouse = useRef(new THREE.Vector2());

    // Keep refs updated
    useEffect(() => { layersRef.current = layers; }, [layers]);
    useEffect(() => { metricsRef.current = metrics; }, [metrics]);

    const handleCanvasClick = (event: MouseEvent) => {
        if (!mountRef.current || !cameraRef.current || !sceneRef.current) return;

        const rect = mountRef.current.getBoundingClientRect();
        mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.current.setFromCamera(mouse.current, cameraRef.current);
        const intersects = raycaster.current.intersectObjects(sceneRef.current.children, true);

        if (intersects.length > 0) {
            const hitPathology = intersects.find(hit => hit.object.name === 'pathology');
            if (hitPathology) {
                onStructureClick?.('pathology');
                setActiveLabel('pathology');
                return;
            }
            setActiveLabel(null);
        } else {
            setActiveLabel(null);
        }
    };

    useEffect(() => {
        if (!mountRef.current) return;

        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;

        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        camera.position.set(0, 0, 18);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 0);
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        if (externalControlsRef) {
            externalControlsRef.current = controls;
        }

        renderer.domElement.addEventListener('click', handleCanvasClick);

        // --- 1. LUNG MESHES ---
        const createLungMesh = (isRight: boolean) => {
            const geo = new THREE.SphereGeometry(isRight ? 2.9 : 2.75, 128, 128);
            // Shape deformation
            const pos = geo.attributes.position;
            for (let i = 0; i < pos.count; i++) {
                let x = pos.getX(i);
                let y = pos.getY(i);
                let z = pos.getZ(i);
                if ((isRight && x < 0) || (!isRight && x > 0)) x *= 0.3; // Flatten medial side
                let scaleXZ = y > 0 ? 1.0 - (y * 0.12) : 1.0 + (Math.abs(y) * 0.05); // Taper top
                if (!isRight && x > 0 && y < 0.5 && y > -1.5 && z > 0) { // Cardiac notch
                    const dist = Math.sqrt(x * x + y * y + z * z);
                    x -= 0.6 * (1.0 - Math.min(dist / 2.5, 1.0));
                }
                pos.setX(i, x * scaleXZ);
                pos.setZ(i, z * scaleXZ);
                pos.setY(i, y * 1.3); // Elongate
            }
            geo.computeVertexNormals();
            const mat = new THREE.ShaderMaterial({
                vertexShader: lungVertexShader,
                fragmentShader: lungFragmentShader,
                uniforms: {
                    time: { value: 0 },
                    expansionRatio: { value: metrics.expansionRatio },
                    stiffnessIndex: { value: metrics.stiffnessIndex },
                    uIsRightLung: { value: isRight ? 1.0 : 0.0 },
                    uShowLobes: { value: 0.0 },
                    uShowAlveoli: { value: 0.0 },
                    uShowFibrosisMap: { value: 0.0 },
                    uMotion: { value: 1.0 }
                },
                side: THREE.FrontSide,
                transparent: true,
                depthWrite: false,
                blending: THREE.NormalBlending
            });
            materialsRef.current.push(mat);
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.x = isRight ? 3.0 : -3.0;
            return mesh;
        };

        const rightLung = createLungMesh(true);
        rightLungRef.current = rightLung;
        const leftLung = createLungMesh(false);
        leftLungRef.current = leftLung;
        rightLung.renderOrder = 1;
        leftLung.renderOrder = 1;
        scene.add(rightLung);
        scene.add(leftLung);

        // --- 2. AIRWAYS & VESSELS ---
        const bronchiGroup = new THREE.Group();
        const bronchiolesGroup = new THREE.Group();
        const vesselsGroup = new THREE.Group();
        const bronchiMat = new THREE.MeshStandardMaterial({ color: 0xd0e8f0, roughness: 0.4, metalness: 0.2 });
        const bronchiolesMat = new THREE.MeshStandardMaterial({ color: 0xe0f2f7, roughness: 0.5, transparent: true, opacity: 0.6 });

        const createBranch = (
            start: THREE.Vector3,
            dir: THREE.Vector3,
            length: number,
            radius: number,
            depth: number,
            isVein: boolean = false,
            isArtery: boolean = false
        ) => {
            if (depth === 0) return;

            const end = start.clone().add(dir.clone().multiplyScalar(length));

            let geo: THREE.BufferGeometry;
            if (depth < 2) {
                const thickness = radius;
                geo = new THREE.BoxGeometry(thickness, length, thickness);
            } else {
                geo = new THREE.CylinderGeometry(radius * 0.8, radius, length, 5);
            }

            geo.translate(0, length / 2, 0);
            const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
            geo.applyQuaternion(q);
            geo.translate(start.x, start.y, start.z);

            let mat = bronchiMat;
            if (isVein) mat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.6 }); // Blue
            if (isArtery) mat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.6 }); // Red
            if (!isVein && !isArtery && depth <= 3) mat = bronchiolesMat;

            const mesh = new THREE.Mesh(geo, mat);

            if (isVein || isArtery) {
                vesselsGroup.add(mesh);
            } else {
                if (depth > 3) bronchiGroup.add(mesh); else bronchiolesGroup.add(mesh);
            }

            const branchCount = 2;
            for (let i = 0; i < branchCount; i++) {
                const spread = isVein || isArtery ? 0.5 : 0.8;
                const newDir = dir.clone().applyEuler(new THREE.Euler(
                    (Math.random() - 0.5) * spread,
                    (Math.random() - 0.5) * spread,
                    (Math.random() - 0.5) * spread
                )).normalize();
                createBranch(end, newDir, length * 0.8, radius * 0.7, depth - 1, isVein, isArtery);
            }
        };

        // Main Trachea
        const trachea = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 4, 16).translate(0, 4.0, 0), bronchiMat);
        bronchiGroup.add(trachea);

        // Initial Branches
        createBranch(new THREE.Vector3(0, 2.0, 0), new THREE.Vector3(0.8, -0.8, 0.2).normalize(), 2.0, 0.5, 5, false, false);
        createBranch(new THREE.Vector3(0, 2.0, 0), new THREE.Vector3(-0.8, -0.7, 0.2).normalize(), 2.0, 0.5, 5, false, false);

        // Vessels
        createBranch(new THREE.Vector3(0.5, 2.0, 0.5), new THREE.Vector3(0.8, -0.8, 0.2).normalize(), 2.0, 0.3, 4, true, false);
        createBranch(new THREE.Vector3(-0.5, 2.0, 0.5), new THREE.Vector3(-0.8, -0.7, 0.2).normalize(), 2.0, 0.3, 4, true, false);
        createBranch(new THREE.Vector3(0.2, 2.0, -0.2), new THREE.Vector3(0.7, -0.9, 0.1).normalize(), 2.0, 0.3, 4, false, true);
        createBranch(new THREE.Vector3(-0.2, 2.0, -0.2), new THREE.Vector3(-0.7, -0.8, 0.1).normalize(), 2.0, 0.3, 4, false, true);

        scene.add(bronchiGroup);
        scene.add(bronchiolesGroup);
        scene.add(vesselsGroup);
        bronchiGroupRef.current = bronchiGroup;
        bronchiolesGroupRef.current = bronchiolesGroup;
        vesselsGroupRef.current = vesselsGroup;

        // --- 3. PATHOLOGY MESH ---
        const pathologyGeo = new THREE.SphereGeometry(0.6, 32, 32);
        const pPos = pathologyGeo.attributes.position;
        for (let i = 0; i < pPos.count; i++) {
            pPos.setXYZ(i, pPos.getX(i) + Math.random() * 0.1, pPos.getY(i) + Math.random() * 0.1, pPos.getZ(i) + Math.random() * 0.1);
        }
        const pathologyMat = new THREE.ShaderMaterial({
            vertexShader: pathologyVertexShader,
            fragmentShader: pathologyFragmentShader,
            uniforms: { time: { value: 0 } },
            transparent: true,
            side: THREE.FrontSide
        });
        const pathologyMesh = new THREE.Mesh(pathologyGeo, pathologyMat);
        pathologyMesh.position.copy(STRUCTURE_POINTS.pathology);
        pathologyMesh.name = 'pathology';
        pathologyMeshRef.current = pathologyMesh;
        scene.add(pathologyMesh);

        // --- 4. PARTICLES (Physiological Airflow) ---
        // Flow from airways (bifurcation at y=2.0) outwards
        const airCount = 800;
        const airGeo = new THREE.BufferGeometry();
        const airPositions = new Float32Array(airCount * 3);
        const airVelocities = new Float32Array(airCount * 3); // Store direction
        const airLifetimes = new Float32Array(airCount); // 0.0 to 1.0

        const initParticle = (i: number) => {
            // Start near the bifurcation (approx 2.0 - 2.5 height)
            const isRight = Math.random() > 0.5;
            const startX = 0;
            const startY = 2.2 + (Math.random() - 0.5) * 0.4;
            const startZ = 0;

            // Target: Random point inside lung approximate volume
            // We simulate the lung volume by using the same math as the mesh generation
            const u = Math.random();
            const v = Math.random();
            const theta = 2 * Math.PI * u;
            const phi = Math.acos(2 * v - 1); // Uniform sphere
            const r = 2.5 * Math.cbrt(Math.random()); // Volume distribution

            let tx = r * Math.sin(phi) * Math.cos(theta);
            let ty = r * Math.sin(phi) * Math.sin(theta);
            let tz = r * Math.cos(phi);

            // Transform target to match lung shape (approx)
            tx += (isRight ? 3.0 : -3.0);
            ty *= 1.3; // Elongation

            // Set Start Position
            airPositions[i * 3] = startX;
            airPositions[i * 3 + 1] = startY;
            airPositions[i * 3 + 2] = startZ;

            // Calculate Velocity Vector (Target - Start)
            const dx = tx - airPositions[i * 3];
            const dy = ty - airPositions[i * 3 + 1];
            const dz = tz - airPositions[i * 3 + 2];

            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            // Time to reach target: Random 1-2 seconds (at 60fps)
            const frames = 60 + Math.random() * 60;
            const speed = dist / frames;

            airVelocities[i * 3] = (dx / dist) * speed;
            airVelocities[i * 3 + 1] = (dy / dist) * speed;
            airVelocities[i * 3 + 2] = (dz / dist) * speed;

            airLifetimes[i] = Math.random(); // Random start phase
        };

        for (let i = 0; i < airCount; i++) {
            initParticle(i);
        }

        airGeo.setAttribute('position', new THREE.BufferAttribute(airPositions, 3));

        const airMat = new THREE.PointsMaterial({
            color: 0xa5f3fc, // Cyan-200
            size: 0.18, // INCREASED SIZE
            transparent: true,
            opacity: 0.8, // INCREASED OPACITY
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const airflowSystem = new THREE.Points(airGeo, airMat);
        airflowSystem.renderOrder = 2; // RENDER ON TOP
        scene.add(airflowSystem);
        airflowSystemRef.current = airflowSystem;

        // --- LIGHTING ---
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(5, 10, 10);
        scene.add(dirLight);
        const backLight = new THREE.DirectionalLight(0x818cf8, 0.5);
        backLight.position.set(-5, 5, -10);
        scene.add(backLight);

        const clock = new THREE.Clock();

        // --- ANIMATION LOOP ---
        const animate = () => {
            frameIdRef.current = requestAnimationFrame(animate);
            const time = clock.getElapsedTime();
            controls.update();

            const L = layersRef.current;
            const M = metricsRef.current;

            // Update Shader Uniforms
            materialsRef.current.forEach(mat => {
                mat.uniforms.time.value = time;
                mat.uniforms.stiffnessIndex.value = M.stiffnessIndex;
                mat.uniforms.expansionRatio.value = M.expansionRatio;
                mat.uniforms.uShowLobes.value = L.lobes ? 1.0 : 0.0;
                mat.uniforms.uShowAlveoli.value = L.alveoli ? 1.0 : 0.0;
                mat.uniforms.uShowFibrosisMap.value = L.fibrosisMap ? 1.0 : 0.0;
                mat.uniforms.uMotion.value = L.motion ? 1.0 : 0.0;
            });

            if (pathologyMeshRef.current) {
                (pathologyMeshRef.current.material as THREE.ShaderMaterial).uniforms.time.value = time;
            }

            // Visibility Toggles
            if (rightLungRef.current) rightLungRef.current.visible = L.rightLung;
            if (leftLungRef.current) leftLungRef.current.visible = L.leftLung;
            if (bronchiGroupRef.current) bronchiGroupRef.current.visible = L.bronchi;
            if (bronchiolesGroupRef.current) bronchiolesGroupRef.current.visible = L.bronchioles;
            if (vesselsGroupRef.current) vesselsGroupRef.current.visible = L.vasculature;

            // --- AIRFLOW ANIMATION UPDATE ---
            if (airflowSystemRef.current) {
                airflowSystemRef.current.visible = L.airflow;
                if (L.airflow) {
                    const positions = airflowSystemRef.current.geometry.attributes.position.array as Float32Array;

                    for (let i = 0; i < airCount; i++) {
                        airLifetimes[i] += 0.015; // Speed factor

                        if (airLifetimes[i] > 1.0) {
                            // Reset particle
                            initParticle(i);
                            airLifetimes[i] = 0;
                        } else {
                            // Move particle
                            positions[i * 3] += airVelocities[i * 3];
                            positions[i * 3 + 1] += airVelocities[i * 3 + 1];
                            positions[i * 3 + 2] += airVelocities[i * 3 + 2];
                        }
                    }
                    airflowSystemRef.current.geometry.attributes.position.needsUpdate = true;
                }
            }

            // --- ARROW & LABEL MAPPING ---
            const activeKey = activeLabelRef.current;
            if (mountRef.current && activeKey && STRUCTURE_POINTS[activeKey]) {
                const targetPos = STRUCTURE_POINTS[activeKey].clone();
                targetPos.project(cameraRef.current);

                // Only draw if point is in front of camera
                if (targetPos.z < 1) {
                    const widthHalf = mountRef.current.clientWidth / 2;
                    const heightHalf = mountRef.current.clientHeight / 2;

                    // 3D Point Screen Coords (Where arrow points TO)
                    const screenX = (targetPos.x * widthHalf) + widthHalf;
                    const screenY = -(targetPos.y * heightHalf) + heightHalf;

                    // Label Position (Where arrow points FROM)
                    const labelOffsetX = 60;
                    const labelOffsetY = -80;
                    const labelX = screenX + labelOffsetX;
                    const labelY = screenY + labelOffsetY;

                    // Update Label Div Position
                    if (labelRef.current) {
                        labelRef.current.style.transform = `translate(${labelX}px, ${labelY}px)`;
                        labelRef.current.style.opacity = '1';
                        labelRef.current.style.pointerEvents = 'auto';
                    }

                    // Update SVG Line (Arrow)
                    if (svgLineRef.current) {
                        // Start arrow at the bottom-left corner of the label box
                        const startX = labelX;
                        const startY = labelY + 20; // Slight offset to match label box height

                        svgLineRef.current.setAttribute('x1', String(startX));
                        svgLineRef.current.setAttribute('y1', String(startY));
                        svgLineRef.current.setAttribute('x2', String(screenX));
                        svgLineRef.current.setAttribute('y2', String(screenY));
                        svgLineRef.current.style.display = 'block';
                    }

                } else {
                    if (labelRef.current) labelRef.current.style.opacity = '0';
                    if (svgLineRef.current) svgLineRef.current.style.display = 'none';
                }
            } else {
                // Hide if no active label
                if (labelRef.current && activeKey !== 'pathology') labelRef.current.style.opacity = '0';
                if (svgLineRef.current) svgLineRef.current.style.display = 'none';
            }

            renderer.render(scene, camera);
        };
        animate();

        return () => {
            cancelAnimationFrame(frameIdRef.current);
            renderer.domElement.removeEventListener('click', handleCanvasClick);
            if (mountRef.current && rendererRef.current) mountRef.current.removeChild(rendererRef.current.domElement);
            rendererRef.current.dispose();
        };
    }, [activeLabel]);

    const activeLabelRef = useRef(activeLabel);
    useEffect(() => { activeLabelRef.current = activeLabel; }, [activeLabel]);

    const handleLegendClick = (key: string) => setActiveLabel(activeLabel === key ? null : key);

    return (
        <div className={`relative ${className || 'w-full h-full'}`}>
            <div ref={mountRef} className="w-full h-full cursor-pointer bg-slate-900/0" />

            {/* SVG Overlay for Arrows */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#f8fafc" />
                    </marker>
                </defs>
                <line
                    ref={svgLineRef}
                    x1="0" y1="0" x2="0" y2="0"
                    stroke="#f8fafc"
                    strokeWidth="1.5"
                    strokeDasharray="4"
                    markerEnd="url(#arrowhead)"
                    style={{ display: 'none' }}
                    className="opacity-70 drop-shadow-md"
                />
            </svg>

            {/* Floating Indicator for Pathology / Selected Label */}
            <div
                ref={labelRef}
                className="absolute top-0 left-0 z-30 transition-opacity duration-300"
                style={{ opacity: 0, pointerEvents: 'none' }} // Initial state hidden
            >
                {!activeLabel && (
                    <div className="flex flex-col items-center -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                        <div className="animate-bounce">
                            <div className="bg-orange-500/90 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.6)] backdrop-blur border border-orange-300">
                                <AlertCircle size={20} fill="currentColor" className="text-white" />
                            </div>
                        </div>
                        <div className="mt-2 bg-black/60 px-2 py-1 rounded text-[10px] text-orange-200 whitespace-nowrap text-center backdrop-blur-md border border-orange-500/30">
                            Click Issue
                        </div>
                    </div>
                )}

                {activeLabel && (
                    <div className={`bg-slate-900/90 border px-3 py-2 rounded-lg backdrop-blur-md shadow-2xl -translate-x-1/2 -translate-y-1/2 pointer-events-none ${activeLabel === 'pathology' ? 'border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.3)]' : 'border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                        }`}>
                        <p className={`text-xs font-bold uppercase tracking-wider whitespace-nowrap ${activeLabel === 'pathology' ? 'text-orange-400' : 'text-cyan-50'}`}>
                            {activeLabel === 'pathology' ? 'Emphysematous Bulla (COPD)' : activeLabel === 'fibrosisMap' ? 'Honeycombing (Basal)' : activeLabel}
                        </p>
                    </div>
                )}
            </div>

            {showOverlay && (
                <div className="absolute bottom-6 left-6 z-20 flex flex-col items-start gap-3">
                    {isLegendOpen && (
                        <div className="bg-slate-900/95 p-4 rounded-xl backdrop-blur-xl border border-slate-700/60 shadow-2xl min-w-[260px] animate-in slide-in-from-bottom-5 fade-in duration-300 origin-bottom-left max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-700/80">
                                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Structure Map</span>
                                <button onClick={() => setIsLegendOpen(false)} className="text-slate-500 hover:text-white transition-colors"><X size={14} /></button>
                            </div>
                            <div className="space-y-2">
                                <button
                                    onClick={() => { handleLegendClick('pathology'); onStructureClick?.('pathology'); }}
                                    className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all text-left group
                                 ${activeLabel === 'pathology' ? 'bg-orange-900/30 ring-1 ring-orange-500/50' : 'hover:bg-slate-800/60'}
                             `}
                                >
                                    <div className="w-3 h-3 rounded-full bg-orange-500 border border-orange-300 shadow-sm animate-pulse"></div>
                                    <span className={`text-xs ${activeLabel === 'pathology' ? 'text-orange-400 font-semibold' : 'text-slate-300 group-hover:text-white'}`}>
                                        Detected Pathology
                                    </span>
                                </button>

                                {[
                                    { key: 'lobes', label: 'Lobes', color: 'bg-purple-400' },
                                    { key: 'bronchi', label: 'Airways', color: 'bg-cyan-100' },
                                    { key: 'vasculature', label: 'Vessels', color: 'bg-red-500' },
                                    { key: 'alveoli', label: 'Alveoli', color: 'bg-rose-300' },
                                    { key: 'pleura', label: 'Pleura', color: 'bg-slate-400' },
                                    { key: 'fibrosisMap', label: 'Fibrosis', color: 'bg-amber-500' },
                                    { key: 'airflow', label: 'Airflow', color: 'bg-cyan-300' },
                                ].map((item) => (
                                    <button
                                        key={item.key}
                                        onClick={() => handleLegendClick(item.key)}
                                        className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all text-left group ${activeLabel === item.key ? 'bg-slate-800 ring-1 ring-cyan-500/50' : 'hover:bg-slate-800/60'}`}
                                    >
                                        <div className={`w-3 h-3 rounded-full ${item.color} border border-slate-500`}></div>
                                        <span className="text-xs text-slate-300 group-hover:text-white">{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {!isLegendOpen && (
                        <button onClick={() => setIsLegendOpen(true)} className="flex items-center gap-3 bg-slate-900/90 hover:bg-slate-800 text-slate-200 px-4 py-3 rounded-xl border border-slate-700/50 backdrop-blur-xl shadow-xl transition-all hover:scale-105 group">
                            <div className="bg-cyan-500/20 p-1.5 rounded-lg text-cyan-400"><List size={18} /></div>
                            <div className="flex flex-col items-start mr-1">
                                <span className="text-xs font-bold uppercase tracking-wider">Lung Structures</span>
                                <span className="text-[10px] text-slate-400">View Legend</span>
                            </div>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default LungVisualizer;

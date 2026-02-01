
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Camera, XCircle, RefreshCw } from 'lucide-react';

interface HandGestureControllerProps {
  onEnableChange: (enabled: boolean) => void;
  targetControlsRef: React.MutableRefObject<OrbitControls | null>;
}

const HandGestureController: React.FC<HandGestureControllerProps> = ({ onEnableChange, targetControlsRef }) => {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("Initializing AI...");
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const animationFrameRef = useRef<number>(0);
  const lastPredictionTimeRef = useRef<number>(0);

  // Prop Tracking (Crucial for switching between Normal/Fullscreen controls)
  // This ensures the animation loop always accesses the latest ref passed from parent
  const activeControlsPropRef = useRef(targetControlsRef);

  useEffect(() => {
    activeControlsPropRef.current = targetControlsRef;
  }, [targetControlsRef]);

  // Gesture State
  const lastPinchDistRef = useRef<number | null>(null);
  const lastCentroidRef = useRef<{x: number, y: number} | null>(null);
  const wasDampingEnabledRef = useRef<boolean>(true);
  const isControllingRef = useRef<boolean>(false);

  // 1. Initialize MediaPipe (Run once)
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm"
        );
        
        if (!isMounted) return;

        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "CPU"
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.3, 
          minHandPresenceConfidence: 0.3,
          minTrackingConfidence: 0.3
        });
        
        if (isMounted) {
            landmarkerRef.current = landmarker;
            setStatus("Ready");
            setLoading(false);
        }
      } catch (err) {
        console.error("MediaPipe Init Error:", err);
        if (isMounted) {
            setStatus("AI Init Failed");
            setError("Could not load AI model.");
            setLoading(false);
        }
      }
    };
    init();

    return () => {
      isMounted = false;
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
      }
    };
  }, []);

  // 2. Control Loop
  useEffect(() => {
    if (enabled) {
      const loop = () => {
        // Throttling to ~30fps 
        const now = Date.now();
        if (now - lastPredictionTimeRef.current >= 30) {
            if (videoRef.current && 
                videoRef.current.readyState >= 2 && 
                landmarkerRef.current &&
                !videoRef.current.paused) {
              lastPredictionTimeRef.current = now;
              predictWebcam();
            }
        }
        animationFrameRef.current = requestAnimationFrame(loop);
      };
      loop();
    } else {
      cancelAnimationFrame(animationFrameRef.current);
      // Restore damping if we disabled it (Cleanup)
      const controls = activeControlsPropRef.current.current;
      if (controls && isControllingRef.current) {
          controls.enableDamping = wasDampingEnabledRef.current;
          isControllingRef.current = false;
      }
    }

    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [enabled]);

  const toggleCamera = async () => {
    if (enabled) {
      stopCamera();
      return;
    }

    if (!landmarkerRef.current) {
      if (error) window.location.reload(); 
      return;
    }

    try {
      setLoading(true);
      setStatus("Requesting Camera...");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
          facingMode: "user"
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadeddata = () => {
            if (videoRef.current) {
                videoRef.current.play().then(() => {
                    setEnabled(true);
                    onEnableChange(true);
                    setLoading(false);
                    setStatus("Searching...");
                }).catch(e => {
                    console.error("Play error", e);
                    setError("Video play failed");
                    setLoading(false);
                });
            }
        };
      }
    } catch (err) {
      console.error("Camera Error:", err);
      setStatus("Camera Denied");
      setError("Camera permission denied");
      setLoading(false);
    }
  };

  const stopCamera = () => {
    setEnabled(false);
    onEnableChange(false);
    setStatus("Ready");
    
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    // Clear canvas
    if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const predictWebcam = () => {
    if (!videoRef.current || !canvasRef.current || !landmarkerRef.current) return;

    // A. Sync Canvas Size
    const videoWidth = videoRef.current.videoWidth;
    const videoHeight = videoRef.current.videoHeight;
    
    if (videoWidth === 0 || videoHeight === 0) return;

    if (canvasRef.current.width !== videoWidth || canvasRef.current.height !== videoHeight) {
       canvasRef.current.width = videoWidth;
       canvasRef.current.height = videoHeight;
    }

    // B. Detect
    const startTimeMs = performance.now();
    let result;
    try {
        result = landmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);
    } catch (e) {
        console.warn("Detection error", e);
        return;
    }
    
    // C. Visualize & Act
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    
    ctx.clearRect(0, 0, videoWidth, videoHeight);
    
    if (result.landmarks && result.landmarks.length > 0) {
      const landmarks = result.landmarks[0];
      
      // Draw Landmarks
      ctx.fillStyle = "#06b6d4";
      landmarks.forEach(lm => {
        ctx.beginPath();
        ctx.arc(lm.x * videoWidth, lm.y * videoHeight, 4, 0, 2 * Math.PI);
        ctx.fill();
      });

      // --- LOGIC ---
      const indexTip = landmarks[8];
      const thumbTip = landmarks[4];
      const wrist = landmarks[0];
      const middleKnuckle = landmarks[9];

      // Hand Size & Pinch
      const handSize = Math.sqrt(
        Math.pow(wrist.x - middleKnuckle.x, 2) + 
        Math.pow(wrist.y - middleKnuckle.y, 2)
      );

      const pinchDist = Math.sqrt(
        Math.pow(indexTip.x - thumbTip.x, 2) + 
        Math.pow(indexTip.y - thumbTip.y, 2)
      );

      const isPinching = pinchDist < (handSize * 0.35);

      // Access the *current* controls ref (Normal vs Fullscreen)
      const controls = activeControlsPropRef.current.current;
      
      if (controls) {
        // --- DISABLE DAMPING FOR DIRECT CONTROL ---
        if (!isControllingRef.current) {
            wasDampingEnabledRef.current = controls.enableDamping;
            controls.enableDamping = false;
            isControllingRef.current = true;
        }

        const camera = controls.object;
        const target = controls.target;
        
        // Use Spherical coordinates
        const offset = new THREE.Vector3().copy(camera.position).sub(target);
        const spherical = new THREE.Spherical().setFromVector3(offset);
        
        if (isPinching) {
            setStatus("ZOOMING");
            
            // Visual Feedback
            ctx.strokeStyle = "#f43f5e";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(indexTip.x * videoWidth, indexTip.y * videoHeight);
            ctx.lineTo(thumbTip.x * videoWidth, thumbTip.y * videoHeight);
            ctx.stroke();

            const normalizedPinch = pinchDist / handSize;

            if (lastPinchDistRef.current !== null) {
                const delta = lastPinchDistRef.current - normalizedPinch;
                const speed = 4.0; 
                if (Math.abs(delta) > 0.005) {
                    if (delta > 0) {
                        spherical.radius *= (1 + delta * speed); // Zoom Out
                    } else {
                        spherical.radius /= (1 + Math.abs(delta) * speed); // Zoom In
                    }
                    spherical.radius = Math.max(controls.minDistance, Math.min(controls.maxDistance, spherical.radius));
                }
            }
            lastPinchDistRef.current = normalizedPinch;
            lastCentroidRef.current = null;

        } else {
            setStatus("ROTATING");
            
            const cx = (wrist.x + middleKnuckle.x) / 2;
            const cy = (wrist.y + middleKnuckle.y) / 2;
            
            if (lastCentroidRef.current !== null && lastPinchDistRef.current === null) {
                const dx = cx - lastCentroidRef.current.x;
                const dy = cy - lastCentroidRef.current.y;
                
                const rotSpeed = 5.0;
                
                if (Math.abs(dx) > 0.001) {
                     spherical.theta -= dx * rotSpeed; 
                }
                
                if (Math.abs(dy) > 0.001) {
                     spherical.phi -= dy * rotSpeed;
                     spherical.phi = Math.max(0.01, Math.min(Math.PI - 0.01, spherical.phi));
                }
            }
            lastCentroidRef.current = { x: cx, y: cy };
            lastPinchDistRef.current = null;
        }

        // Apply & Sync
        spherical.makeSafe();
        offset.setFromSpherical(spherical);
        camera.position.copy(target).add(offset);
        camera.lookAt(target);
        controls.update(); 

      } else {
          // Controls ref is null (visualizer might be loading or unmounted)
          setStatus("Searching (No 3D)...");
      }

    } else {
      // No Hand Detected
      setStatus("Searching...");
      lastPinchDistRef.current = null;
      lastCentroidRef.current = null;

      // Restore Damping
      const controls = activeControlsPropRef.current.current;
      if (controls && isControllingRef.current) {
          controls.enableDamping = wasDampingEnabledRef.current;
          isControllingRef.current = false;
      }
    }
  };

  return (
    <div className="absolute bottom-6 right-6 z-[60] flex flex-col items-end pointer-events-auto">
      
      {/* Control Button */}
      <div className="flex items-center gap-2">
         {error && (
            <span className="text-[10px] font-mono bg-red-900/80 text-white px-2 py-1 rounded backdrop-blur">
                {error}
            </span>
         )}
         <button 
            onClick={toggleCamera}
            disabled={loading && !error}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium shadow-lg transition-all ${
               enabled 
               ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20' 
               : 'bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30'
            }`}
          >
            {loading ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : enabled ? (
              <XCircle size={18} />
            ) : (
              <Camera size={18} />
            )}
            <span>{enabled ? 'Stop Control' : 'Enable Hand Control'}</span>
          </button>
      </div>

      {/* Video Preview */}
      <div className={`mt-3 relative rounded-xl overflow-hidden border border-slate-700 shadow-2xl transition-all duration-300 origin-bottom-right bg-black ${
          enabled ? 'w-48 opacity-100 scale-100' : 'w-0 h-0 opacity-0 scale-50'
      }`} style={{ aspectRatio: '4/3' }}>
        
        <video 
           ref={videoRef} 
           className="absolute inset-0 w-full h-full object-cover transform -scale-x-100" 
           autoPlay 
           playsInline
           muted
        />
        <canvas 
           ref={canvasRef}
           className="absolute inset-0 w-full h-full object-cover transform -scale-x-100" 
        />
         {/* Status Overlay */}
         <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm px-2 py-1 text-[10px] text-center text-cyan-400 font-mono tracking-widest uppercase">
           {status}
        </div>
      </div>
      
      {enabled && (
        <div className="mt-2 text-xs text-slate-400 bg-slate-900/90 px-3 py-2 rounded-lg backdrop-blur border border-slate-800">
          <p className="mb-1">🖐️ <strong>Open Hand</strong> to Rotate</p>
          <p>🤏 <strong>Pinch</strong> to Zoom</p>
        </div>
      )}
    </div>
  );
};

export default HandGestureController;

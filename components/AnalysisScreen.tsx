
import React, { useEffect, useState } from 'react';
import { Scan, Target, AlertTriangle, Search, Activity, CornerUpLeft } from 'lucide-react';

const AnalysisScreen: React.FC = () => {
    const [scanPosition, setScanPosition] = useState(0);
    const [detections, setDetections] = useState<{ id: number, x: number, y: number, label: string }[]>([]);
    const [phase, setPhase] = useState(0); // 0: Scanning, 1: Detecting, 2: Identifying

    // Animation Loop
    useEffect(() => {
        // 1. Scanning Phase
        const scanInterval = setInterval(() => {
            setScanPosition((prev) => (prev + 1) % 100);
        }, 20);

        // 2. Detection Phase (Spawn random circles)
        const timeout1 = setTimeout(() => {
            setPhase(1);
            // Add random "searching" circles
            const interval = setInterval(() => {
                if (Math.random() > 0.7) {
                    const newDetection = {
                        id: Date.now(),
                        x: 20 + Math.random() * 60, // Keep in center area (lungs)
                        y: 20 + Math.random() * 60,
                        label: ''
                    };
                    setDetections(prev => [...prev.slice(-3), newDetection]); // Keep last 3
                }
            }, 400);
            return () => clearInterval(interval);
        }, 2000);

        // 3. Identification Phase (Highlight the specific Arrow feature)
        // The arrow in the "Left Lung" (Right side of image) is around x=65%, y=30%
        const timeout2 = setTimeout(() => {
            setPhase(2);
            setDetections([
                { id: 999, x: 35, y: 55, label: 'Bullous Emphysema' }, // Moved Y from 45 to 55
                // Approx location based on image provided
            ]);
        }, 5500);

        return () => {
            clearInterval(scanInterval);
            clearTimeout(timeout1);
            clearTimeout(timeout2);
        };
    }, []);

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-950 relative overflow-hidden">

            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(17,24,39,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(17,24,39,0.5)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]pointer-events-none"></div>

            <div className="relative w-full max-w-4xl aspect-[4/3] bg-black border border-slate-800 rounded-xl overflow-hidden shadow-2xl">

                {/* The CT Image */}
                <img
                    src="/copd-scan.png"
                    alt="Analyzing CT"
                    className="w-full h-full object-contain opacity-80"
                />

                {/* Scanning Line */}
                <div
                    className="absolute left-0 w-full h-1 bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.8)] z-10 transition-all duration-75"
                    style={{ top: `${scanPosition}%` }}
                >
                    <div className="absolute right-2 -top-6 text-xs font-mono text-cyan-400 bg-black/50 px-1">
                        SCANNING LAYER {Math.floor(scanPosition * 1.5)}
                    </div>
                </div>

                {/* Gradient Overlay for Scan */}
                <div
                    className="absolute left-0 w-full h-20 bg-gradient-to-b from-cyan-500/0 via-cyan-500/10 to-cyan-500/0 pointer-events-none"
                    style={{ top: `${scanPosition - 5}%` }}
                ></div>

                {/* Detection Circles (Random) */}
                {detections.map(d => (
                    <div
                        key={d.id}
                        className="absolute w-16 h-16 border-2 border-dashed border-cyan-400 rounded-full flex items-center justify-center animate-ping-slow"
                        style={{ left: `${d.x}%`, top: `${d.y}%`, transform: 'translate(-50%, -50%)' }}
                    >
                        <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                        {d.label && (
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-cyan-500/50 px-3 py-1 rounded text-cyan-300 text-xs whitespace-nowrap z-20 shadow-lg flex items-center gap-2">
                                <AlertTriangle size={12} className="text-orange-400" />
                                {d.label}
                            </div>
                        )}
                        {d.label && (
                            // Draw an arrow pointing to the actual feature from the label
                            <div className="absolute top-0 left-1/2 w-[1px] h-[50px] bg-cyan-500 origin-bottom rotate-45 opacity-50"></div>
                        )}
                    </div>
                ))}

                {/* Specific "Arrow" Highlight Animation (Phase 2) */}
                {phase >= 2 && (
                    <>
                        <div className="absolute top-[50%] left-[33%] w-24 h-24 border-2 border-orange-500 rounded-full animate-pulse shadow-[0_0_30px_rgba(249,115,22,0.4)] flex items-center justify-center">
                            <div className="absolute -right-4 -bottom-4">
                                <CornerUpLeft className="text-orange-400 rotate-90" size={32} />
                            </div>
                        </div>
                        <div className="absolute top-[30%] left-[65%] w-20 h-20 border-2 border-orange-500 rounded-full animate-pulse delay-500 shadow-[0_0_30px_rgba(249,115,22,0.4)]"></div>
                    </>
                )}

                {/* UI Overlays */}
                <div className="absolute top-4 left-4 flex gap-4">
                    <div className="bg-slate-900/80 backdrop-blur border border-slate-700 px-4 py-2 rounded-lg flex items-center gap-3">
                        <Activity className="text-cyan-400 animate-pulse" size={20} />
                        <div>
                            <div className="text-xs text-slate-400 uppercase tracking-wider">Status</div>
                            <div className="text-sm font-bold text-white">
                                {phase === 0 ? " volumetric scanning..." : phase === 1 ? "pattern recognition..." : "identifying anomalies..."}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-4 right-4">
                    <div className="font-mono text-cyan-400 text-xl tracking-widest animate-pulse">
                        PROCESSING... {(phase * 33 + (scanPosition / 3)).toFixed(0)}%
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AnalysisScreen;


import React, { useState, useRef } from 'react';
import { MOCK_PATIENT } from './constants';
import { VisualizationLayers, ViewMode } from './types';
import LungVisualizer from './components/LungVisualizer';
import HandGestureController from './components/HandGestureController';
import LandingPage from './components/LandingPage';
import { analyzeLungProgression } from './services/geminiService';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  Upload, FileText, Activity, Maximize, Minimize,
  Layers, Wind, Boxes, ScanFace, HeartPulse, CheckCircle, AlertTriangle
} from 'lucide-react';

const App: React.FC = () => {
  // Workflow State
  const [showLanding, setShowLanding] = useState(true);
  const [appState, setAppState] = useState<'upload' | 'analyzing' | 'results'>('upload');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');

  // 3D Controls Refs (One for each visualizer instance to avoid conflicts)
  const normalControlsRef = useRef<OrbitControls | null>(null);
  const fullScreenControlsRef = useRef<OrbitControls | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Visual Layer State
  const [layers, setLayers] = useState<VisualizationLayers>({
    leftLung: true, rightLung: true, lobes: false, bronchi: true,
    bronchioles: false, alveoli: true, vasculature: true, pleura: true,
    airflow: true, fibrosisMap: false, motion: true
  });

  const toggleLayer = (key: keyof VisualizationLayers) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleUpload = () => {
    setAppState('analyzing');

    // Simulate AI Processing Delay (No API Call)
    setTimeout(() => {
      const hardcodedAnalysis = `* **Restrictive Physiology and Volume Loss:** Total lung volume decreased by 13.1% (550 mL) over the 24-month period, with a concurrent decline in the expansion ratio from 0.85 to 0.58, indicating significant loss of parenchymal compliance and progressive lobar volume contraction.

* **Interstitial Stiffness Progression:** The stiffness index increased more than threefold (2.1 to 6.8), suggesting accelerated fibrotic progression and increased mechanical impedance of the pulmonary interstitium.

* **Small Airway and Architectural Distortion:** Air trapping escalated from 5% to 18%, reflecting significant distal airway`;

      setAiAnalysis(hardcodedAnalysis);
      setAppState('results');
    }, 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload();
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  // Reusable Layer Toggle Component
  const LayerToggles = () => (
    <div className="space-y-1">
      {[
        { label: 'Left Lung', key: 'leftLung', icon: <Boxes size={14} />, color: 'bg-rose-200' },
        { label: 'Right Lung', key: 'rightLung', icon: <Boxes size={14} />, color: 'bg-rose-200' },
        { label: 'Airways', key: 'bronchi', icon: <Wind size={14} />, color: 'bg-slate-100' },
        { label: 'Alveoli', key: 'alveoli', icon: <ScanFace size={14} />, color: 'bg-rose-300' },
        { label: 'Vessels', key: 'vasculature', icon: <HeartPulse size={14} />, color: 'bg-red-500' },
        { label: 'Pleura', key: 'pleura', icon: <Activity size={14} />, color: 'bg-slate-500' },
        { label: 'Fibrosis', key: 'fibrosisMap', icon: <AlertTriangle size={14} />, color: 'bg-amber-500' },
        { label: 'Airflow', key: 'airflow', icon: <Wind size={14} />, color: 'bg-cyan-200' },
      ].map((item) => (
        <div key={item.key} className="flex items-center justify-between py-2 px-3 hover:bg-white/5 rounded-lg transition-colors group cursor-pointer" onClick={() => toggleLayer(item.key as keyof VisualizationLayers)}>
          <div className="flex items-center gap-3 text-slate-300 group-hover:text-white">
            <div className={`w-2 h-2 rounded-full ${item.color} shadow-[0_0_8px_currentColor] opacity-70`}></div>
            <span className="text-sm font-medium">{item.label}</span>
          </div>
          <div className={`w-4 h-4 rounded border flex items-center justify-center ${layers[item.key as keyof VisualizationLayers] ? 'bg-cyan-500 border-cyan-500' : 'border-slate-600'}`}>
            {layers[item.key as keyof VisualizationLayers] && <CheckCircle size={10} className="text-black" />}
          </div>
        </div>
      ))}
    </div>
  );

  // --- LANDING PAGE ---
  if (showLanding) {
    return <LandingPage onBegin={() => setShowLanding(false)} />;
  }

  // --- SCREEN 1: UPLOAD ---
  if (appState === 'upload') {
    return (
      <div className="flex h-screen bg-slate-950 items-center justify-center p-6">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*,.dcm"
          onChange={handleFileChange}
        />
        <div
          onClick={triggerFileUpload}
          className="w-full max-w-2xl aspect-[16/9] border-2 border-dashed border-slate-700 rounded-3xl bg-slate-900/50 hover:bg-slate-900 hover:border-cyan-500/50 transition-all cursor-pointer flex flex-col items-center justify-center group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mb-6 shadow-xl group-hover:scale-110 transition-transform">
            <Upload className="text-cyan-400" size={40} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Upload CT Scan</h2>
          <p className="text-slate-400">Click to select a CT image or drag & drop DICOM files</p>
        </div>
      </div>
    );
  }

  // --- SCREEN 2: ANALYZING ---
  if (appState === 'analyzing') {
    return (
      <div className="flex h-screen bg-slate-950 items-center justify-center flex-col">
        <div className="relative w-24 h-24 mb-8">
          <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-t-cyan-500 rounded-full animate-spin"></div>
          <Activity className="absolute inset-0 m-auto text-cyan-500 animate-pulse" size={32} />
        </div>
        <h2 className="text-xl font-bold text-white mb-2 tracking-wide">Analyzing Tissue Structure</h2>
        <p className="text-slate-500 text-sm font-mono">Segmenting Lobes • Mapping Fibrosis • Calculating Volume</p>
      </div>
    );
  }

  // --- SCREEN 3: RESULTS (Main) ---
  return (
    <div className={`flex h-screen bg-slate-950 overflow-hidden relative transition-all duration-500 ${isFullscreen ? 'p-0' : 'p-6 lg:p-10'}`}>

      {/* BACKGROUND ELEMENTS */}
      {!isFullscreen && (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
          <div className="absolute -top-1/2 -left-1/4 w-[800px] h-[800px] bg-blue-900/10 rounded-full blur-[120px]"></div>
          <div className="absolute top-1/2 -right-1/4 w-[600px] h-[600px] bg-cyan-900/10 rounded-full blur-[100px]"></div>
        </div>
      )}

      {/* --- NORMAL VIEW LAYOUT --- */}
      <div className={`w-full h-full max-w-7xl mx-auto flex gap-8 transition-opacity duration-500 ${isFullscreen ? 'opacity-0 pointer-events-none absolute inset-0' : 'opacity-100'}`}>

        {/* LEFT COLUMN: AI EXPLANATION */}
        <div className="flex-1 flex flex-col justify-center animate-in slide-in-from-left-10 duration-700">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-4">
              <Activity size={12} /> AI Analysis Complete
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">Structural Assessment</h1>
            <p className="text-slate-400">Patient ID: {MOCK_PATIENT.id}</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500"></div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-slate-800 rounded-lg text-cyan-400">
                <FileText size={20} />
              </div>
              <h3 className="text-lg font-semibold text-slate-200">Gemini Findings</h3>
            </div>
            <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {/* Just showing the raw text elegantly */}
              {aiAnalysis.split('\n').map((line, i) => (
                <p key={i} className="mb-2">{line}</p>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CONFIDENCE + 3D PREVIEW */}
        <div className="flex-1 flex flex-col gap-6 animate-in slide-in-from-right-10 duration-700 delay-100">

          {/* CONFIDENCE CARD */}
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-lg">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Diagnosis Confidence</p>
              <h3 className="text-xl font-bold text-white">IPF Pattern Match</h3>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-cyan-400">94%</div>
              <p className="text-emerald-500 text-xs font-medium">High Confidence</p>
            </div>
          </div>

          {/* 3D LUNG PREVIEW (The "Click to Expand" area) */}
          <div className="flex-1 relative group">
            {/* Render Container */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-black rounded-3xl border border-slate-800 overflow-hidden shadow-2xl transition-all duration-300 group-hover:border-cyan-500/30">
              <LungVisualizer
                metrics={MOCK_PATIENT.timeline[2].metrics}
                layers={layers}
                showOverlay={false} // Hide complex overlay in small view
                externalControlsRef={normalControlsRef} // Pass Unique Ref
              />

              {/* EXPAND BUTTON OVERLAY */}
              <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/90 to-transparent flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button
                  onClick={() => setIsFullscreen(true)}
                  className="bg-white text-black px-6 py-2 rounded-full font-bold text-sm flex items-center gap-2 hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                >
                  <Maximize size={16} /> Expand 3D View
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* --- FULLSCREEN OVERLAY --- */}
      <div className={`fixed inset-0 z-50 bg-black transition-all duration-500 ${isFullscreen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full pointer-events-none'}`}>

        {/* CLOSE BUTTON */}
        <button
          onClick={() => setIsFullscreen(false)}
          className="absolute top-6 left-6 z-50 bg-slate-900/50 hover:bg-slate-800 text-white p-3 rounded-full backdrop-blur-md border border-slate-700 transition-all hover:rotate-90"
        >
          <Minimize size={24} />
        </button>

        {/* MAIN VISUALIZER */}
        <div className="w-full h-full cursor-move">
          <LungVisualizer
            metrics={MOCK_PATIENT.timeline[2].metrics}
            layers={layers}
            showOverlay={true}
            externalControlsRef={fullScreenControlsRef} // Pass Unique Ref
          />
        </div>

        {/* RIGHT SIDE TOGGLES (As requested) */}
        <div className="absolute top-6 right-6 w-64 bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-2xl p-5 shadow-2xl animate-in slide-in-from-right-20 duration-700 delay-300">
          <div className="flex items-center gap-2 mb-4 text-slate-400 pb-2 border-b border-slate-700/50">
            <Layers size={18} />
            <span className="text-xs font-bold uppercase tracking-widest">Active Layers</span>
          </div>
          <LayerToggles />
        </div>

      </div>

      {/* HAND GESTURE CONTROLLER */}
      {/* Target the currently active visualizer's controls */}
      <HandGestureController
        onEnableChange={() => { }}
        targetControlsRef={isFullscreen ? fullScreenControlsRef : normalControlsRef}
      />

    </div>
  );
};

export default App;

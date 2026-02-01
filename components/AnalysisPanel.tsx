import React, { useEffect, useState, useRef } from 'react';
import { ViewMode, TimePoint } from '../types';
import { analyzeLungProgression } from '../services/geminiService';
import { Sparkles, FileText, User, Microscope } from 'lucide-react';

interface AnalysisPanelProps {
  currentPoint: TimePoint;
  baselinePoint: TimePoint;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ 
  currentPoint, 
  baselinePoint, 
  viewMode, 
  onViewModeChange 
}) => {
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const prevPointIdRef = useRef<string | null>(null);
  const prevModeRef = useRef<ViewMode | null>(null);

  useEffect(() => {
    // Only fetch if point or mode changed to avoid loop
    if (prevPointIdRef.current === currentPoint.id && prevModeRef.current === viewMode) {
        return;
    }

    const fetchAnalysis = async () => {
      setLoading(true);
      try {
        const result = await analyzeLungProgression(currentPoint.metrics, baselinePoint.metrics, viewMode);
        setAnalysis(result);
      } catch (err) {
        console.error(err);
        setAnalysis("Unable to load analysis.");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
    prevPointIdRef.current = currentPoint.id;
    prevModeRef.current = viewMode;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPoint.id, viewMode]); 

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800">
      
      {/* Header / Toggles */}
      <div className="p-4 border-b border-slate-800 flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Sparkles className="text-medical-primary" size={20} />
          <span>LungScape AI Insight</span>
        </h2>
        
        <div className="flex bg-slate-800 p-1 rounded-lg">
          <button
            onClick={() => onViewModeChange(ViewMode.DOCTOR)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === ViewMode.DOCTOR 
                ? 'bg-slate-700 text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Microscope size={16} />
            Clinical
          </button>
          <button
            onClick={() => onViewModeChange(ViewMode.PATIENT)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === ViewMode.PATIENT 
                ? 'bg-medical-primary/20 text-medical-primary shadow-sm' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User size={16} />
            Patient
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 space-y-4">
            <div className="w-8 h-8 border-4 border-medical-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 text-sm animate-pulse">Analyzing tissue deformation...</p>
          </div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none">
             {viewMode === ViewMode.DOCTOR ? (
                <div className="bg-slate-800/30 p-4 rounded-lg border border-slate-700 mb-4">
                   <h4 className="text-medical-secondary font-semibold mb-2 flex items-center gap-2">
                     <FileText size={16}/> Clinical Abstract
                   </h4>
                   <div className="whitespace-pre-line text-slate-300 font-mono text-sm leading-relaxed">
                     {analysis}
                   </div>
                </div>
             ) : (
                <div className="bg-blue-900/10 p-4 rounded-lg border border-blue-900/30 mb-4">
                  <h4 className="text-blue-400 font-semibold mb-2">Patient Summary</h4>
                   <div className="whitespace-pre-line text-slate-300 leading-relaxed">
                     {analysis}
                   </div>
                </div>
             )}

             <div className="mt-6 pt-6 border-t border-slate-800">
               <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">Key Observations</h3>
               <ul className="space-y-3">
                 <li className="flex gap-3 text-sm text-slate-300">
                   <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 flex-shrink-0" />
                   Stiffness in lower lobes has increased by <strong>{((currentPoint.metrics.stiffnessIndex - baselinePoint.metrics.stiffnessIndex)/baselinePoint.metrics.stiffnessIndex * 100).toFixed(0)}%</strong> since baseline.
                 </li>
                 <li className="flex gap-3 text-sm text-slate-300">
                   <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                   Right Lower Lobe (RLL) volume reduction suggests progressive scarring.
                 </li>
               </ul>
             </div>
          </div>
        )}
      </div>

      {/* Footer / Disclaimer */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className="flex items-start gap-2 text-xs text-slate-500">
           <div className="min-w-[16px] pt-0.5">⚠️</div>
           <p>
             LungScape is a decision support tool. It does not provide a diagnosis. All AI-generated insights must be verified by a qualified pulmonologist.
           </p>
        </div>
      </div>
    </div>
  );
};

export default AnalysisPanel;


import React, { useState, useEffect } from 'react';
import { BookOpen, ChevronRight, Wind, Layers, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { VisualizationLayers } from '../types';

interface LearningGuideProps {
    onLayerUpdate: (layers: VisualizationLayers) => void;
    onExit: () => void;
}

interface LearningStep {
    id: string;
    title: string;
    description: string;
    prompt: string;
    actionLabel: string;
    requiredLayers: Partial<VisualizationLayers>;
}

const STEPS: LearningStep[] = [
    {
        id: 'intro',
        title: 'Anatomy Overview',
        description: 'Welcome to the Learning Mode. We are looking at a 3D reconstruction of the patient\'s lungs. Currently, you can see the outer pleural surface and the division of lobes.',
        prompt: 'The patient has significant volume loss. Would you like to inspect the internal airway structure?',
        actionLabel: 'Reveal Airways',
        requiredLayers: { leftLung: true, rightLung: true, lobes: true, pleura: true, bronchi: false, airflow: false, fibrosisMap: false, pathology: false }
    },
    {
        id: 'airways',
        title: 'Bronchial Tree',
        description: 'You are now viewing the bronchial tree. These tubes carry air from the trachea deep into the lungs. Notice the narrowing in the distal branches.',
        prompt: 'Airflow seems restricted. Shall we visualize how air actually moves through these tubes?',
        actionLabel: 'Visualize Airflow',
        requiredLayers: { leftLung: false, rightLung: false, lobes: false, bronchi: true, bronchioles: true, airflow: false }
    },
    {
        id: 'airflow',
        title: 'Airflow & Trapping',
        description: 'The cyan particles represent oxygen flow. In this patient, we detect "Air Trapping" of 18%. This means air gets in but struggles to leave due to collapsed small airways.',
        prompt: 'This obstruction often leads to tissue damage. Would you like to see the detected emphysematous bullae?',
        actionLabel: 'Show Pathology',
        requiredLayers: { airflow: true, bronchi: true, bronchioles: false }
    },
    {
        id: 'pathology',
        title: 'Detected Pathology',
        description: 'Highlighted in orange is a large Emphysematous Bulla in the upper left lobe. This is a pocket of damaged tissue that no longer exchanges gases effectively.',
        prompt: 'This correlates with the "Stiffness Index" increase. Learn how this affects overall lung function?',
        actionLabel: 'Finish Summary',
        requiredLayers: { airflow: false, bronchi: false, leftLung: true, rightLung: true, fibrosisMap: true, pathology: true }
    }
];

const LearningGuide: React.FC<LearningGuideProps> = ({ onLayerUpdate, onExit }) => {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const step = STEPS[currentStepIndex];

    // Auto-apply layers for the current step
    useEffect(() => {
        onLayerUpdate(prev => ({ ...prev, ...step.requiredLayers }));
    }, [currentStepIndex]);

    const handleNext = () => {
        if (currentStepIndex < STEPS.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            onExit();
        }
    };

    return (
        <div className="absolute bottom-6 left-6 w-80 z-40">
            <div className="bg-slate-900/95 backdrop-blur-xl border border-cyan-500/30 rounded-xl p-4 shadow-2xl relative overflow-hidden animate-in slide-in-from-left-10 fade-in duration-500">

                {/* Progress Bar */}
                <div className="absolute top-0 left-0 w-full h-1 bg-slate-800">
                    <div
                        className="h-full bg-cyan-500 transition-all duration-500"
                        style={{ width: `${((currentStepIndex + 1) / STEPS.length) * 100}%` }}
                    />
                </div>

                <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                                <BookOpen size={16} />
                            </div>
                            <h3 className="text-sm font-bold text-white tracking-tight">
                                {step.title}
                            </h3>
                        </div>
                        <button
                            onClick={onExit}
                            className="text-slate-500 hover:text-white transition-colors p-1"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    <p className="text-slate-300 leading-snug text-xs">
                        {step.description}
                    </p>

                    <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700/50 hover:bg-cyan-900/10 hover:border-cyan-500/30 transition-all group cursor-pointer" onClick={handleNext}>
                        <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest mb-1">Next Instruction</div>
                        <div className="text-slate-200 text-xs font-medium mb-3 group-hover:text-white line-clamp-2">
                            {step.prompt}
                        </div>
                        <button
                            className="w-full bg-cyan-500 hover:bg-cyan-400 text-black py-2 rounded-md font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                        >
                            {step.actionLabel} <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LearningGuide;

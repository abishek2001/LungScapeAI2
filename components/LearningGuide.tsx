
import React, { useState, useEffect } from 'react';
import { BookOpen, ChevronRight, Wind, Layers, AlertCircle, CheckCircle2 } from 'lucide-react';
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
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl z-40">
            <div className="bg-slate-900/90 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-500">

                {/* Progress Bar */}
                <div className="absolute top-0 left-0 w-full h-1 bg-slate-800">
                    <div
                        className="h-full bg-cyan-500 transition-all duration-500"
                        style={{ width: `${((currentStepIndex + 1) / STEPS.length) * 100}%` }}
                    />
                </div>

                <div className="flex items-start gap-6">
                    {/* Icon/Avatar Area */}
                    <div className="hidden sm:flex flex-col items-center gap-2 mt-1">
                        <div className="w-12 h-12 rounded-full bg-cyan-500/20 border border-cyan-500 flex items-center justify-center text-cyan-400">
                            <BookOpen size={24} />
                        </div>
                        <div className="w-[1px] h-full bg-slate-700 my-2"></div>
                    </div>

                    <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                {step.title}
                                <span className="text-xs font-normal text-slate-500 border border-slate-700 px-2 py-0.5 rounded-full">
                                    Step {currentStepIndex + 1}/{STEPS.length}
                                </span>
                            </h3>
                            <button
                                onClick={onExit}
                                className="text-slate-400 hover:text-white text-sm"
                            >
                                Exit Guide
                            </button>
                        </div>

                        <p className="text-slate-300 leading-relaxed mb-6 text-lg">
                            {step.description}
                        </p>

                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 flex items-center justify-between gap-4 group cursor-pointer hover:bg-cyan-900/10 hover:border-cyan-500/30 transition-all" onClick={handleNext}>
                            <div className="flex-1">
                                <div className="text-xs text-cyan-400 font-bold uppercase tracking-wider mb-1">Suggested Next Step</div>
                                <div className="text-slate-200 font-medium group-hover:text-white">
                                    {step.prompt}
                                </div>
                            </div>
                            <button
                                className="bg-cyan-500 hover:bg-cyan-400 text-black px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-transform group-hover:scale-105 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                            >
                                {step.actionLabel} <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LearningGuide;

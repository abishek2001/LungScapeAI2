
import React from 'react';
import {
    Activity,
    Wind,
    TrendingDown,
    AlertTriangle,
    Zap,
    ArrowRight,
    BrainCircuit,
    FileCheck
} from 'lucide-react';

interface GeminiAnalysisDisplayProps {
    analysis: string;
}

const GeminiAnalysisDisplay: React.FC<GeminiAnalysisDisplayProps> = ({ analysis }) => {
    // Parse the markdown-like content finding lines starting with * **
    const parseFindings = (text: string) => {
        // Split by the bullet point marker, filtering out empty strings
        const rawItems = text.split('* **').filter(item => item.trim().length > 0);

        return rawItems.map(item => {
            // Split into title and body based on the closing bold marker
            const parts = item.split(':**');
            if (parts.length < 2) return null;

            const title = parts[0].trim();
            const body = parts[1].trim();

            // Determine icon based on keywords in title
            let icon = Activity;
            let color = "text-cyan-400";
            let bg = "bg-cyan-500/10";
            let border = "border-cyan-500/20";

            if (title.includes("Volume") || title.includes("Restrictive")) {
                icon = TrendingDown;
                color = "text-rose-400";
                bg = "bg-rose-500/10";
                border = "border-rose-500/20";
            } else if (title.includes("Stiffness")) {
                icon = Zap; // Mechanical impedance/resistance
                color = "text-amber-400";
                bg = "bg-amber-500/10";
                border = "border-amber-500/20";
            } else if (title.includes("Airway") || title.includes("Architectural")) {
                icon = Wind;
                color = "text-emerald-400";
                bg = "bg-emerald-500/10";
                border = "border-emerald-500/20";
            }

            return { title, body, icon, color, bg, border };
        }).filter(Boolean); // Filter out any nulls
    };

    const findings = parseFindings(analysis);

    // Helper to highlight numbers in text
    const highlightNumbers = (text: string) => {
        // Regex to match percentages, decimal numbers, ranges (2.1 to 6.8), and mL
        const regex = /(\d+\.?\d*%|\d+\.?\d* mL|from \d+\.?\d* to \d+\.?\d*|\d+\.?\d*)/g;

        // Split text by regex and map
        const parts = text.split(regex);
        const matches = text.match(regex);

        if (!matches) return text;

        let matchIndex = 0;
        return parts.map((part, i) => {
            if (i % 2 === 1) { // This is a match
                const match = matches[matchIndex++];
                // Simple heuristic to check if it looks like a metric
                if (match.match(/\d/)) {
                    return <span key={i} className="font-bold text-white bg-white/5 px-1 rounded mx-0.5">{match}</span>;
                }
                return match;
            }
            return part;
        });
    };

    return (
        <div className="w-full h-full flex flex-col">
            {/* Header Badge */}
            <div className="flex items-center justify-between mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 shadow-sm">
                    <BrainCircuit size={14} className="text-purple-400" />
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Gemini 1.5 Pro Analysis</span>
                </div>
                <div className="flex items-center text-xs text-slate-500 gap-1">
                    <FileCheck size={12} />
                    <span>Validated</span>
                </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                {findings.map((item, idx) => {
                    const Icon = item!.icon;
                    return (
                        <div
                            key={idx}
                            className={`group relative p-4 rounded-xl border ${item!.border} ${item!.bg} backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:bg-slate-800/80 hover:border-slate-600 hover:shadow-lg`}
                        >
                            {/* Hover Glow Effect */}
                            <div className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-r from-transparent via-white to-transparent`} />

                            <div className="flex items-start gap-4 relaltive z-10">
                                {/* Icon Box */}
                                <div className={`mt-1 p-2 rounded-lg bg-slate-900/50 border border-white/5 shadow-inner ${item!.color}`}>
                                    <Icon size={20} />
                                </div>

                                {/* Text Content */}
                                <div className="flex-1">
                                    <h3 className={`text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-2 ${item!.color}`}>
                                        {item!.title}
                                        <ArrowRight size={12} className="opacity-50" />
                                    </h3>
                                    <p className="text-sm text-slate-300 leading-relaxed font-light">
                                        {highlightNumbers(item!.body)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {findings.length === 0 && (
                    // Fallback for raw text if parsing fails
                    <div className="text-slate-400 text-sm p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                        {analysis}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GeminiAnalysisDisplay;

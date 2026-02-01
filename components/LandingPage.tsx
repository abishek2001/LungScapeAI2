
import React from 'react';
import { ArrowRight, Activity } from 'lucide-react';

interface LandingPageProps {
    onBegin: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onBegin }) => {
    return (
        <div className="relative h-screen w-screen overflow-hidden bg-black font-sans">
            {/* Background Video */}
            <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute top-0 left-0 w-full h-full object-cover opacity-60"
            >
                <source src="/hero-video.mp4" type="video/mp4" />
            </video>

            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

            {/* Content Container */}
            <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 text-center">

                {/* Logo / Icon Area */}
                <div className="mb-8 p-4 bg-cyan-500/10 rounded-full border border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.15)] animate-fade-in-up">
                    <Activity size={48} className="text-cyan-400" />
                </div>

                {/* Title */}
                <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight animate-fade-in-up delay-100">
                    LungScape<span className="text-cyan-400">AI</span>
                </h1>

                {/* Description */}
                <p className="text-xl md:text-2xl text-slate-300 mb-12 max-w-2xl leading-relaxed animate-fade-in-up delay-200">
                    Advanced localized 3D visualization for precision diagnostics and analyzing pulmonary progression.
                </p>

                {/* Begin Button */}
                <button
                    onClick={onBegin}
                    className="group relative px-8 py-4 bg-white text-black rounded-full font-bold text-lg hover:scale-105 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.3)] animate-fade-in-up delay-300 flex items-center gap-3 overflow-hidden"
                >
                    <span className="relative z-10 group-hover:mr-2 transition-all">Begin</span>
                    <ArrowRight size={20} className="relative z-10 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
                    <div className="absolute inset-0 bg-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 mix-blend-screen"></div>
                </button>

            </div>

            {/* Footer / Copyright */}
            <div className="absolute bottom-6 w-full text-center text-slate-500 text-sm">
                &copy; 2026 LungScape AI Research. All rights reserved.
            </div>
        </div>
    );
};

export default LandingPage;

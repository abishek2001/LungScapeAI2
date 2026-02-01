
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, User, HelpCircle, Loader2 } from 'lucide-react';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
}

const PRESET_QUESTIONS = [
    "What condition is being shown in this scan?",
    "Is the disease spreading to both lungs?",
    "How will this affect my physical activity?",
    "What is emphysematous bulla?",
    "Why is my airflow restricted?",
    "What is my stiffness index and what does it mean?",
    "How does smoking affect this condition?",
    "What medications are typical for COPD?",
    "Can these damaged areas heal?",
    "What should I monitor daily?"
];

const KNOWLEDGE_BASE: Record<string, string> = {
    "What condition is being shown in this scan?": "Based on the 3D reconstruction and the CT slices, your scan shows clear signs of Chronic Obstructive Pulmonary Disease (COPD) with underlying Emphysema. The 'black holes' in the upper lobes indicate tissue loss.",
    "Is the disease spreading to both lungs?": "Currently, the analysis detects pathology primarily in the upper lobes of both lungs, but the 'Emphysematous Bulla' (large air pocket) is most prominent in your upper left lung.",
    "How will this affect my physical activity?": "Because your total lung volume is decreased by 13.1% and air trapping is at 18%, you may experience shortness of breath during exertion. The lungs cannot exchange oxygen as efficiently as healthy tissue.",
    "What is emphysematous bulla?": "A bulla is a permanent air-filled space within the lung that develops when the walls of the tiny air sacs (alveoli) are destroyed. It doesn't contribute to breathing and can compress healthy lung tissue around it.",
    "Why is my airflow restricted?": "Your distal airways are showing structural distortion and narrowing. This prevents air from leaving the lungs smoothly, leading to the 'Air Trapping' shown in your metrics.",
    "What is my stiffness index and what does it mean?": "Your stiffness index increased from 2.1 to 6.8. This indicates 'mechanical impedance'—your lung tissue is becoming less elastic and harder to expand, making it more work to take a deep breath.",
    "How does smoking affect this condition?": "Smoking is the primary cause of the tissue destruction seen here. It accelerates the breakdown of alveoli walls and increases inflammation in the airways, worsening air trapping.",
    "What medications are typical for COPD?": "Typical treatments include bronchodilators to open airways, corticosteroids to reduce inflammation, and sometimes supplemental oxygen. *Note: Always consult your physician for prescriptions.*",
    "Can these damaged areas heal?": "Lungs generally don't 'regrow' destroyed alveoli. However, the goal of treatment is to protect the remaining 82% of healthy air capacity and improve your quality of life through therapy.",
    "What should I monitor daily?": "You should monitor your oxygen saturation (SpO2), your level of breathlessness during resting vs. activity, and any changes in cough or sputum production."
};

const AIChatHub: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: "Hello! I'm LungScape AI. I've analyzed your 3D lung model and CT data. How can I help you understand your results today?",
            sender: 'ai',
            timestamp: new Date()
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = (text: string) => {
        if (!text.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            text,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsTyping(true);

        // Simulate AI thinking
        setTimeout(() => {
            let aiText = "I'm sorry, I don't have specific data on that yet. Try asking one of the recommended questions or consult your specialist.";

            // Basic matching
            const foundMatch = Object.keys(KNOWLEDGE_BASE).find(q =>
                text.toLowerCase().includes(q.toLowerCase()) ||
                q.toLowerCase().includes(text.toLowerCase())
            );

            if (foundMatch) {
                aiText = KNOWLEDGE_BASE[foundMatch];
            }

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: aiText,
                sender: 'ai',
                timestamp: new Date()
            };

            setMessages(prev => [...prev, aiMsg]);
            setIsTyping(false);
        }, 1500);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-slate-900/95 backdrop-blur-2xl border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-[60] animate-in slide-in-from-bottom-5">
            {/* Header */}
            <div className="p-4 bg-slate-800/50 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/40">
                        <Bot size={20} className="text-cyan-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white leading-none">LungScape AI Hub</h3>
                        <span className="text-[10px] text-emerald-400 font-medium">Online • Pulse Active</span>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${m.sender === 'user'
                                ? 'bg-cyan-600 text-white rounded-br-none shadow-lg'
                                : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
                            }`}>
                            {m.text}
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-none p-3 flex gap-1">
                            <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce delay-150"></span>
                            <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce delay-300"></span>
                        </div>
                    </div>
                )}
            </div>

            {/* Suggestion Chips */}
            <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar border-t border-slate-800/50 bg-slate-900/50">
                {PRESET_QUESTIONS.map((q, i) => (
                    <button
                        key={i}
                        onClick={() => handleSend(q)}
                        className="whitespace-nowrap bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-[10px] text-cyan-400 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
                    >
                        <HelpCircle size={10} /> {q}
                    </button>
                ))}
            </div>

            {/* Input */}
            <div className="p-4 bg-slate-800/30 border-t border-slate-700">
                <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSend(inputValue);
                    }}
                >
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Type your question..."
                        className="flex-1 bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                    />
                    <button
                        type="submit"
                        className="w-10 h-10 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl flex items-center justify-center shadow-lg transition-transform active:scale-95"
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AIChatHub;

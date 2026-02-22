
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Trophy, Sparkles, X } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface Participant {
    teamName: string;
    name: string;
    furigana: string;
    wristbandColor: string;
}

interface LotteryModalProps {
    isOpen: boolean;
    onClose: () => void;
    participants: Participant[];
}

export default function LotteryModal({ isOpen, onClose, participants }: LotteryModalProps) {
    const [winner, setWinner] = useState<Participant | null>(null);
    const [isSpinning, setIsSpinning] = useState(false);
    const [displayCandidate, setDisplayCandidate] = useState<Participant | null>(null);
    const [isSuspenseMode, setIsSuspenseMode] = useState(false);
    const [revealStep, setRevealStep] = useState(0); // 0: Hidden, 1: Team, 2: Name/Full

    useEffect(() => {
        if (isOpen) {
            setWinner(null);
            setIsSpinning(false);
            setDisplayCandidate(null);
            setRevealStep(0);
        }
    }, [isOpen]);

    const startLottery = () => {
        if (participants.length === 0) return;

        // If we are in suspense mode and have a winner, handle reveal steps
        if (winner && isSuspenseMode && revealStep < 2) {
            setRevealStep(prev => prev + 1);
            return;
        }

        // Reset for new spin
        if (winner) {
            setWinner(null);
            setRevealStep(0);
        }

        setIsSpinning(true);

        let duration = 3000; // 3 seconds spin
        let interval = 50;
        let elapsed = 0;

        const timer = setInterval(() => {
            const randomIndex = Math.floor(Math.random() * participants.length);
            setDisplayCandidate(participants[randomIndex]);
            elapsed += interval;

            // Slow down effect
            if (elapsed > duration - 1000) interval = 150;
            if (elapsed > duration - 500) interval = 300;

            if (elapsed >= duration) {
                clearInterval(timer);
                const finalIndex = Math.floor(Math.random() * participants.length);
                setWinner(participants[finalIndex]);
                setIsSpinning(false);
                // If suspense mode, start at step 0 (hidden), otherwise jump to 2 (full)
                setRevealStep(isSuspenseMode ? 0 : 2);
            }
        }, interval);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-lg relative z-10 flex flex-col overflow-hidden">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="p-8 text-center space-y-8">
                    {/* Header */}
                    <div>
                        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-2">
                            大抽選会
                        </h2>
                        <div className="flex items-center justify-center gap-2 text-slate-400">
                            <span className="text-sm">エントリー総数: {participants.length}名</span>
                            {/* Suspense Mode Toggle */}
                            {!isSpinning && !winner && (
                                <label className="flex items-center gap-2 cursor-pointer ml-4 bg-slate-800 px-3 py-1 rounded-full border border-slate-700 hover:bg-slate-700 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={isSuspenseMode}
                                        onChange={(e) => setIsSuspenseMode(e.target.checked)}
                                        className="rounded border-slate-600 bg-slate-900 text-indigo-500 focus:ring-indigo-500/50"
                                    />
                                    <span className="text-xs font-bold text-slate-300">ドキドキ演出</span>
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Display Area */}
                    <div className="min-h-[200px] flex items-center justify-center">
                        {winner ? (
                            <div className="animate-in zoom-in duration-500 space-y-4">
                                <div className="inline-block p-4 rounded-full bg-gradient-to-br from-yellow-400/20 to-orange-500/20 border border-yellow-500/50 mb-4 animate-bounce">
                                    <Trophy className="w-16 h-16 text-yellow-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-yellow-500 font-bold tracking-widest uppercase mb-1">
                                        当選
                                    </p>

                                    {/* Name Reveal */}
                                    <h3 className={`text-4xl font-black text-white mb-2 tracking-tight transition-all duration-500 ${revealStep >= 2 ? 'opacity-100 blur-0' : 'opacity-0 blur-xl'}`}>
                                        {winner.name}
                                    </h3>

                                    {/* Team Reveal */}
                                    <div className={`transition-all duration-500 ${revealStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                        <p className="text-lg text-slate-300">
                                            {winner.teamName}
                                        </p>
                                        <div className={`mt-4 flex items-center justify-center gap-2 transition-all duration-500 ${revealStep >= 2 ? 'opacity-100' : 'opacity-0'}`}>
                                            <span className="text-xs text-slate-500 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                                                {winner.furigana}
                                            </span>
                                            <span className={`text-xs px-3 py-1 rounded-full border ${winner.wristbandColor === '赤' ? 'bg-red-900/30 text-red-400 border-red-800' :
                                                winner.wristbandColor === '青' ? 'bg-blue-900/30 text-blue-400 border-blue-800' :
                                                    'bg-yellow-900/30 text-yellow-400 border-yellow-800'
                                                }`}>
                                                WB: {winner.wristbandColor}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : isSpinning && displayCandidate ? (
                            <div className="space-y-4 opacity-80">
                                <Sparkles className="w-12 h-12 text-indigo-400 mx-auto animate-pulse" />
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-200">
                                        {displayCandidate.name}
                                    </h3>
                                    <p className="text-slate-400">
                                        {displayCandidate.teamName}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-slate-500">
                                <p className="mb-4">ボタンを押して抽選を開始してください</p>
                            </div>
                        )}
                    </div>

                    {/* Action Button */}
                    <Button
                        size="lg"
                        onClick={startLottery}
                        disabled={isSpinning}
                        className={`w-full py-6 text-lg font-bold shadow-lg transition-all transform active:scale-95 ${winner
                            ? (isSuspenseMode && revealStep < 2 ? 'bg-amber-600 hover:bg-amber-500 text-white animate-pulse' : 'bg-slate-800 hover:bg-slate-700 text-white')
                            : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white hover:shadow-indigo-500/25'
                            }`}
                    >
                        {winner
                            ? (isSuspenseMode && revealStep < 2
                                ? (revealStep === 0 ? "チーム名を表示！" : "当選者を発表！")
                                : "もう一度引く")
                            : isSpinning ? "抽選中..." : "抽選スタート！"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

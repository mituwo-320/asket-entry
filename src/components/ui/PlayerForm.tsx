"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Player } from "@/lib/types";
import { CheckCircle2, ShieldCheck, ShieldAlert, UserCheck } from "lucide-react";
import { motion } from "framer-motion";

interface PlayerFormProps {
    initialData?: Player;
    onSave: (player: Player) => void | Promise<void>;
    onCancel: () => void;
}

export function PlayerForm({ initialData, onSave, onCancel }: PlayerFormProps) {
    const [formData, setFormData] = useState<Partial<Player>>({
        name: "",
        furigana: "",
        insurance: true,
    });

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        }
    }, [initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            id: initialData?.id || Math.random().toString(36).substr(2, 9),
            name: formData.name || "",
            furigana: formData.furigana || "",
            insurance: formData.insurance || false,
            wristbandColor: formData.wristbandColor || "赤",
            isRepresentative: initialData?.isRepresentative,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <Input
                    label="氏名"
                    placeholder="例: 佐藤 太郎"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                />
                <Input
                    label="フリガナ"
                    placeholder="例: サトウ タロウ"
                    value={formData.furigana}
                    onChange={(e) => setFormData({ ...formData, furigana: e.target.value })}
                    required
                />
            </div>

            <div className="space-y-3">
                <label className="text-sm font-medium text-slate-300">リストバンドの色</label>
                <div className="grid grid-cols-1 gap-2">
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { color: "赤", label: "赤 (経験5年以上)", desc: "上級者" },
                            { color: "青", label: "青 (2〜5年)", desc: "中級者" },
                            { color: "黄", label: "黄 (2年未満)", desc: "初心者" }
                        ].map((opt) => (
                            <div
                                key={opt.color}
                                onClick={() => setFormData({ ...formData, wristbandColor: opt.color })}
                                className={`cursor-pointer rounded-lg border p-2 text-center transition-all ${formData.wristbandColor === opt.color
                                    ? `border-${opt.color === '赤' ? 'red' : opt.color === '青' ? 'blue' : 'yellow'}-500 bg-${opt.color === '赤' ? 'red' : opt.color === '青' ? 'blue' : 'yellow'}-500/10`
                                    : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
                                    }`}
                            >
                                <div className={`font-bold ${formData.wristbandColor === opt.color
                                    ? `text-${opt.color === '赤' ? 'red' : opt.color === '青' ? 'blue' : 'yellow'}-400`
                                    : "text-slate-300"
                                    }`}>{opt.color}</div>
                            </div>
                        ))}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 pl-2 border-l-2 border-slate-800 space-y-1">
                        <div><span className="text-red-400 font-bold">赤</span>: 学生時代バスケ経験 5年以上</div>
                        <div><span className="text-blue-400 font-bold">青</span>: 学生時代バスケ経験 2年超 5年未満</div>
                        <div><span className="text-yellow-400 font-bold">黄</span>: 学生時代バスケ経験 2年以下 (初心者など)</div>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">スポーツ保険の加入状況</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Option 1: Join Insurance */}
                    <div
                        onClick={() => setFormData({ ...formData, insurance: true })}
                        className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${formData.insurance
                            ? "border-emerald-500 bg-emerald-500/10"
                            : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
                            }`}
                    >
                        {formData.insurance && (
                            <div className="absolute top-3 right-3 text-emerald-500">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                        )}
                        <div className="flex flex-col gap-2">
                            <div className={`p-2 w-fit rounded-lg ${formData.insurance ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-400"}`}>
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className={`font-bold ${formData.insurance ? "text-emerald-400" : "text-slate-300"}`}>大会保険に加入</h3>
                                <p className="text-xs text-slate-400 mt-1">大会が指定するスポ―ツ保険に加入します (推奨)</p>
                            </div>
                        </div>
                    </div>

                    {/* Option 2: Self Insured */}
                    <div
                        onClick={() => setFormData({ ...formData, insurance: false })}
                        className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${!formData.insurance
                            ? "border-slate-500 bg-slate-800"
                            : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
                            }`}
                    >
                        {!formData.insurance && (
                            <div className="absolute top-3 right-3 text-slate-400">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                        )}
                        <div className="flex flex-col gap-2">
                            <div className={`p-2 w-fit rounded-lg ${!formData.insurance ? "bg-slate-600 text-white" : "bg-slate-800 text-slate-400"}`}>
                                <UserCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className={`font-bold ${!formData.insurance ? "text-slate-200" : "text-slate-300"}`}>加入しない</h3>
                                <p className="text-xs text-slate-400 mt-1">各自で保険に加入済み、または加入を希望しません</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={onCancel}>
                    キャンセル
                </Button>
                <Button type="submit">
                    保存
                </Button>
            </div>
        </form>
    );
}

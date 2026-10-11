"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Player } from "@/lib/types";
import { WristbandChoices, InsuranceChoices } from "@/components/participant/ParticipantChoices";

interface PlayerFormProps {
    initialData?: Player;
    onSave: (player: Player) => void | Promise<void>;
    onCancel: () => void;
}

export function PlayerForm({ initialData, onSave, onCancel }: PlayerFormProps) {
    const [formData, setFormData] = useState<Partial<Player>>(() => ({
        name: "",
        furigana: "",
        insurance: true,
        ...initialData,
        wristbandColor: initialData?.wristbandColor || "赤",
    }));

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

            <WristbandChoices value={formData.wristbandColor || "赤"} onChange={(wristbandColor) => setFormData({ ...formData, wristbandColor })} />
            <InsuranceChoices value={!!formData.insurance} onChange={(insurance) => setFormData({ ...formData, insurance })} />

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

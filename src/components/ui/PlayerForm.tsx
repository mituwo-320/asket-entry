"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Player } from "@/lib/types";
import { WristbandChoices, InsuranceChoices } from "@/components/participant/ParticipantChoices";
import { ParticipantSectionTitle } from "@/components/participant/ParticipantFrame";
import { Loader2 } from "lucide-react";

interface PlayerFormProps {
    initialData?: Player;
    onSave: (player: Player) => void | Promise<void>;
    onCancel: () => void;
    onCancelChanges?: () => void;
    isSaving?: boolean;
    error?: string | null;
    submitLabel?: string;
    cancelLabel?: string;
}

export function PlayerForm({ initialData, onSave, onCancel, onCancelChanges, isSaving = false, error, submitLabel = "保存", cancelLabel = "キャンセル" }: PlayerFormProps) {
    const [playerId] = useState(() => initialData?.id || Math.random().toString(36).substr(2, 9));
    const [initialValues] = useState<Partial<Player>>(() => ({
        name: "",
        furigana: "",
        insurance: true,
        ...initialData,
        wristbandColor: initialData?.wristbandColor || "赤",
    }));
    const [formData, setFormData] = useState(initialValues);
    const hasChanges = (['name', 'furigana', 'insurance', 'wristbandColor'] as const).some(field => formData[field] !== initialValues[field]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving) return;
        onSave({
            id: playerId,
            name: formData.name || "",
            furigana: formData.furigana || "",
            insurance: formData.insurance || false,
            wristbandColor: formData.wristbandColor || "赤",
            isRepresentative: initialData?.isRepresentative,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="participant-player-form space-y-6" aria-busy={isSaving}>
            {error ? <p role="alert" className="participant-feedback participant-feedback-error">{error}</p> : null}
            <fieldset disabled={isSaving} className="space-y-6">
            <legend className="participant-sr-only">選手情報</legend>
            <ParticipantSectionTitle number="01" title="選手の基本情報" />
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

            <ParticipantSectionTitle number="02" title="参加する内容" description="バスケ経験に合うリストバンドと、保険の加入状況を選んでください。" />
            <WristbandChoices value={formData.wristbandColor || "赤"} onChange={(wristbandColor) => setFormData({ ...formData, wristbandColor })} />
            <InsuranceChoices value={!!formData.insurance} onChange={(insurance) => setFormData({ ...formData, insurance })} />
            </fieldset>

            <div className="participant-dialog-actions">
                <Button type="button" variant="outline" onClick={() => { if (hasChanges && onCancelChanges) onCancelChanges(); else onCancel(); }} disabled={isSaving}>
                    {cancelLabel}
                </Button>
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? <><Loader2 size={17} className="animate-spin" aria-hidden="true" />保存中…</> : submitLabel}
                </Button>
            </div>
        </form>
    );
}

"use client";

import { useState } from "react";
import { User } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Save, Loader2 } from "lucide-react";
import { ParticipantDialog } from "@/components/participant/ParticipantDialog";

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    onSave: (user: User) => void;
}

export function EditProfileModal({ isOpen, onClose, user, onSave }: EditProfileModalProps) {
    if (!isOpen) return null;
    return <ProfileEditor onClose={onClose} user={user} onSave={onSave} />;
}

function ProfileEditor({ onClose, user, onSave }: Omit<EditProfileModalProps, "isOpen">) {
    const [formData, setFormData] = useState<User>({ ...user });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/user/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update user');
            }

            const data = await res.json();
            onSave(data.user);
            onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "保存できませんでした。もう一度お試しください。");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ParticipantDialog isOpen onClose={onClose} title="プロフィール編集" description="大会運営から連絡できるよう、代表者の氏名と電話番号を確認してください。" busy={isLoading}>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="participant-dialog-account"><span>ログインメールアドレス</span><p>{user.email}</p></div>
                                {error && (
                                    <div role="alert" className="participant-feedback participant-feedback-error">
                                        {error}
                                    </div>
                                )}

                                <fieldset disabled={isLoading} className="space-y-4">
                                    <legend className="participant-sr-only">代表者の連絡先</legend>
                                    <Input
                                        id="name"
                                        name="name"
                                        label="代表者氏名"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                    />
                                    <Input
                                        id="phone"
                                        name="phone"
                                        label="電話番号"
                                        type="tel"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        required
                                    />
                                </fieldset>

                                <div className="participant-dialog-actions">
                                    <Button type="button" variant="outline" disabled={isLoading} onClick={onClose}>
                                        キャンセル
                                    </Button>
                                    <Button type="submit" variant="primary" disabled={isLoading}>
                                        {isLoading ? (
                                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 保存中...</>
                                        ) : (
                                            <><Save className="w-4 h-4 mr-2" /> 保存する</>
                                        )}
                                    </Button>
                                </div>
                            </form>
        </ParticipantDialog>
    );
}

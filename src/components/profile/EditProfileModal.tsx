"use client";

import { useState } from "react";
import { User } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Save, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    onSave: (user: User) => void;
}

export function EditProfileModal({ isOpen, onClose, user, onSave }: EditProfileModalProps) {
    const [formData, setFormData] = useState<User>({ ...user });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="プロフィール編集">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {error && (
                                    <div className="p-3 mb-4 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg">
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-4">
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
                                </div>

                                <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-white/5">
                                    <Button type="button" variant="ghost" onClick={onClose}>
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
        </Modal>
    );
}

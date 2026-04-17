"use client";

import { Button } from "@/components/ui/Button";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
}

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = "OK",
    cancelLabel = "キャンセル",
    danger = false,
}: ConfirmDialogProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Dialog */}
            <div className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-700/50 bg-slate-900 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-5 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${danger ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
                            <AlertTriangle className={`w-5 h-5 ${danger ? 'text-red-400' : 'text-amber-400'}`} />
                        </div>
                        <h3 className="font-bold text-white text-base">{title}</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-5">
                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{message}</p>
                </div>

                <div className="flex gap-3 p-5 pt-0">
                    <Button
                        variant="ghost"
                        className="flex-1"
                        onClick={onClose}
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        className={`flex-1 ${danger
                            ? 'bg-red-600 hover:bg-red-500 text-white'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                            }`}
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}

interface AlertDialogProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
}

export function AlertDialog({ isOpen, onClose, title, message }: AlertDialogProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-700/50 bg-slate-900 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-5 border-b border-slate-800">
                    <h3 className="font-bold text-white text-base">{title}</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-5">
                    <p className="text-sm text-slate-300 leading-relaxed">{message}</p>
                </div>
                <div className="p-5 pt-0">
                    <Button className="w-full bg-slate-700 hover:bg-slate-600 text-white" onClick={onClose}>
                        OK
                    </Button>
                </div>
            </div>
        </div>
    );
}

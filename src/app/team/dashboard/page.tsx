"use client";

import { useEffect, useState, Suspense } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Users, ShieldCheck, ArrowLeft, Plus, AlertCircle, Edit2, Trash2, UserCheck, Printer, CheckCircle } from "lucide-react";
import Link from "next/link";
import { Player, TeamEntry } from "@/lib/types";
import { PlayerForm } from "@/components/ui/PlayerForm";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog, AlertDialog } from "@/components/ui/ConfirmDialog";
import { useSearchParams } from "next/navigation";
import { getTournamentName } from "@/lib/tournament-constants";

function DashboardContent() {
    const searchParams = useSearchParams();
    const entryId = searchParams.get('id');

    const [teamEntry, setTeamEntry] = useState<TeamEntry | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
    const [settings, setSettings] = useState<any>(null);
    // Custom dialog state (replaces browser alert/confirm)
    const [alertDialog, setAlertDialog] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: "", message: "" });
    const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void; danger?: boolean; confirmLabel?: string }>({ open: false, title: "", message: "", onConfirm: () => { }, danger: false, confirmLabel: "削除する" });
    // 領収書発行モーダル
    const [receiptModal, setReceiptModal] = useState(false);
    const [receiptNameInput, setReceiptNameInput] = useState("");
    const [isEditingReceiptName, setIsEditingReceiptName] = useState(false);
    const [isIssuingReceipt, setIsIssuingReceipt] = useState(false);
    // バスケクリニック確約モーダル
    const [clinicModalOpen, setClinicModalOpen] = useState(false);
    const [tempClinicParticipation, setTempClinicParticipation] = useState<boolean | null>(null);
    const [tempClinicCount, setTempClinicCount] = useState<number>(1);

    const showAlert = (title: string, message: string) => setAlertDialog({ open: true, title, message });
    const showConfirm = (title: string, message: string, onConfirm: () => void, danger = false, confirmLabel = "削除する") => setConfirmDialog({ open: true, title, message, onConfirm, danger, confirmLabel });

    useEffect(() => {
        fetch("/api/settings").then(res => res.json()).then(setSettings).catch(console.error);
    }, []);

    useEffect(() => {
        if (!entryId) return;

        const fetchTeamData = async () => {
            try {
                const res = await fetch('/api/team/data', {
                    headers: { 'x-team-id': entryId }
                });
                if (res.ok) {
                    const data = await res.json();
                    setTeamEntry(data.teamEntry);
                } else {
                    console.error("Failed to fetch");
                }
            } catch (e) {
                console.error("Error:", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTeamData();
    }, [entryId]);

    const handleSavePlayer = async (player: Player) => {
        if (!teamEntry) return;

        // Optimistic Update
        const updatedPlayers = [...teamEntry.players];
        const existingIndex = updatedPlayers.findIndex(p => p.id === player.id);
        if (existingIndex >= 0) {
            updatedPlayers[existingIndex] = player;
        } else {
            updatedPlayers.push(player);
        }

        const previousEntry = { ...teamEntry };
        setTeamEntry({ ...teamEntry, players: updatedPlayers });
        setIsModalOpen(false);
        setEditingPlayer(null);

        try {
            const res = await fetch('/api/player/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-team-id': teamEntry.id
                },
                body: JSON.stringify(player)
            });

            if (!res.ok) {
                throw new Error('Save failed');
            }
        } catch (e) {
            showAlert("保存エラー", "保存に失敗しました。もう一度お試しください。");
            setTeamEntry(previousEntry); // Rollback
        }
    };

    const handleDeletePlayer = (playerId: string) => {
        if (!teamEntry) return;

        const playerToDelete = teamEntry.players.find(p => p.id === playerId);
        if (playerToDelete?.isRepresentative) {
            showAlert("削除できません", "代表者は削除できません。");
            return;
        }

        showConfirm(
            "選手の削除",
            `「${playerToDelete?.name}」選手を削除してもよろしいですか？\nこの操作は取り消せません。`,
            async () => {
                const previousEntry = { ...teamEntry };
                const updatedPlayers = teamEntry.players.filter(p => p.id !== playerId);
                setTeamEntry({ ...teamEntry, players: updatedPlayers });

                try {
                    const res = await fetch('/api/player/delete', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-team-id': teamEntry.id
                        },
                        body: JSON.stringify({ playerId })
                    });

                    if (!res.ok) {
                        throw new Error('Delete failed');
                    }
                } catch (e) {
                    showAlert("削除エラー", "削除に失敗しました。もう一度お試しください。");
                    setTeamEntry(previousEntry); // Rollback
                }
            },
            true // danger mode (red button)
        );
    };

    const handleFinalizeEntry = async (updatedEntry?: TeamEntry) => {
        const targetEntry = updatedEntry || teamEntry;
        if (!targetEntry) return;
        try {
            const res = await fetch('/api/team/submit', {
                method: 'POST',
                headers: { 'x-team-id': targetEntry.id }
            });
            if (res.ok) {
                setTeamEntry({ ...targetEntry, status: 'submitted' });
                // Automatically open the invoice page in a new tab after submission
                window.open(`/team/invoice?id=${targetEntry.id}`, '_blank');
            } else {
                showAlert("エラー", "本エントリーの処理に失敗しました。");
            }
        } catch (e) {
            showAlert("エラー", "通信エラーが発生しました。");
        }
    };

    const handleFinalizeClick = () => {
        if (!teamEntry) return;
        
        // If clinic is active for this project, and the selection is still null, open the selector modal
        if ((teamEntry as any).hasClinic && teamEntry.clinicParticipation === null) {
            setTempClinicParticipation(null);
            setTempClinicCount(1);
            setClinicModalOpen(true);
            return;
        }
        
        showConfirm(
            "本エントリー確認",
            "これ以降メンバーの編集ができなくなりますが、本エントリーを完了して請求書を発行してよろしいですか？",
            () => handleFinalizeEntry(),
            false,
            "完了する"
        );
    };

    const handleFinalizeWithClinic = async () => {
        if (!teamEntry || tempClinicParticipation === null) return;
        setIsLoading(true);
        try {
            const updateRes = await fetch('/api/team/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-team-id': teamEntry.id },
                body: JSON.stringify({
                    clinicParticipation: tempClinicParticipation,
                    clinicCount: tempClinicParticipation ? tempClinicCount : 0
                })
            });
            if (updateRes.ok) {
                const updated = {
                    ...teamEntry,
                    clinicParticipation: tempClinicParticipation,
                    clinicCount: tempClinicParticipation ? tempClinicCount : 0
                };
                setTeamEntry(updated);
                setClinicModalOpen(false);
                await handleFinalizeEntry(updated);
            } else {
                showAlert("エラー", "クリニック情報の保存に失敗しました。");
            }
        } catch (e) {
            showAlert("エラー", "通信エラーが発生しました。");
        } finally {
            setIsLoading(false);
        }
    };

    // 領収書を発行する（初回のみ宛名を保存）
    const handleIssueReceipt = async (customName?: string) => {
        if (!teamEntry) return;
        setIsIssuingReceipt(true);
        try {
            const res = await fetch('/api/team/receipt/issue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-team-id': teamEntry.id },
                body: JSON.stringify({ receiptName: customName || null })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setTeamEntry({ ...teamEntry, receiptName: data.receiptName || undefined, receiptIssuedAt: data.receiptIssuedAt });
                setReceiptModal(false);
                window.open(`/team/receipt?id=${teamEntry.id}`, '_blank');
            } else {
                showAlert("エラー", data.error || "領収書の発行に失敗しました。");
            }
        } catch (e) {
            showAlert("エラー", "通信エラーが発生しました。");
        } finally {
            setIsIssuingReceipt(false);
        }
    };

    if (!entryId) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Invalid Entry ID</div>;
    if (isLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>;
    if (!teamEntry) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Team Entry Not Found</div>;

    const totalPlayers = teamEntry.players.length;
    const insuranceCount = teamEntry.players.filter(p => p.insurance).length;
    const isDeadlinePassed = (teamEntry as any).projectEndDate ? new Date() > new Date((teamEntry as any).projectEndDate) : false;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
            {/* Header */}
            <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-white leading-tight">{teamEntry.teamName}</h1>
                                {(teamEntry as any).isWaitlist && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap">
                                        キャンセル待ち
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-indigo-400">{(teamEntry as any).projectName || teamEntry.tournamentId}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {!isDeadlinePassed && (
                            <div className="text-right">
                                <Link href={`/team/edit?id=${entryId}`} className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 justify-end">
                                    チーム設定
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-5xl mx-auto space-y-8">

                    {teamEntry.status === 'submitted' ? (
                        <div className="p-5 rounded-xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-400 flex items-start gap-4">
                            <CheckCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-bold text-lg mb-2">✅ 本エントリー完了済み</h3>
                                <div className="text-sm space-y-2 opacity-90 leading-relaxed">
                                    <p>本エントリーが完了しているため、メンバーの編集はロックされています。</p>
                                    <ul className="list-disc list-inside space-y-1 ml-1 text-xs md:text-sm">
                                        <li>本エントリー完了後にメンバーが追加となる場合は、大会当日に会場受付にて参加費をご精算のうえ、リストバンドをお受け取りください。</li>
                                        <li>追加メンバーは大会のスポーツ保険の対象外となりますので、個人でレクリエーション保険等にご加入されることをお勧めいたします。</li>
                                        <li>すでに登録済みのメンバーがキャンセルとなった場合、参加費用の返金はいたしかねますので、あらかじめご了承ください。</li>
                                    </ul>
                                    <p className="pt-2">その他、登録内容の変更が必要な場合は運営にお問い合わせください。</p>
                                </div>
                            </div>
                        </div>
                    ) : (teamEntry as any).projectEndDate && (() => {
                        const deadline = new Date((teamEntry as any).projectEndDate);
                        const now = new Date();
                        const diffTime = deadline.getTime() - now.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        return (
                            <div className={`p-5 rounded-xl border flex items-start gap-4 ${diffTime > 0 ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-red-500/10 border-red-500/30 text-red-400"}`}>
                                <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-bold text-lg mb-1">
                                        {diffTime > 0 ? "⚠️ エントリー期限についてのお知らせ (現在は仮エントリーです)" : "❌ エントリー受付期間終了"}
                                    </h3>
                                    {diffTime > 0 ? (
                                        <div className="space-y-2 text-sm text-amber-400/90">
                                            <p className="font-bold">
                                                メンバー登録締切まで残り <span className="text-xl text-amber-300 mx-1">{diffDays}</span> 日
                                                <span className="text-xs ml-2 opacity-80">({deadline.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })})</span>
                                            </p>
                                            <p>現在このチームは「仮エントリー」状態です。すべてのメンバーを追加した後、ページ下部の<strong className="text-amber-300">「本エントリーを完了する」ボタンを必ず押してください。</strong>期限を過ぎると完了できなくなります。</p>
                                        </div>
                                    ) : (
                                        <p className="text-sm">
                                            参加内容の編集期限を過ぎたため、現在メンバーの登録や変更はできません。<br />変更が必要な場合は運営にお問い合わせください。
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="p-4 bg-slate-900 border-slate-800">
                            <div className="flex items-center gap-2 mb-2">
                                <Users className="w-4 h-4 text-indigo-400" />
                                <span className="text-xs text-slate-400">登録選手</span>
                            </div>
                            <p className="text-2xl font-bold text-white">{totalPlayers}<span className="text-sm font-normal text-slate-500 ml-1">名</span></p>
                        </Card>
                        <Card className="p-4 bg-slate-900 border-slate-800">
                            <div className="flex items-center gap-2 mb-2">
                                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                <span className="text-xs text-slate-400">保険加入</span>
                            </div>
                            <p className="text-2xl font-bold text-emerald-400">{insuranceCount}<span className="text-sm font-normal text-slate-500 ml-1">名</span></p>
                        </Card>
                        {(teamEntry as any).hasClinic && (
                            <Card className="p-4 bg-indigo-950/20 border-indigo-500/20 col-span-2 md:col-span-2 flex flex-col justify-between">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs text-indigo-300 font-bold">{(teamEntry as any).clinicTitle || "🏀 バスケクリニック参加希望"}</span>
                                </div>
                                <p className={`text-xl font-black leading-tight ${teamEntry.clinicParticipation === null ? 'text-amber-400' : 'text-indigo-400'}`}>
                                    {teamEntry.clinicParticipation === null
                                        ? "未回答 (要選択)"
                                        : teamEntry.clinicParticipation
                                            ? `参加する (${teamEntry.clinicCount}名)`
                                            : "参加しない"}
                                </p>
                                {teamEntry.status === 'draft' && (
                                    <p className="text-[9px] text-slate-500 mt-1">※上部の「チーム設定」から変更できます</p>
                                )}
                            </Card>
                        )}
                    </div>

                    {/* Team Introduction Section */}
                    {teamEntry.status === 'draft' && (
                        <Card className="p-6 bg-slate-900 border-slate-800">
                            <div className="flex items-center gap-2 mb-4">
                                <h2 className="text-xl font-bold text-white">チーム紹介・意気込み</h2>
                            </div>
                            <p className="text-sm text-slate-400 mb-4">
                                大会当日にMCがこの情報をもとにチームの紹介を行います！アピールポイントや意気込みなど、色々と書いてもらえると嬉しいです！
                            </p>
                            <textarea
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-4 text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                                rows={4}
                                placeholder="例：〇〇から参加します！〇〇ブースターで結成したチームです！優勝目指して頑張ります！"
                                defaultValue={teamEntry.teamIntroduction || ""}
                                onBlur={async (e) => {
                                    const newText = e.target.value;
                                    if (newText === teamEntry.teamIntroduction) return;
                                    try {
                                        const res = await fetch('/api/team/update', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json', 'x-team-id': teamEntry.id },
                                            body: JSON.stringify({ teamIntroduction: newText })
                                        });
                                        if (res.ok) {
                                            setTeamEntry({ ...teamEntry, teamIntroduction: newText });
                                        }
                                    } catch (err) {
                                        console.error("Failed to update intro", err);
                                    }
                                }}
                            />
                            <p className="text-xs text-slate-500 mt-2">入力後、外をタップすると自動保存されます。</p>
                        </Card>
                    )}

                    {/* Player List */}
                    <Card className="bg-slate-900 border-slate-800 overflow-hidden">
                        <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-white mb-1">選手リスト</h2>
                                <p className="text-sm text-slate-400">{teamEntry.status === 'submitted' ? '登録済みの選手一覧です。' : '大会に参加する選手を登録してください。'}</p>
                            </div>
                            {teamEntry.status !== 'submitted' && (
                                <Button onClick={() => {
                                    setEditingPlayer(null);
                                    setIsModalOpen(true);
                                }} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                                    <Plus className="w-4 h-4 mr-2" /> 選手を追加
                                </Button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-3 p-4">
                            {teamEntry.players.length === 0 ? (
                                <div className="p-8 text-center bg-slate-950/50 rounded-xl border border-slate-800">
                                    <p className="text-slate-500">選手が登録されていません</p>
                                    {teamEntry.status !== 'submitted' && (
                                        <Button onClick={() => {
                                            setEditingPlayer(null);
                                            setIsModalOpen(true);
                                        }} variant="outline" className="mt-4 border-slate-700">
                                            <Plus className="w-4 h-4 mr-2" /> 最初の選手を追加
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                teamEntry.players.map((player) => (
                                    <div key={player.id} className="bg-slate-950/50 hover:bg-slate-900/80 border border-slate-800 rounded-xl p-4 transition-all">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold text-white text-lg">{player.name}</span>
                                                    {player.isRepresentative && (
                                                        <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/30 font-bold">
                                                            代表
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500">{player.furigana}</p>
                                            </div>
                                            {teamEntry.status !== 'submitted' && (
                                                <div className="flex gap-2">
                                                    <button onClick={() => {
                                                        setEditingPlayer(player);
                                                        setIsModalOpen(true);
                                                    }} className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors border border-slate-800">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    {!player.isRepresentative && (
                                                        <button onClick={() => handleDeletePlayer(player.id)} className="p-2 text-slate-400 hover:text-red-400 bg-slate-900 hover:bg-red-950/50 rounded-lg transition-colors border border-slate-800">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-800/50">
                                            <div className={`p-2.5 rounded-lg border flex flex-col gap-1 items-start ${player.wristbandColor === '赤' ? 'bg-red-900/10 border-red-500/20' :
                                                player.wristbandColor === '青' ? 'bg-blue-900/10 border-blue-500/20' :
                                                    'bg-yellow-900/10 border-yellow-500/20'
                                                }`}>
                                                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">レベル/リストバンド</span>
                                                <span className={`text-sm font-bold ${player.wristbandColor === '赤' ? 'text-red-400' :
                                                    player.wristbandColor === '青' ? 'text-blue-400' : 'text-yellow-400'
                                                    }`}>
                                                    {player.wristbandColor}
                                                </span>
                                            </div>
                                            <div className={`p-2.5 rounded-lg border flex flex-col gap-1 items-start ${player.insurance ? 'bg-emerald-900/10 border-emerald-500/20' : 'bg-slate-900/50 border-slate-800'}`}>
                                                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">スポーツ保険</span>
                                                <span className={`text-sm font-bold flex items-center gap-1.5 ${player.insurance ? 'text-emerald-400' : 'text-slate-400'}`}>
                                                    {player.insurance ? <ShieldCheck className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                                    {player.insurance ? '加入' : '未加入'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>

                    {/* Finalize Action or Invoice Action */}
                    <div className="pt-8 mb-12">
                        {teamEntry.status === 'draft' ? (
                            <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-2xl p-6 md:p-8 text-center space-y-6 shadow-xl">
                                <div>
                                    <h3 className="text-xl font-bold text-indigo-300 mb-2">メンバー登録はすべて完了しましたか？</h3>
                                    <p className="text-sm text-indigo-200/80">
                                        すべてのメンバーの登録が終わったら、「本エントリーを完了する」を押して請求書を発行してください。<br className="hidden md:block" />
                                        <strong className="text-amber-400">※これ以降、メンバー情報（追加・編集・削除）の変更は一切できなくなります。</strong>
                                    </p>
                                </div>
                                <Button
                                    size="lg"
                                    onClick={handleFinalizeClick}
                                    className="w-full md:w-auto min-w-[300px] bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold py-6 text-lg shadow-lg shadow-indigo-500/30"
                                >
                                    <CheckCircle className="w-5 h-5 mr-2" /> 本エントリーを完了し、請求書を発行する
                                </Button>
                            </div>
                        ) : (
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 text-center space-y-4">
                                <h3 className="text-lg font-bold text-white mb-2">本エントリー完了済み・書類</h3>
                                {/* 請求書ボタン */}
                                <Link href={`/team/invoice?id=${teamEntry.id}`} target="_blank" className="w-full md:w-auto inline-flex justify-center items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 px-8 rounded-lg shadow transition-colors">
                                    <Printer className="w-5 h-5" /> 請求書（PDF）を発行・確認する
                                </Link>
                                {/* 領収書ボタン：支払い確認済みの場合のみ表示 */}
                                {teamEntry.isPaid && (
                                    <div>
                                        {teamEntry.receiptViewedAt ? (
                                            // 閲覧済み：ボタン無効化
                                            <button
                                                disabled
                                                className="w-full md:w-auto inline-flex justify-center items-center gap-2 bg-slate-800/50 border border-slate-700 text-slate-500 font-bold py-4 px-8 rounded-lg shadow cursor-not-allowed"
                                            >
                                                <Printer className="w-5 h-5" /> 領収書は確認済みです（再表示不可）
                                            </button>
                                        ) : teamEntry.receiptIssuedAt ? (
                                            // 発行済み・未閲覧：確認のみ
                                            <div className="space-y-2">
                                                <button
                                                    onClick={() => {
                                                        window.open(`/team/receipt?id=${teamEntry.id}`, '_blank');
                                                        // Optimistically set viewed so they can't click again without refresh
                                                        setTeamEntry({ ...teamEntry, receiptViewedAt: new Date().toISOString() });
                                                    }}
                                                    className="w-full md:w-auto inline-flex justify-center items-center gap-2 bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-500/40 text-emerald-300 font-bold py-4 px-8 rounded-lg shadow transition-colors"
                                                >
                                                    <Printer className="w-5 h-5" /> 領収書（発行済み）を確認・保存する
                                                </button>
                                                <p className="text-xs text-red-400 font-bold">⚠️ 表示できるのは1度のみです。必ずPDFを保存してください。</p>
                                            </div>
                                        ) : (
                                            // 未発行：発行モーダルを開く
                                            <button
                                                onClick={() => {
                                                    const rep = teamEntry.players?.find(p => p.isRepresentative);
                                                    setReceiptNameInput(`${teamEntry.teamName} ${rep?.name || ''}`.trim());
                                                    setIsEditingReceiptName(false);
                                                    setReceiptModal(true);
                                                }}
                                                className="w-full md:w-auto inline-flex justify-center items-center gap-2 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-500/40 text-blue-300 font-bold py-4 px-8 rounded-lg shadow transition-colors"
                                            >
                                                <Printer className="w-5 h-5" /> 領収書を発行・確認する
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPlayer ? "選手情報を編集" : "選手を追加"}>
                <PlayerForm
                    initialData={editingPlayer || undefined}
                    onSave={handleSavePlayer}
                    onCancel={() => setIsModalOpen(false)}
                />
            </Modal>

            {/* 領収書発行モーダル */}
            {receiptModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => !isIssuingReceipt && setReceiptModal(false)} />
                    <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
                        <h2 className="text-lg font-bold text-white">領収書の発行</h2>
                        
                        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 space-y-1">
                            <p className="text-sm text-red-400 font-bold flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" /> ⚠️ 重要事項
                            </p>
                            <ul className="list-disc list-inside text-xs text-red-300/90 ml-1 space-y-1">
                                <li>領収書の発行と確認は<span className="font-bold underline text-red-400">1度のみ</span>可能です。</li>
                                <li>確認画面を閉じると二度と表示されません。</li>
                                <li>必ず画面から<span className="font-bold underline text-red-400">PDFを保存</span>または<span className="font-bold underline text-red-400">印刷</span>をしてください。</li>
                                <li>発行後は宛名（御社名）の変更はできません。</li>
                            </ul>
                        </div>

                        {/* 宛名表示 */}
                        <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-700">
                            <p className="text-xs text-slate-500 mb-1 font-bold uppercase tracking-wider">領収書の宛名（御社名）</p>
                            {isEditingReceiptName ? (
                                <input
                                    type="text"
                                    value={receiptNameInput}
                                    onChange={(e) => setReceiptNameInput(e.target.value)}
                                    className="w-full bg-slate-900 border border-indigo-500 rounded-lg px-3 py-2 text-white text-base focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    placeholder="例：株式会社〇〇 様、△△チーム"
                                    autoFocus
                                />
                            ) : (
                                <p className="text-white font-bold text-base">{receiptNameInput}　御中</p>
                            )}
                        </div>

                        {/* 宛名変更ボタン */}
                        {!isEditingReceiptName ? (
                            <button
                                onClick={() => setIsEditingReceiptName(true)}
                                className="text-sm text-indigo-400 hover:text-indigo-300 underline"
                            >
                                宛名を変更する
                            </button>
                        ) : (
                            <button
                                onClick={() => setIsEditingReceiptName(false)}
                                className="text-sm text-slate-400 hover:text-slate-300 underline"
                            >
                                変更をキャンセル
                            </button>
                        )}

                        {/* アクションボタン */}
                        <div className="flex flex-col gap-2 pt-2">
                            <button
                                onClick={() => handleIssueReceipt(receiptNameInput || undefined)}
                                disabled={isIssuingReceipt}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
                            >
                                {isIssuingReceipt ? '発行中...' : 'この内容で発行する'}
                            </button>
                            <button
                                onClick={() => !isIssuingReceipt && setReceiptModal(false)}
                                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition-colors"
                            >
                                戻る（発行しない）
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Dialogs (replace browser alert/confirm) */}
            <AlertDialog
                isOpen={alertDialog.open}
                onClose={() => setAlertDialog(d => ({ ...d, open: false }))}
                title={alertDialog.title}
                message={alertDialog.message}
            />
            {/* バスケクリニック参加確認モーダル */}
            {clinicModalOpen && teamEntry && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="text-center">
                            <h3 className="text-lg font-black text-white flex items-center justify-center gap-2">
                                🏀 バスケクリニック参加希望の確認
                            </h3>
                            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                                本エントリーを完了する前に、{(teamEntry as any).clinicTitle || '山下泰弘さんによるバスケクリニック'}への参加希望を入力してください。
                            </p>
                        </div>

                        <div className="space-y-4 bg-slate-950/50 p-4 rounded-xl border border-white/5">
                            <div className="flex flex-col gap-3">
                                <label className="flex items-center gap-2.5 cursor-pointer text-sm font-medium text-slate-200">
                                    <input
                                        type="radio"
                                        name="tempClinicParticipation"
                                        checked={tempClinicParticipation === true}
                                        onChange={() => setTempClinicParticipation(true)}
                                        className="w-4 h-4 text-indigo-600 border-slate-700 bg-slate-900 focus:ring-indigo-500 cursor-pointer"
                                    />
                                    クリニックに参加する
                                </label>
                                <label className="flex items-center gap-2.5 cursor-pointer text-sm font-medium text-slate-200">
                                    <input
                                        type="radio"
                                        name="tempClinicParticipation"
                                        checked={tempClinicParticipation === false}
                                        onChange={() => {
                                            setTempClinicParticipation(false);
                                            setTempClinicCount(0);
                                        }}
                                        className="w-4 h-4 text-indigo-600 border-slate-700 bg-slate-900 focus:ring-indigo-500 cursor-pointer"
                                    />
                                    参加しない
                                </label>
                            </div>

                            {tempClinicParticipation === true && (
                                <div className="space-y-2 pt-2 border-t border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <label className="text-xs font-bold text-slate-400 block mb-1">参加予定人数 (1〜{(teamEntry as any).clinicLimit || 20}名)</label>
                                    <select
                                        value={tempClinicCount}
                                        onChange={(e) => setTempClinicCount(parseInt(e.target.value, 10))}
                                        className="bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5 outline-none font-sans"
                                    >
                                        {Array.from({ length: (teamEntry as any).clinicLimit || 20 }, (_, i) => i + 1).map((n) => (
                                            <option key={n} value={n}>
                                                {n} 名
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* アクションボタン */}
                        <div className="flex flex-col gap-2 pt-2">
                            <button
                                onClick={handleFinalizeWithClinic}
                                disabled={tempClinicParticipation === null || isLoading}
                                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                            >
                                {isLoading ? '処理中...' : '希望を確定して、本エントリーを完了する'}
                            </button>
                            <button
                                onClick={() => !isLoading && setClinicModalOpen(false)}
                                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition-colors"
                            >
                                キャンセル
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={confirmDialog.open}
                onClose={() => setConfirmDialog(d => ({ ...d, open: false }))}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
                danger={confirmDialog.danger}
                confirmLabel={confirmDialog.confirmLabel}
            />
        </div>
    );

}

export default function TeamDashboard() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>}>
            <DashboardContent />
        </Suspense>
    );
}

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ArrowLeft, CheckCircle2, Loader2, Users, ShieldCheck, UserCheck, MessageCircle, Copy, Check, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export default function RegisterPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [teamId, setTeamId] = useState<string | null>(null);
    const [isWaitlist, setIsWaitlist] = useState(false);
    const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
    const [registeredPassword, setRegisteredPassword] = useState<string | null>(null);
    const [copiedEmail, setCopiedEmail] = useState(false);
    const [copiedPassword, setCopiedPassword] = useState(false);
    const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);
    const [settings, setSettings] = useState<any>(null);
    const [projects, setProjects] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        projectId: "", // NEW: Selected Tournament Day/Project
        existingUserId: "", // NEW: Track existing user if logged in
        name: "",
        nameKana: "", // NEW
        introduction: "", // NEW
        isBeginnerFriendlyAccepted: false, // NEW
        representative: "",
        furigana: "",
        email: "",
        phone: "",
        preliminaryNumber: "", // 1-16
        wristbandColor: "赤",
        insurance: true,
        password: "",
        confirmPassword: "",
        clinicParticipation: null as boolean | null,
        clinicCount: 0
    });
    const [error, setError] = useState("");
    const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({ open: false, title: "", message: "", onConfirm: () => {} });

    const showConfirm = (title: string, message: string, onConfirm: () => void) => setConfirmDialog({ open: true, title, message, onConfirm });

    useEffect(() => {
        const userJson = localStorage.getItem('currentUser');
        let initialUser: any = null;
        if (userJson) {
            try {
                initialUser = JSON.parse(userJson);
            } catch (e) { }
        }

        Promise.all([
            fetch("/api/settings").then(res => res.json()).catch(() => null),
            fetch("/api/projects/active").then(res => res.json()).catch(() => ({ projects: [] }))
        ]).then(([settingsData, projectsData]) => {
            if (settingsData) setSettings(settingsData);
            if (projectsData && projectsData.projects) {
                setProjects(projectsData.projects);
                // Auto-select the first available project if it exists
                if (projectsData.projects.length > 0) {
                    setFormData(prev => ({
                        ...prev,
                        projectId: projectsData.projects[0].id,
                        existingUserId: initialUser ? initialUser.id : "",
                        email: initialUser ? initialUser.email : "",
                        representative: initialUser ? initialUser.name : "",
                        furigana: initialUser && initialUser.furigana ? initialUser.furigana : ""
                    }));
                } else if (initialUser) {
                    setFormData(prev => ({
                        ...prev,
                        existingUserId: initialUser.id,
                        email: initialUser.email,
                        representative: initialUser.name,
                        furigana: initialUser.furigana || ""
                    }));
                }
            }
            setIsSettingsLoaded(true);
        }).catch(() => setIsSettingsLoaded(true));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!formData.existingUserId && formData.password !== formData.confirmPassword) {
            setError("パスワードが一致しません");
            return;
        }
        if (!formData.projectId) {
            setError("参加する大会（日程）を選択してください");
            return;
        }
        if (!formData.preliminaryNumber) {
            setError("予選抽選用の数字を選択してください");
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch("/api/team/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tournamentId: formData.projectId, // NEW
                    existingUserId: formData.existingUserId, // NEW
                    name: formData.name,
                    teamNameKana: formData.nameKana, // NEW
                    teamIntroduction: formData.introduction, // NEW
                    isBeginnerFriendlyAccepted: formData.isBeginnerFriendlyAccepted, // NEW
                    representative: formData.representative,
                    furigana: formData.furigana,
                    email: formData.email,
                    phone: formData.phone,
                    preliminaryNumber: parseInt(formData.preliminaryNumber, 10),
                    wristbandColor: formData.wristbandColor,
                    insurance: formData.insurance,
                    password: formData.password,
                    clinicParticipation: formData.clinicParticipation,
                    clinicCount: formData.clinicCount
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "登録に失敗しました");
            }

            if (data.user) {
                localStorage.setItem('currentUser', JSON.stringify(data.user));
            }

            setTeamId(data.teamId);
            setIsWaitlist(data.isWaitlist || false);
            setRegisteredEmail(formData.email);
            setRegisteredPassword(formData.password);

        } catch (err: any) {
            if (err.message === 'このメールアドレスは既に登録されています') {
                showConfirm(
                    "登録済みのアカウント",
                    `「${formData.email}」\n上記のメールアドレスは既に登録されています。\n\nログイン画面へ移動しますか？`,
                    () => router.push(`/login?email=${encodeURIComponent(formData.email)}`)
                );
            } else {
                setError(err.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = (text: string, type: 'email' | 'password') => {
        navigator.clipboard.writeText(text);
        if (type === 'email') {
            setCopiedEmail(true);
            setTimeout(() => setCopiedEmail(false), 2000);
        } else {
            setCopiedPassword(true);
            setTimeout(() => setCopiedPassword(false), 2000);
        }
    };

    const activeProject = projects.find(p => p.id === formData.projectId);

    if (!isSettingsLoaded) {
        return (
            <div className="min-h-screen bg-[#20211f] flex flex-col items-center justify-center p-4">
                <Loader2 className="w-8 h-8 text-[#f18a5c] animate-spin" />
            </div>
        );
    }



    if (projects.length === 0) {
        return (
            <div className="min-h-screen bg-[#20211f] flex flex-col items-center justify-center p-4 text-[#d9dace]">
                <Card className="w-full max-w-md p-8 bg-[#292b28] border-[#454740] text-center space-y-4">
                    <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-8 h-8 text-amber-300" />
                    </div>
                    <h2 className="text-xl font-bold text-[#f3f0e8]">募集期間外です</h2>
                    <p className="text-[#b6b8ad]">現在、エントリーを受け付けている大会日程はありません。</p>
                    <Button onClick={() => router.push("/")} className="w-full mt-4 bg-[#353731] hover:bg-[#353731]">トップへ戻る</Button>
                </Card>
            </div>
        );
    }

    if (teamId) {
        return (
            <div className="min-h-screen bg-[#20211f] flex flex-col items-center justify-center p-4 text-[#d9dace] font-sans selection:bg-[#f18a5c]/30">

                <Card className="w-full max-w-md p-8 bg-[#292b28] border-[#454740]  relative z-10 shadow-none">
                    <div className="text-center space-y-6">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ring-1 ${isWaitlist ? 'bg-amber-500/10 ring-amber-500/20' : 'bg-[#f18a5c]/100/10 ring-orange-500/20'}`}>
                            {isWaitlist ? <AlertCircle className="w-8 h-8 text-amber-300" /> : <CheckCircle2 className="w-8 h-8 text-[#f18a5c]" />}
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold text-[#f3f0e8] mb-2">
                                {isWaitlist ? "キャンセル待ち受付完了" : "登録完了！"}
                            </h2>
                            {isWaitlist && (
                                <p className="text-amber-300 font-bold mb-4 text-sm bg-amber-500/10 border border-amber-500/20 p-3 rounded-md">
                                    この大会は満員のため、<br />キャンセル待ち枠として受け付けました。<br />空きが出た場合は管理者よりご連絡いたします。
                                </p>
                            )}
                            <p className="text-[#b6b8ad]">アカウントが作成され、自動的にログインしました。<br />次回ログインのために以下の情報は必ず保存しておいてください。</p>
                        </div>

                        <div className="bg-[#20211f] rounded-lg p-6 border border-[#454740] space-y-4">
                            <div>
                                <p className="text-xs text-[#b6b8ad] uppercase tracking-wider mb-1">ログインメールアドレス</p>
                                <div className="flex items-center gap-2">
                                    <p className="flex-1 text-lg  font-bold text-[#f18a5c] tracking-wider bg-[#292b28] rounded p-2 select-all break-all m-0">{registeredEmail}</p>
                                    <Button size="sm" variant="outline" className="w-10 h-10 p-0 flex items-center justify-center shrink-0 bg-[#292b28] border-[#454740] hover:bg-[#353731] hover:text-[#f3f0e8]" onClick={() => registeredEmail && handleCopy(registeredEmail, 'email')}>
                                        {copiedEmail ? <Check className="w-4 h-4 text-[#f18a5c]" /> : <Copy className="w-4 h-4 text-[#b6b8ad]" />}
                                    </Button>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-[#b6b8ad] uppercase tracking-wider mb-1">ログインパスワード</p>
                                <div className="flex items-center gap-2">
                                    <p className="flex-1 text-lg  font-bold text-[#f18a5c] tracking-wider bg-[#292b28] rounded p-2 m-0">
                                        {registeredPassword ? (
                                            <span className="select-all">{registeredPassword}</span>
                                        ) : (
                                            <span className="text-sm font-sans tracking-normal font-normal text-[#b6b8ad]">登録済みのパスワードをご利用ください</span>
                                        )}
                                    </p>
                                    {registeredPassword && (
                                        <Button size="sm" variant="outline" className="w-10 h-10 p-0 flex items-center justify-center shrink-0 bg-[#292b28] border-[#454740] hover:bg-[#353731] hover:text-[#f3f0e8]" onClick={() => handleCopy(registeredPassword, 'password')}>
                                            {copiedPassword ? <Check className="w-4 h-4 text-[#f18a5c]" /> : <Copy className="w-4 h-4 text-[#b6b8ad]" />}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {(activeProject?.lineOpenChatLink || settings?.lineOpenChatLink) ? (
                            <>
                                {/* URGENT LINE OpenChat Warning */}
                                <div className="bg-red-500/10 border-2 border-red-500/60 rounded-xl p-5 text-left space-y-4 animate-in fade-in">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-red-500/20 rounded-lg mt-0.5 flex-shrink-0">
                                            <AlertCircle className="w-5 h-5 text-red-300" />
                                        </div>
                                        <div>
                                            <p className="font-extrabold text-red-300 text-base leading-tight">
                                                ⚠️ 必須：LINEオープンチャットへの参加
                                            </p>
                                            <p className="text-xs text-red-300 mt-0.5 font-bold">
                                                参加しないと大会当日の重要連絡が届きません！
                                            </p>
                                            <p className="text-sm text-red-300 mt-1.5">
                                                リーダーの人だけ大会の集合時間であったりその他大事な情報を発信するので必ず入ってください。
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-red-950/50 rounded-lg p-3 text-sm text-red-300 border border-red-500/20">
                                        <ul className="space-y-1.5 list-none">
                                            <li className="flex items-center gap-2"><span className="text-red-300 font-bold">✕</span> 集合時間・場所の案内が届かない</li>
                                            <li className="flex items-center gap-2"><span className="text-red-300 font-bold">✕</span> 緊急の変更・中止情報が届かない</li>
                                            <li className="flex items-center gap-2"><span className="text-red-300 font-bold">✕</span> ルールや持ち物の案内が届かない</li>
                                        </ul>
                                    </div>
                                    <a
                                        href={activeProject?.lineOpenChatLink || settings?.lineOpenChatLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 w-full bg-[#06C755] hover:bg-[#05b34c] text-[#f3f0e8] font-extrabold py-4 px-4 rounded-lg transition-colors text-base shadow-none shadow-green-900/30"
                                    >
                                        <MessageCircle className="w-5 h-5" />
                                        今すぐLINEオープンチャットに参加する
                                    </a>
                                    <p className="text-center text-xs text-red-300">
                                        ※ リーダー（代表者）の方のみ参加が必要です
                                    </p>
                                </div>

                                <Button
                                    className="w-full bg-[#353731] hover:bg-[#353731] text-[#b6b8ad] hover:text-[#d9dace] font-medium py-4 transition-all duration-300 text-sm"
                                    onClick={() => router.push("/dashboard")}
                                >
                                    LINEを後で参加する（推奨しません）
                                </Button>
                            </>
                        ) : (
                            <Button
                                className="w-full bg-[#f18a5c] hover:bg-[#f6a078] text-white font-medium py-6 shadow-none transition-all duration-300"
                                onClick={() => router.push("/dashboard")}
                            >
                                マイページへ進む
                            </Button>
                        )}
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <>
        <div className="min-h-screen bg-[#20211f] flex flex-col items-center justify-center p-4 text-[#d9dace] font-sans selection:bg-[#f18a5c]/30">

            <Card className="w-full max-w-md p-8 bg-[#292b28] border-[#454740]  relative z-10 shadow-none">
                <div className="mb-8">
                    <Link href="/" className="inline-flex items-center text-sm text-[#b6b8ad] hover:text-[#f3f0e8] transition-colors mb-6">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        トップへ戻る
                    </Link>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-[#f18a5c]/10 rounded-lg">
                            <Users className="w-6 h-6 text-[#f18a5c]" />
                        </div>
                        <h1 className="text-2xl font-bold text-[#f3f0e8]">
                            チームの参加申し込み
                        </h1>
                    </div>
                    <p className="text-[#b6b8ad] text-sm pl-11 mb-6">
                        大会への参加申し込みを行います。<br />
                        登録後、すぐにマイページをご利用いただけます。
                    </p>

                    {/* NEW: Registration Flow Guide */}
                    <div className="bg-[#f18a5c]/10 border border-orange-500/20 rounded-xl p-5 mb-8">
                        <h3 className="font-bold text-[#f18a5c] mb-4 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5" />
                            まずはリーダーのエントリーから
                        </h3>
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#f18a5c] text-[#20211f] flex items-center justify-center font-bold">1</div>
                                <div>
                                    <p className="font-medium text-[#d9dace]">リーダー（連絡担当者）がエントリー</p>
                                    <p className="text-sm text-[#b6b8ad] mt-1">この画面でチーム情報と、リーダーご自身の情報を「1人目のメンバー」として登録します。</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#353731] text-[#b6b8ad] border border-[#454740] flex items-center justify-center font-bold">2</div>
                                <div>
                                    <p className="font-medium text-[#d9dace]">他のメンバーを追加登録</p>
                                    <p className="text-sm text-[#b6b8ad] mt-1">エントリー完了後に画面が切り替わります。<br />マイページから他のメンバーの情報を追加してください。</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    {formData.projectId && projects.find(p => p.id === formData.projectId)?.entryEndDate && (
                        <div className="mt-4 pl-11 text-amber-300 text-sm font-medium">
                            締切: {new Date(projects.find(p => p.id === formData.projectId)!.entryEndDate!).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                    )}
                </div>
                    {formData.existingUserId && (
                        <div className="bg-[#353731] border border-[#454740] rounded-xl p-4 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#353731] flex items-center justify-center shrink-0">
                                    <UserCheck className="w-5 h-5 text-[#d9dace]" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs text-[#b6b8ad] mb-0.5">現在ログイン中のアカウント</p>
                                    <p className="font-bold text-[#f3f0e8] truncate">{formData.representative} <span className="text-xs font-normal text-[#b6b8ad]">({formData.email})</span></p>
                                </div>
                            </div>
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                    showConfirm(
                                        "別のアカウントで登録",
                                        "現在のアカウントからログアウトして、別のアカウントで登録しますか？",
                                        () => {
                                            localStorage.removeItem('currentUser');
                                            setFormData(prev => ({
                                                ...prev,
                                                existingUserId: "",
                                                email: "",
                                                representative: "",
                                                furigana: "",
                                                password: "",
                                                confirmPassword: ""
                                            }));
                                        }
                                    );
                                }}
                                className="text-xs border-[#454740] text-[#d9dace] hover:text-[#f3f0e8] hover:bg-[#353731] shrink-0"
                            >
                                別のアカウントで登録
                            </Button>
                        </div>
                    )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-[#b6b8ad] uppercase tracking-wider ml-1">参加する大会日程 <span className="text-red-300 ml-1">*必須</span></label>

                            {formData.projectId && (() => {
                                const selectedProject = projects.find(p => p.id === formData.projectId);
                                if (selectedProject && selectedProject.maxTeams) {
                                    const isFull = (selectedProject.currentEntryCount || 0) >= selectedProject.maxTeams;

                                    // 枠がいっぱいの時以外は表示しない
                                    if (!isFull) return null;
                                    
                                    const isWaitlistOff = selectedProject.isWaitlistEnabled === false;

                                    return (
                                        <div className="p-3 rounded-lg border flex items-center gap-3 text-sm font-medium mb-3 transition-colors bg-red-500/10 border-red-500/20 text-red-300">
                                            <div className="flex-1">
                                                <span className="flex items-center gap-1.5"><AlertCircle className="w-4 h-4" />
                                                {isWaitlistOff 
                                                    ? "大変申し訳ありません。現在満員枠となっており、受付を終了しました。" 
                                                    : "大変申し訳ありません。現在満員枠となっております。（キャンセル待ちとして登録されます）"}
                                                </span>
                                            </div>
                                            <div className="text-lg tabular-nums tracking-tighter shrink-0 flex items-baseline gap-1 bg-[#292b28] px-3 py-1 rounded-md border border-[#454740]">
                                                <span className="text-red-300">{selectedProject.currentEntryCount || 0}</span>
                                                <span className="text-xs text-[#b6b8ad] font-normal">/ {selectedProject.maxTeams} チーム</span>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            })()}

                            <select
                                value={formData.projectId}
                                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                                required
                                className="bg-[#20211f] border border-[#454740] text-[#d9dace] text-sm rounded-md focus:ring-1 focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5 h-11 outline-none"
                            >
                                <option value="" disabled>選択してください</option>
                                {projects.map(p => {
                                    const isFull = p.maxTeams && (p.currentEntryCount || 0) >= p.maxTeams;
                                    const isWaitlistOff = p.isWaitlistEnabled === false;
                                    const isDisabled = isFull && isWaitlistOff;
                                    return (
                                        <option key={p.id} value={p.id} disabled={isDisabled}>
                                            {p.name} {isFull ? (isWaitlistOff ? '(満員 - 受付終了)' : '(キャンセル待ち)') : ''}
                                        </option>
                                    );
                                })}
                            </select>
                            <p className="text-xs text-[#b6b8ad] px-1">募集中の日程から選択してください。</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-[#b6b8ad] uppercase tracking-wider ml-1">チーム情報 <span className="text-red-300 ml-1">*必須</span></label>
                            <Input
                                placeholder="チーム名"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                className="bg-[#20211f] border-[#454740] focus:border-orange-500/50 focus:ring-orange-500/20 h-11"
                            />
                            <p className="text-xs text-[#b6b8ad] px-1">※ チーム名は後から変更可能です</p>
                            <Input
                                placeholder="チーム名 (フリガナ)"
                                value={formData.nameKana}
                                onChange={(e) => setFormData({ ...formData, nameKana: e.target.value })}
                                required
                                className="bg-[#20211f] border-[#454740] focus:border-orange-500/50 focus:ring-orange-500/20 h-11"
                            />
                        </div>

                        <div className="space-y-2 pt-2 pb-2">
                            <label className="text-xs font-medium text-[#b6b8ad] uppercase tracking-wider ml-1">予選抽選用 数字選択 <span className="text-red-300 ml-1">*必須</span></label>
                            <p className="text-xs text-[#b6b8ad] px-1 mb-1">※ 1〜{activeProject?.maxTeams || 16}の枠から好きな数字を選択してください。重複した場合はエントリー順により繰り上がりとなります。</p>
                            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                                {Array.from({ length: activeProject?.maxTeams || 16 }, (_, i) => i + 1).map(num => (
                                    <div
                                        key={num}
                                        onClick={() => setFormData({ ...formData, preliminaryNumber: num.toString() })}
                                        className={`cursor-pointer rounded-lg border p-2 text-center transition-all ${formData.preliminaryNumber === num.toString()
                                            ? "border-amber-500 bg-amber-500/20 text-amber-300 font-bold"
                                            : "border-[#454740] bg-[#292b28] hover:bg-[#353731] text-[#d9dace]"
                                            }`}
                                    >
                                        {num}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* --- NEW: Section Break for Leader Info --- */}
                        <div className="relative py-4">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-[#454740]"></div>
                            </div>
                            <div className="relative flex justify-center">
                                <span className="bg-[#292b28] px-3 text-xs font-medium text-[#f18a5c] border border-[#454740] rounded-full flex items-center gap-1.5 shadow-sm">
                                    <UserCheck className="w-3.5 h-3.5" />
                                    ここからはあなた自身（リーダー）の登録です
                                </span>
                            </div>
                        </div>

                        <div className="space-y-4 bg-[#20211f] border border-[#454740] rounded-xl p-5">
                            <h3 className="text-sm font-bold text-[#d9dace] mb-2">1人目のメンバー（リーダー情報）</h3>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-[#b6b8ad] uppercase tracking-wider ml-1">氏名 <span className="text-red-300 ml-1">*必須</span></label>
                                {formData.existingUserId ? (
                                    <div className="p-3 bg-[#292b28] border border-[#454740] rounded-md text-[#d9dace] text-sm mt-2">
                                        <p className="text-xs text-[#b6b8ad] mb-1">リーダー (連絡担当者) 氏名</p>
                                        <p>{formData.representative}</p>
                                    </div>
                                ) : (
                                    <>
                                        <Input
                                            placeholder="リーダー (連絡担当者) 氏名"
                                            value={formData.representative}
                                            onChange={(e) => setFormData({ ...formData, representative: e.target.value })}
                                            required
                                            className="bg-[#20211f] border-[#454740] focus:border-orange-500/50 focus:ring-orange-500/20 h-11"
                                        />
                                        <Input
                                            placeholder="リーダー (連絡担当者) 氏名 (フリガナ)"
                                            value={formData.furigana}
                                            onChange={(e) => setFormData({ ...formData, furigana: e.target.value })}
                                            required
                                            className="bg-[#20211f] border-[#454740] focus:border-orange-500/50 focus:ring-orange-500/20 h-11"
                                        />
                                    </>
                                )}
                            </div>

                        </div>

                        {!formData.existingUserId ? (
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-[#b6b8ad] uppercase tracking-wider ml-1">連絡先 <span className="text-red-300 ml-1">*必須</span></label>
                                <Input
                                    type="email"
                                    placeholder="メールアドレス"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                    className="bg-[#20211f] border-[#454740] focus:border-orange-500/50 focus:ring-orange-500/20 h-11"
                                />
                                <Input
                                    type="tel"
                                    placeholder="電話番号 (緊急連絡先)"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    required
                                    className="bg-[#20211f] border-[#454740] focus:border-orange-500/50 focus:ring-orange-500/20 h-11"
                                />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-[#b6b8ad] uppercase tracking-wider ml-1">連絡先</label>
                                <div className="p-3 bg-[#292b28] border border-[#454740] rounded-md text-[#d9dace] text-sm">
                                    <p className="text-xs text-[#b6b8ad] mb-1">ログイン中のアカウントのアドレスを使用します</p>
                                    <p>{formData.email}</p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3 pt-2">
                            <label className="text-xs font-medium text-[#b6b8ad] uppercase tracking-wider ml-1">スポーツ保険の加入状況 <span className="text-red-300 ml-1">*必須</span></label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Option 1: Join Insurance */}
                                <div
                                    onClick={() => setFormData({ ...formData, insurance: true })}
                                    className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${formData.insurance
                                        ? "border-orange-500 bg-[#f18a5c]/100/10"
                                        : "border-[#454740] bg-[#292b28] hover:border-[#454740]"
                                        }`}
                                >
                                    {formData.insurance && (
                                        <div className="absolute top-3 right-3 text-[#f18a5c]">
                                            <CheckCircle2 className="w-5 h-5" />
                                        </div>
                                    )}
                                    <div className="flex flex-col gap-2">
                                        <div className={`p-2 w-fit rounded-lg ${formData.insurance ? "bg-[#f18a5c] text-[#20211f]" : "bg-[#353731] text-[#b6b8ad]"}`}>
                                            <ShieldCheck className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className={`font-bold ${formData.insurance ? "text-[#f18a5c]" : "text-[#d9dace]"}`}>大会保険に加入</h3>
                                            <p className="text-xs text-[#b6b8ad] mt-1">大会中の「プレーや事故による根拠のあるケガ」が補償の対象となります。</p>
                                            <p className="text-xs text-amber-300/80 mt-1">※腰痛や鞭打ちなどは対象外</p>
                                            <p className="text-xs font-bold text-[#f18a5c] mt-1">※ 別途{settings?.insuranceFee || 150}円が必要です</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Option 2: Self Insured */}
                                <div
                                    onClick={() => setFormData({ ...formData, insurance: false })}
                                    className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${!formData.insurance
                                        ? "border-slate-500 bg-[#353731]"
                                        : "border-[#454740] bg-[#292b28] hover:border-[#454740]"
                                        }`}
                                >
                                    {!formData.insurance && (
                                        <div className="absolute top-3 right-3 text-[#b6b8ad]">
                                            <CheckCircle2 className="w-5 h-5" />
                                        </div>
                                    )}
                                    <div className="flex flex-col gap-2">
                                        <div className={`p-2 w-fit rounded-lg ${!formData.insurance ? "bg-stone-600 text-white" : "bg-[#353731] text-[#b6b8ad]"}`}>
                                            <UserCheck className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className={`font-bold ${!formData.insurance ? "text-[#d9dace]" : "text-[#d9dace]"}`}>加入しない</h3>
                                            <p className="text-xs text-[#b6b8ad] mt-1">各自で保険に加入済み、または加入を希望しません</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-medium text-[#b6b8ad] uppercase tracking-wider ml-1">リーダーのリストバンド色 <span className="text-red-300 ml-1">*必須</span></label>
                            <div className="grid grid-cols-1 gap-2">
                                <p className="text-xs text-[#b6b8ad] mb-1">
                                    ※ 試合中の識別に使用します。ご自身の経験に合わせて選択してください。
                                </p>
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
                                                : "border-[#454740] bg-[#292b28] hover:border-[#454740]"
                                                }`}
                                        >
                                            <div className={`font-bold ${formData.wristbandColor === opt.color
                                                ? `text-${opt.color === '赤' ? 'red' : opt.color === '青' ? 'blue' : 'yellow'}-400`
                                                : "text-[#d9dace]"
                                                }`}>{opt.color}</div>
                                            <div className="text-xs text-[#b6b8ad]">{opt.desc}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="text-xs text-[#b6b8ad] mt-1 pl-2 border-l-2 border-[#454740]">
                                    <div><span className="text-red-300 font-bold">赤</span>: 学生時代バスケ経験 5年以上</div>
                                    <div><span className="text-blue-400 font-bold">青</span>: 学生時代バスケ経験 2年超 5年未満</div>
                                    <div><span className="text-yellow-400 font-bold">黄</span>: 学生時代バスケ経験 2年以下 (初心者など)</div>
                                </div>
                            </div>
                        </div>

                                        <div className="space-y-2">
                            <label className="text-xs font-medium text-[#b6b8ad] uppercase tracking-wider ml-1">チーム紹介・意気込み <span className="text-red-300 ml-1">*必須</span></label>
                            <textarea
                                placeholder="今回のチームの特徴並びに意気込み等ご記入ください。（開会式でのチーム紹介に活用させていただきます。できる限りご記入をお願いいたします。）"
                                value={formData.introduction}
                                onChange={(e) => setFormData({ ...formData, introduction: e.target.value })}
                                required
                                className="w-full bg-[#20211f] border border-[#454740] rounded-md p-3 min-h-[120px] focus:border-orange-500/50 focus:ring-orange-500/20 text-sm"
                            />
                        </div>

                        {activeProject?.hasClinic && (
                            <div className="space-y-4 p-5 bg-[#f18a5c]/10 border border-orange-500/30 rounded-xl">
                                <label className="text-sm font-extrabold text-[#f18a5c] flex items-center gap-2">
                                    {activeProject.clinicTitle || '🏀 バスケクリニックへの参加希望'}
                                </label>
                                <p className="text-xs text-[#b6b8ad] leading-relaxed whitespace-pre-line">
                                    {activeProject.clinicDescription}
                                </p>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-[#d9dace]">
                                        <input
                                            type="radio"
                                            name="clinicParticipation"
                                            checked={formData.clinicParticipation === true}
                                            onChange={() => setFormData({ ...formData, clinicParticipation: true, clinicCount: 1 })}
                                            className="w-4 h-4 text-[#f18a5c] border-[#454740] bg-[#292b28] focus:ring-orange-500"
                                        />
                                        クリニックに参加する
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-[#d9dace]">
                                        <input
                                            type="radio"
                                            name="clinicParticipation"
                                            checked={formData.clinicParticipation === false}
                                            onChange={() => setFormData({ ...formData, clinicParticipation: false, clinicCount: 0 })}
                                            className="w-4 h-4 text-[#f18a5c] border-[#454740] bg-[#292b28] focus:ring-orange-500"
                                        />
                                        参加しない
                                    </label>
                                </div>
                                {formData.clinicParticipation && (
                                    <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <label className="text-xs font-bold text-[#b6b8ad]">参加予定人数</label>
                                        <select
                                            value={formData.clinicCount}
                                            onChange={(e) => setFormData({ ...formData, clinicCount: parseInt(e.target.value, 10) })}
                                            className="bg-[#20211f] border border-[#454740] text-[#d9dace] text-sm rounded-md focus:ring-1 focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5 outline-none font-sans"
                                        >
                                            {Array.from({ length: activeProject.clinicLimit !== undefined ? activeProject.clinicLimit : 20 }, (_, i) => i + 1).map((n) => (
                                                <option key={n} value={n}>
                                                    {n} 名
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <p className="text-xs text-[#b6b8ad] leading-normal mt-2">
                                    ※チームの参加申し込み時点で参加人数等が決まっていない場合は、未選択のままでも登録可能です。参加・不参加および人数は、仮エントリー完了後にマイページよりいつでもご変更いただけます（メンバー確定時までに最終決定をお願いします）。
                                </p>
                            </div>
                        )}

                        <div className="space-y-4 pt-2">
                            <label className="text-xs font-medium text-[#b6b8ad] uppercase tracking-wider ml-1">参加同意 <span className="text-red-300 ml-1">*必須</span></label>
                            <div className="flex items-start space-x-3 p-4 bg-[#292b28] border border-[#454740] rounded-lg">
                                <input
                                    type="checkbox"
                                    id="beginnerFriendly"
                                    checked={formData.isBeginnerFriendlyAccepted}
                                    onChange={(e) => setFormData({ ...formData, isBeginnerFriendlyAccepted: e.target.checked })}
                                    required
                                    className="mt-1 w-5 h-5 rounded border-[#454740] bg-[#353731] text-[#f18a5c] focus:ring-orange-500/20"
                                />
                                <label htmlFor="beginnerFriendly" className="text-sm text-[#d9dace] cursor-pointer">
                                    ヴァンキーカップは初心者が楽しめる大会であることを理解してエントリーをする。
                                </label>
                            </div>
                        </div>

                        {!formData.existingUserId && (
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-[#b6b8ad] uppercase tracking-wider ml-1">ログイン設定 <span className="text-red-300 ml-1">*必須</span></label>
                                <Input
                                    type="password"
                                    placeholder="パスワード (PIN)"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                    className="bg-[#20211f] border-[#454740] focus:border-orange-500/50 focus:ring-orange-500/20 h-11"
                                />
                                <Input
                                    type="password"
                                    placeholder="パスワード (確認用)"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    required
                                    className="bg-[#20211f] border-[#454740] focus:border-orange-500/50 focus:ring-orange-500/20 h-11"
                                />
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500 text-center animate-in fade-in slide-in-from-top-2">
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        className={`w-full font-medium py-6 transition-all duration-300 ${(() => {
                            const selectedProject = projects.find(p => p.id === formData.projectId);
                            const isFull = selectedProject?.maxTeams && (selectedProject.currentEntryCount || 0) >= selectedProject.maxTeams;
                            const isWaitlistOff = selectedProject?.isWaitlistEnabled === false;
                            if (isFull && isWaitlistOff) {
                                return "bg-[#353731] text-[#b6b8ad] border border-[#454740] cursor-not-allowed";
                            }
                            return isFull
                                ? "bg-amber-700 hover:bg-amber-800 text-white shadow-none border border-amber-500/50"
                                : "bg-[#f18a5c] hover:bg-[#f6a078] text-white shadow-none"
                        })()
                            }`}
                        disabled={isLoading || (() => {
                            const selectedProject = projects.find(p => p.id === formData.projectId);
                            return selectedProject?.maxTeams && (selectedProject.currentEntryCount || 0) >= selectedProject.maxTeams && selectedProject.isWaitlistEnabled === false;
                        })()}
                    >
                        {isLoading ? (
                            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> 登録中...</>
                        ) : (() => {
                            const selectedProject = projects.find(p => p.id === formData.projectId);
                            const isFull = selectedProject?.maxTeams && (selectedProject.currentEntryCount || 0) >= selectedProject.maxTeams;
                            const isWaitlistOff = selectedProject?.isWaitlistEnabled === false;
                            if (isFull && isWaitlistOff) return "この大会は受付を終了しました";
                            return isFull ? "キャンセル待ちとしてエントリーする" : "上記の内容でエントリーする";
                        })()}
                    </Button>
                    </form>
            </Card>
        </div>

        <ConfirmDialog
            isOpen={confirmDialog.open}
            onClose={() => setConfirmDialog(d => ({ ...d, open: false }))}
            onConfirm={confirmDialog.onConfirm}
            title={confirmDialog.title}
            message={confirmDialog.message}
        />
    </>
    );
}

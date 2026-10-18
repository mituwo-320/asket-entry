"use client";
import { participantFetch } from "@/lib/participant-fetch";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Loader2, UserCheck, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ParticipantHeader, ParticipantFormTitle, ParticipantFormFooter, ParticipantSectionNav, ParticipantSectionTitle, ParticipantState } from "@/components/participant/ParticipantFrame";
import { ParticipantPassword, ParticipantAccountNote } from "@/components/participant/ParticipantPassword";
import { ParticipantRegistrationComplete } from "@/components/participant/ParticipantRegistrationComplete";
import { ParticipantStory } from "@/components/participant/ParticipantStory";
import { WristbandChoices, InsuranceChoices } from "@/components/participant/ParticipantChoices";
import { ParticipantConfirmDialog as ConfirmDialog } from "@/components/participant/ParticipantDialog";

export default function RegisterPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [teamId, setTeamId] = useState<string | null>(null);
    const [isWaitlist, setIsWaitlist] = useState(false);
    const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
    const [registeredPassword, setRegisteredPassword] = useState<string | null>(null);
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
            participantFetch("/api/settings").then(res => res.json()).catch(() => null),
            participantFetch("/api/projects/active").then(res => res.json()).catch(() => ({ projects: [] }))
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
        if (isLoading) return;
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
            const res = await participantFetch("/api/team/register", {
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

    const activeProject = projects.find(p => p.id === formData.projectId);

    if (!isSettingsLoaded) return <><ParticipantHeader backHref="/" backLabel="トップへ戻る" /><ParticipantState title="申し込み内容を準備しています" loading /></>;

    if (projects.length === 0) return <><ParticipantHeader backHref="/" backLabel="トップへ戻る" /><ParticipantState title="現在は募集期間外です" message="エントリーを受け付けている大会日程はありません。次回の受付開始までお待ちください。" href="/" linkLabel="トップへ戻る" /></>;

    if (teamId) {
        return <ParticipantRegistrationComplete
            teamName={formData.name}
            projectName={activeProject?.name}
            email={registeredEmail || formData.email}
            password={registeredPassword}
            existingAccount={!!formData.existingUserId}
            isWaitlist={isWaitlist}
            lineOpenChatLink={activeProject?.lineOpenChatLink || settings?.lineOpenChatLink}
        />;
    }

    return (
        <>
        <ParticipantHeader backHref="/" backLabel="トップへ戻る" />
        <main id="participant-main" tabIndex={-1} className="participant-form-page">
        <div className="participant-form-layout">
            <ParticipantStory eyebrow="MAKE IT A TEAM DAY." title={<>仲間と一緒に、<br />次のコートへ。</>} description="まずは代表者の方がチームを申し込み、登録後に他のメンバーを追加します。" guideTitle="申し込みから当日まで" steps={[
                { title: "チームを申し込む", description: "大会日程を選び、チームと代表者を登録します。" },
                { title: "メンバーを追加する", description: "登録後のマイページから、ほかの選手を追加。" },
                { title: "内容を確認して確定", description: "期限までにメンバーを確定し、請求書を確認。" },
            ]} />
            <Card className="participant-form-card">
                <ParticipantFormTitle eyebrow="REGISTRATION FORM" title="チームの参加申し込み" description="必須項目を入力してください。チーム名は登録後にも変更できます。" />
                <ParticipantSectionNav label="申し込みフォームの項目" items={[{ href: "#entry-team", label: "大会・チーム" }, { href: "#entry-leader", label: "代表者" }, { href: "#entry-details", label: "紹介・設定" }]} />
                <div className="participant-form-content">
                    {!formData.existingUserId && <ParticipantAccountNote title="登録済みのアカウントをお持ちの方"><p><Link href="/login">ログインしてから申し込む</Link>と、代表者情報を引き継げます。</p></ParticipantAccountNote>}
                    {activeProject?.entryEndDate && <p className="mb-6 text-sm text-[#ffd8a8]">登録期限：{new Date(activeProject.entryEndDate).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>}
                    {formData.existingUserId && (
                        <div className="bg-[#343b47] border border-[#707b8c] rounded-xl p-4 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#343b47] flex items-center justify-center shrink-0">
                                    <UserCheck className="w-5 h-5 text-[#e4e8ef]" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs text-[#c6cdd8] mb-0.5">現在ログイン中のアカウント</p>
                                    <p className="font-bold text-[#f7f7f5] truncate">{formData.representative} <span className="text-xs font-normal text-[#c6cdd8]">({formData.email})</span></p>
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
                                        async () => {
                                            try {
                                                const response = await fetch("/api/auth/logout", { method: "POST" });
                                                if (!response.ok) throw new Error("Logout failed");
                                            } catch { alert("ログアウトできませんでした。もう一度お試しください。"); return; }
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
                                className="text-xs border-[#707b8c] text-[#e4e8ef] hover:text-[#f7f7f5] hover:bg-[#343b47] shrink-0"
                            >
                                別のアカウントで登録
                            </Button>
                        </div>
                    )}

                <form onSubmit={handleSubmit} aria-busy={isLoading}><fieldset disabled={isLoading} className="space-y-5 participant-auth-fields">
                    <div className="space-y-4">
                        <ParticipantSectionTitle id="entry-team" number="01" title="大会・チーム情報" description="参加する日程と、チームの名前を教えてください。" />
                        <div className="space-y-2">
                            <label htmlFor="entry-project" className="text-sm font-medium text-[#e4e8ef] ml-1">参加する大会日程 <span className="text-red-300 ml-1">*必須</span></label>

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
                                            <div className="text-lg tabular-nums tracking-tighter shrink-0 flex items-baseline gap-1 bg-[#242830] px-3 py-1 rounded-md border border-[#707b8c]">
                                                <span className="text-red-300">{selectedProject.currentEntryCount || 0}</span>
                                                <span className="text-xs text-[#c6cdd8] font-normal">/ {selectedProject.maxTeams} チーム</span>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            })()}

                            <select id="entry-project"
                                value={formData.projectId}
                                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                                required
                                className="bg-[#15171d] border border-[#707b8c] text-[#e4e8ef] text-sm rounded-md focus:ring-1 focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5 h-11 outline-none"
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
                            <p className="text-xs text-[#c6cdd8] px-1">募集中の日程から選択してください。</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-[#c6cdd8] uppercase tracking-wider ml-1">チーム情報 <span className="text-red-300 ml-1">*必須</span></label>
                            <Input
                                label="チーム名（必須）" placeholder="チーム名"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                className="bg-[#15171d] border-[#707b8c] focus:border-orange-500/50 focus:ring-orange-500/20 h-11"
                            />
                            <p className="text-xs text-[#c6cdd8] px-1">※ チーム名は後から変更可能です</p>
                            <Input
                                label="チーム名のフリガナ（必須）" placeholder="チーム名 (フリガナ)"
                                value={formData.nameKana}
                                onChange={(e) => setFormData({ ...formData, nameKana: e.target.value })}
                                required
                                className="bg-[#15171d] border-[#707b8c] focus:border-orange-500/50 focus:ring-orange-500/20 h-11"
                            />
                        </div>

                        <div className="space-y-2 pt-2 pb-2">
                            <label className="text-xs font-medium text-[#c6cdd8] uppercase tracking-wider ml-1">予選抽選用 数字選択 <span className="text-red-300 ml-1">*必須</span></label>
                            <p className="text-xs text-[#c6cdd8] px-1 mb-1">※ 1〜{activeProject?.maxTeams || 16}の枠から好きな数字を選択してください。重複した場合はエントリー順により繰り上がりとなります。</p>
                            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                                {Array.from({ length: activeProject?.maxTeams || 16 }, (_, i) => i + 1).map(num => (
                                    <button type="button" key={num} aria-label={`予選抽選の数字 ${num}`} aria-pressed={formData.preliminaryNumber === num.toString()} onClick={() => setFormData({ ...formData, preliminaryNumber: num.toString() })} className="participant-number-choice">{num}</button>
                                ))}
                            </div>
                        </div>

                        {/* --- NEW: Section Break for Leader Info --- */}
                        <ParticipantSectionTitle id="entry-leader" number="02" title="代表者・メンバー情報" description="代表者ご自身を、1人目のメンバーとして登録します。" />

                        <div className="space-y-4 bg-[#15171d] border border-[#707b8c] rounded-xl p-5">
                            <h3 className="text-sm font-bold text-[#e4e8ef] mb-2">1人目のメンバー（リーダー情報）</h3>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-[#c6cdd8] uppercase tracking-wider ml-1">氏名 <span className="text-red-300 ml-1">*必須</span></label>
                                {formData.existingUserId ? (
                                    <div className="p-3 bg-[#242830] border border-[#707b8c] rounded-md text-[#e4e8ef] text-sm mt-2">
                                        <p className="text-xs text-[#c6cdd8] mb-1">リーダー (連絡担当者) 氏名</p>
                                        <p>{formData.representative}</p>
                                    </div>
                                ) : (
                                    <>
                                        <Input
                                            label="代表者氏名（必須）" placeholder="リーダー (連絡担当者) 氏名"
                                            value={formData.representative}
                                            onChange={(e) => setFormData({ ...formData, representative: e.target.value })}
                                            required
                                            className="bg-[#15171d] border-[#707b8c] focus:border-orange-500/50 focus:ring-orange-500/20 h-11"
                                        />
                                        <Input
                                            label="代表者氏名のフリガナ（必須）" placeholder="リーダー (連絡担当者) 氏名 (フリガナ)"
                                            value={formData.furigana}
                                            onChange={(e) => setFormData({ ...formData, furigana: e.target.value })}
                                            required
                                            className="bg-[#15171d] border-[#707b8c] focus:border-orange-500/50 focus:ring-orange-500/20 h-11"
                                        />
                                    </>
                                )}
                            </div>

                        </div>

                        {!formData.existingUserId ? (
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-[#c6cdd8] uppercase tracking-wider ml-1">連絡先 <span className="text-red-300 ml-1">*必須</span></label>
                                <Input
                                    type="email" autoComplete="email"
                                    label="メールアドレス（必須）" placeholder="メールアドレス"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                    className="bg-[#15171d] border-[#707b8c] focus:border-orange-500/50 focus:ring-orange-500/20 h-11"
                                />
                                <Input
                                    type="tel" autoComplete="tel"
                                    label="電話番号・緊急連絡先（必須）" placeholder="電話番号 (緊急連絡先)"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    required
                                    className="bg-[#15171d] border-[#707b8c] focus:border-orange-500/50 focus:ring-orange-500/20 h-11"
                                />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-[#c6cdd8] uppercase tracking-wider ml-1">連絡先</label>
                                <div className="p-3 bg-[#242830] border border-[#707b8c] rounded-md text-[#e4e8ef] text-sm">
                                    <p className="text-xs text-[#c6cdd8] mb-1">ログイン中のアカウントのアドレスを使用します</p>
                                    <p>{formData.email}</p>
                                </div>
                            </div>
                        )}

                        <InsuranceChoices value={formData.insurance} onChange={(insurance) => setFormData({ ...formData, insurance })} />
                        <div className="text-xs text-[#c6cdd8] leading-relaxed space-y-1">
                            <p>大会保険は、大会中のプレーや事故による根拠のあるケガが補償の対象です。腰痛や鞭打ちなどは対象外です。</p>
                            <p className="text-[#ffc0cc]">大会保険に加入する場合、別途{settings?.insuranceFee || 150}円が必要です。</p>
                        </div>
                        <WristbandChoices value={formData.wristbandColor} onChange={(wristbandColor) => setFormData({ ...formData, wristbandColor })} />

                        <ParticipantSectionTitle id="entry-details" number="03" title="チーム紹介・各種設定" description="紹介文や参加内容を確認し、申し込みを完了してください。" />
                        <div className="space-y-2">
                            <label htmlFor="entry-introduction" className="text-sm font-medium text-[#e4e8ef] ml-1">チーム紹介・意気込み <span className="text-red-300 ml-1">*必須</span></label>
                            <textarea id="entry-introduction"
                                placeholder="今回のチームの特徴並びに意気込み等ご記入ください。（開会式でのチーム紹介に活用させていただきます。できる限りご記入をお願いいたします。）"
                                value={formData.introduction}
                                onChange={(e) => setFormData({ ...formData, introduction: e.target.value })}
                                required
                                className="w-full bg-[#15171d] border border-[#707b8c] rounded-md p-3 min-h-[120px] focus:border-orange-500/50 focus:ring-orange-500/20 text-sm"
                            />
                        </div>

                        {activeProject?.hasClinic && (
                            <div className="space-y-4 p-5 bg-[#c52d40]/10 border border-orange-500/30 rounded-xl">
                                <label className="text-sm font-extrabold text-[#ffb2be] flex items-center gap-2">
                                    {activeProject.clinicTitle || '🏀 バスケクリニックへの参加希望'}
                                </label>
                                <p className="text-xs text-[#c6cdd8] leading-relaxed whitespace-pre-line">
                                    {activeProject.clinicDescription}
                                </p>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-[#e4e8ef]">
                                        <input
                                            type="radio"
                                            name="clinicParticipation"
                                            checked={formData.clinicParticipation === true}
                                            onChange={() => setFormData({ ...formData, clinicParticipation: true, clinicCount: 1 })}
                                            className="w-4 h-4 text-[#ffb2be] border-[#707b8c] bg-[#242830] focus:ring-orange-500"
                                        />
                                        クリニックに参加する
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-[#e4e8ef]">
                                        <input
                                            type="radio"
                                            name="clinicParticipation"
                                            checked={formData.clinicParticipation === false}
                                            onChange={() => setFormData({ ...formData, clinicParticipation: false, clinicCount: 0 })}
                                            className="w-4 h-4 text-[#ffb2be] border-[#707b8c] bg-[#242830] focus:ring-orange-500"
                                        />
                                        参加しない
                                    </label>
                                </div>
                                {formData.clinicParticipation && (
                                    <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <label htmlFor="entry-clinic-count" className="text-sm font-medium text-[#e4e8ef]">参加予定人数</label>
                                        <select id="entry-clinic-count"
                                            value={formData.clinicCount}
                                            onChange={(e) => setFormData({ ...formData, clinicCount: parseInt(e.target.value, 10) })}
                                            className="bg-[#15171d] border border-[#707b8c] text-[#e4e8ef] text-sm rounded-md focus:ring-1 focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5 outline-none font-sans"
                                        >
                                            {Array.from({ length: activeProject.clinicLimit !== undefined ? activeProject.clinicLimit : 20 }, (_, i) => i + 1).map((n) => (
                                                <option key={n} value={n}>
                                                    {n} 名
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <p className="text-xs text-[#c6cdd8] leading-normal mt-2">
                                    ※チームの参加申し込み時点で参加人数等が決まっていない場合は、未選択のままでも登録可能です。参加・不参加および人数は、仮エントリー完了後にマイページよりいつでもご変更いただけます（メンバー確定時までに最終決定をお願いします）。
                                </p>
                            </div>
                        )}

                        <div className="space-y-4 pt-2">
                            <label className="text-xs font-medium text-[#c6cdd8] uppercase tracking-wider ml-1">参加同意 <span className="text-red-300 ml-1">*必須</span></label>
                            <div className="flex items-start space-x-3 p-4 bg-[#242830] border border-[#707b8c] rounded-lg">
                                <input
                                    type="checkbox"
                                    id="beginnerFriendly"
                                    checked={formData.isBeginnerFriendlyAccepted}
                                    onChange={(e) => setFormData({ ...formData, isBeginnerFriendlyAccepted: e.target.checked })}
                                    required
                                    className="mt-1 w-5 h-5 rounded border-[#707b8c] bg-[#343b47] text-[#ffb2be] focus:ring-orange-500/20"
                                />
                                <label htmlFor="beginnerFriendly" className="text-sm text-[#e4e8ef] cursor-pointer">
                                    ヴァンキーカップは初心者が楽しめる大会であることを理解してエントリーをする。
                                </label>
                            </div>
                        </div>

                        {!formData.existingUserId && (
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-[#c6cdd8] uppercase tracking-wider ml-1">ログイン設定 <span className="text-red-300 ml-1">*必須</span></label>
                                <ParticipantPassword
                                    autoComplete="new-password"
                                    label="パスワード（必須）" placeholder="パスワード (PIN)"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                    className="bg-[#15171d] border-[#707b8c] focus:border-orange-500/50 focus:ring-orange-500/20 h-11"
                                />
                                <ParticipantPassword
                                    autoComplete="new-password"
                                    label="パスワードの確認（必須）" placeholder="パスワード (確認用)"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    required
                                    className="bg-[#15171d] border-[#707b8c] focus:border-orange-500/50 focus:ring-orange-500/20 h-11"
                                />
                            </div>
                        )}
                    </div>

                    {error && (
                        <div role="alert" className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500 text-center animate-in fade-in slide-in-from-top-2">
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
                                return "bg-[#343b47] text-[#c6cdd8] border border-[#707b8c] cursor-not-allowed";
                            }
                            return isFull
                                ? "bg-amber-700 hover:bg-amber-800 text-white shadow-none border border-amber-500/50"
                                : "bg-[#c52d40] hover:bg-[#ad1d31] text-white shadow-none"
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
                    </fieldset></form>
                </div>
                <ParticipantFormFooter />
            </Card>
        </div>
        </main>

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

"use client";
import { participantFetch } from "@/lib/participant-fetch";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { Card } from "@/components/ui/Card";
import { User, TeamEntryDetails, Project, Setting } from "@/lib/types";
import { useRouter } from "next/navigation";
import { Trophy, Plus, History, Calendar, LogOut, User as UserIcon, Settings, ArrowRight, AlertCircle, Printer, FileText } from "lucide-react";
import Link from "next/link";
import { ParticipantContactBoard } from "@/components/participant/ParticipantContactBoard";
import { ParticipantDialog } from "@/components/participant/ParticipantDialog";
import { ParticipantHeader, ParticipantHeading, ParticipantSectionNav, ParticipantState } from "@/components/participant/ParticipantFrame";

export default function UserDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [entries, setEntries] = useState<TeamEntryDetails[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [settings, setSettings] = useState<Partial<Setting>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [showChatBanner, setShowChatBanner] = useState(true);

    const [receiptModalEntryId, setReceiptModalEntryId] = useState<string | null>(null);
    const [receiptNameInput, setReceiptNameInput] = useState("");
    const [isEditingReceiptName, setIsEditingReceiptName] = useState(false);
    const [isIssuingReceipt, setIsIssuingReceipt] = useState(false);

    const handleIssueReceipt = async (customName?: string) => {
        if (!receiptModalEntryId) return;
        setIsIssuingReceipt(true);
        try {
            const res = await participantFetch('/api/team/receipt/issue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-team-id': receiptModalEntryId },
                body: JSON.stringify({ receiptName: customName || receiptNameInput })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setEntries(prev => prev.map(e =>
                    e.id === receiptModalEntryId
                    ? { ...e, receiptName: data.receiptName || undefined, receiptIssuedAt: data.receiptIssuedAt }
                    : e
                ));
                const issuedId = receiptModalEntryId;
                setReceiptModalEntryId(null);
                window.open(`/team/receipt?id=${issuedId}`, '_blank');
            } else {
                alert(data.error || "領収書の発行に失敗しました。");
            }
        } catch {
            alert("通信エラーが発生しました。");
        } finally {
            setIsIssuingReceipt(false);
        }
    };

    useEffect(() => {
        // 1. Check Session
        const storedUser = localStorage.getItem('currentUser');
        if (!storedUser) {
            router.push('/login');
            return;
        }

        let parsedUser;
        try {
            parsedUser = JSON.parse(storedUser);
        } catch {
            localStorage.removeItem('currentUser');
            router.push('/login');
            return;
        }

        // 2. Fetch Data
        const fetchData = async () => {
            try {
                const [entriesRes, projectsRes, settingsRes] = await Promise.all([
                    participantFetch(`/api/user/entries?userId=${parsedUser.id}`),
                    participantFetch('/api/admin/projects'),
                    participantFetch('/api/settings')
                ]);
                if (!entriesRes.ok) throw new Error("Failed to fetch entries");
                const entriesData = await entriesRes.json();
                const projectsData = await projectsRes.json();
                const settingsData = await settingsRes.json();

                if (entriesData.entries) setEntries(entriesData.entries);
                if (projectsData.projects) setProjects(projectsData.projects);
                if (settingsData) setSettings(settingsData);
            } catch (e) {
                console.error("Failed to fetch data", e);
                setLoadError(true);
            } finally {
                setUser(parsedUser);
                setIsLoading(false);
            }
        };
        fetchData();
    }, [router]);

    const handleLogout = async () => {
        try {
            const response = await fetch("/api/auth/logout", { method: "POST" });
            if (!response.ok) throw new Error("Logout failed");
        } catch { alert("ログアウトできませんでした。もう一度お試しください。"); return; }
        localStorage.removeItem('currentUser');
        router.push('/login');
    };

    if (isLoading) return <ParticipantState title="マイページを準備しています" loading />;
    if (!user) return null;
    if (loadError) return <><ParticipantHeader backHref="/" backLabel="トップへ戻る" /><ParticipantState title="参加状況を読み込めませんでした" message="時間をおいて、このページを再読み込みしてください。" href="/dashboard" linkLabel="マイページへ戻る" /></>;

    const activeEntries = entries.filter(entry => {
        const project = projects.find(p => p.id === entry.tournamentId);
        if (!project) return true;
        if (project.isActive === false) return false;

        // 本番日程（eventDate）がある場合、その日の終わり（23:59:59）まではアクティブとする
        if (project.eventDate) {
            const eventDate = new Date(project.eventDate);
            eventDate.setHours(23, 59, 59, 999);
            return new Date() <= eventDate;
        }

        return true;
    });

    const pastEntries = entries.filter(entry => {
        const project = projects.find(p => p.id === entry.tournamentId);
        if (!project) return false;
        if (project.isActive === false) return true;

        if (project.eventDate) {
            const eventDate = new Date(project.eventDate);
            eventDate.setHours(23, 59, 59, 999);
            return new Date() > eventDate;
        }

        return false;
    });

    return (
        <div className="min-h-screen">
            <ParticipantHeader backHref="/" backLabel="トップへ戻る" actions={<Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="w-4 h-4 mr-2" />ログアウト</Button>} />
            <main id="participant-main" tabIndex={-1} className="participant-main">
                <div>
                    <ParticipantHeading eyebrow="YOUR TEAM DESK" title="マイページ" description={`${user.name}さん、登録したチームと参加状況はこちらから確認できます。`}>
                        <div className="participant-heading-stats"><span>エントリー中<strong>{activeEntries.length}</strong>大会</span><span>メンバー未確定<strong>{activeEntries.filter(entry => entry.status === 'draft').length}</strong>チーム</span></div>
                    </ParticipantHeading>
                    <ParticipantSectionNav items={[{ href: "#current-tournaments", label: "参加する大会" }, { href: "#past-tournaments", label: "大会の履歴" }, { href: "#account-information", label: "代表者情報" }]} />

                    <ParticipantContactBoard collapsed={!showChatBanner} projects={projects} entries={entries} defaultLink={settings.lineOpenChatLink} onDismiss={() => setShowChatBanner(value => !value)} />

                    <div className="participant-desk-layout grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Right Column: Entries */}
                        <div className="participant-desk-content lg:col-span-2 space-y-8">
                            {/* Actions */}
                            <div id="current-tournaments" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-[#ffb2be]" />
                                    エントリー中の大会
                                </h3>
                                <Link href="/team/register" className="participant-inline-action"><Plus className="w-4 h-4" aria-hidden="true" />他の大会に新規エントリー</Link>
                            </div>

                            {activeEntries.some(entry => entry.status === 'draft') && (
                            <div className="participant-notice p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3 text-amber-400/90 text-sm">
                                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-amber-400 mb-1">【重要】メンバー登録のお願い</p>
                                    <p>以下の大会へのエントリーは完了していますが、まだメンバー登録が終わっていません。<br className="hidden sm:block" />各大会の<strong className="text-amber-300">エントリー期限を過ぎると、メンバーの追加や内容の編集ができなくなります</strong>ので、お早めに「チーム編集・メンバー追加」からご登録ください。</p>
                                </div>
                            </div>
                            )}

                            {/* Active Entries Section */}
                            <section>
                                {activeEntries.length === 0 ? (
                                    <Card className="p-12 border-dashed border-[#8791a1]/50 bg-[#242830]/20 text-center">
                                        <div className="w-20 h-20 bg-[#343b47]/50 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <Trophy className="w-10 h-10 text-[#bdc5d1]" />
                                        </div>
                                        <h4 className="text-xl font-medium text-[#edf0f5] mb-3">エントリーはありません</h4>
                                        <p className="text-[#c6cdd8] mb-8 leading-relaxed">
                                            現在開催中の大会にエントリーして、<br className="hidden sm:block" />
                                            チームの力を試しましょう！
                                        </p>
                                        <Link href="/team/register" className="participant-inline-action">大会を探す<ArrowRight aria-hidden="true" size={16} /></Link>
                                    </Card>
                                ) : (
                                    <div className="space-y-4">
                                        {activeEntries.map((entry) => (
                                            <div
                                                key={entry.id}
                                            >
                                                <Link href={`/team/dashboard?id=${entry.id}`} className="block group">
                                                    <Card className="participant-entry-card participant-entry-pass p-0 overflow-hidden hover:border-[#c47c89]/40 transition-all duration-300">
                                                        <div className="flex flex-col sm:flex-row relative">
                                                            {/* Status Indicator Bar */}
                                                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${entry.status === 'submitted' ? 'bg-emerald-500' : 'bg-amber-500'}`} />

                                                            <div className="participant-entry-main">
                                                                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                                                                    <div className="participant-entry-event">
                                                                        {entry.projectName || entry.tournamentId}
                                                                    </div>
                                                                    <div data-entry-state={entry.isWaitlist ? "waitlist" : entry.status} className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 ${entry.status === 'submitted' && !entry.isWaitlist
                                                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                                            : entry.isWaitlist
                                                                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                                                : 'bg-slate-500/10 text-[#c6cdd8] border border-[#a6afbe]/20'
                                                                        }`}>
                                                                        {entry.status === 'submitted' && !entry.isWaitlist ? (
                                                                            <span className="relative flex h-2 w-2">

                                                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                                            </span>
                                                                        ) : null}
                                                                        {entry.isWaitlist ? 'キャンセル待ち' : (entry.status === 'submitted' ? '登録完了' : '下書き')}
                                                                    </div>
                                                                </div>

                                                                <h4 className="participant-entry-team">
                                                                    {entry.teamName}
                                                                </h4>

                                                                <div className="participant-entry-meta">
                                                                    <span>
                                                                        <UserIcon className="w-4 h-4 text-[#ffb2be]" /> 選手 {entry.players?.length || 0}名
                                                                    </span>
                                                                    <span className="flex items-center gap-1.5">
                                                                        <History className="w-4 h-4" /> 登録日: {new Date(entry.createdAt).toLocaleDateString()}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="participant-entry-stub">
                                                                {entry.projectEndDate && (() => {
                                                                    const deadline = new Date(entry.projectEndDate);
                                                                    const diffTime = deadline.getTime() - new Date().getTime();
                                                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                                    return (
                                                                        <div className="participant-entry-deadline">
                                                                            {diffTime > 0 ? (
                                                                                <>締切まであと <span className="text-base font-bold text-amber-300">{diffDays}</span> 日<br /><span className="opacity-80 text-[10px]">({deadline.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })})</span></>
                                                                            ) : (
                                                                                <>募集終了<br /><span className="opacity-80 text-[10px]">編集できません</span></>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })()}
                                                                <div className="participant-entry-cta">
                                                                    {entry.status === "submitted" || (entry.projectEndDate && new Date(entry.projectEndDate) <= new Date()) ? "チーム・登録内容を確認" : "チーム編集・メンバー追加"} <ArrowRight aria-hidden="true" />
                                                                </div>
                                                                <span className="participant-print-bars" aria-hidden="true" />
                                                            </div>
                                                        </div>
                                                    </Card>
                                                </Link>
                                                {entry.status === 'submitted' && (
                                                    <div className="participant-entry-actions">
                                                        <Link href={`/team/invoice?id=${entry.id}`} target="_blank" className="bg-[#343b47] border border-[#8791a1] hover:bg-[#46505f] hover:border-[#c47c89]/50 text-[#e0e5ed] hover:text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm">
                                                            <Printer className="w-4 h-4" /> 請求書を確認・保存
                                                        </Link>
                                                        {entry.isPaid && (
                                                            <button
                                                                onClick={() => {
                                                                    if (entry.receiptViewedAt) {
                                                                        alert("すでに領収書は発行・確認済みです。二度目の発行はできません。");
                                                                    } else {
                                                                        setReceiptNameInput(entry.teamName);
                                                                        setIsEditingReceiptName(false);
                                                                        setReceiptModalEntryId(entry.id);
                                                                    }
                                                                }}
                                                                disabled={!!entry.receiptViewedAt}
                                                                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm ${
                                                                    entry.receiptViewedAt
                                                                        ? 'bg-[#343b47] text-[#bdc5d1] border border-[#8791a1] cursor-not-allowed'
                                                                        : 'bg-[#a62034] border border-[#c47c89] hover:bg-[#cb3146] text-white'
                                                                }`}
                                                            >
                                                                <FileText className="w-4 h-4" /> 領収書を発行
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>

                            {/* Past Entries Section */}
                            <section id="past-tournaments">
                                <div className="flex items-center gap-2 mb-4 text-[#c6cdd8] px-2">
                                    <History className="w-5 h-5" />
                                    <h3 className="text-sm font-bold uppercase tracking-wider">過去の大会履歴</h3>
                                </div>
                                {pastEntries.length === 0 ? (
                                    <div className="participant-history-empty p-8 rounded-xl text-center">
                                        <p>過去に参加した大会の履歴がありません</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {pastEntries.map((entry) => (
                                            <div
                                                key={entry.id}
                                            >
                                                <Link href={`/team/dashboard?id=${entry.id}`} className="block group">
                                                    <Card className="participant-entry-card participant-history-pass p-0 overflow-hidden hover:border-[#8791a1] transition-all duration-300 bg-[#15171d]/40">
                                                        <div className="flex flex-col sm:flex-row relative">
                                                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#46505f]" />
                                                            <div className="p-6 pl-8 flex-1">
                                                                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                                                                    <div className="text-xs font-medium px-2.5 py-1 rounded-md bg-white/5 text-[#c6cdd8] border border-white/10">
                                                                        {entry.projectName || entry.tournamentId}
                                                                    </div>
                                                                    <div className="text-xs font-bold px-3 py-1 rounded-full bg-[#343b47] text-[#c6cdd8] border border-[#8791a1]">
                                                                        大会終了
                                                                    </div>
                                                                </div>
                                                                <h4 className="text-2xl font-bold text-[#c6cdd8] group-hover:text-[#edf0f5] transition-colors mb-4">
                                                                    {entry.teamName}
                                                                </h4>
                                                                <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-[#bdc5d1]">
                                                                    <span className="flex items-center gap-1.5 bg-[#242830]/30 px-2.5 py-1 rounded-lg">
                                                                        <UserIcon className="w-4 h-4 text-[#bdc5d1]" /> 選手 {entry.players?.length || 0}名
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="px-4 pb-4 sm:p-6 flex flex-col items-center justify-center sm:justify-end sm:items-end sm:border-l border-white/5 mt-2 sm:mt-0">
                                                                 <div className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm font-bold text-[#bdc5d1] group-hover:text-[#c6cdd8] transition-colors">
                                                                    詳細を確認する <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </Card>
                                                 </Link>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        </div>
                        {/* Left Column: Profile */}
                        <div className="participant-desk-sidebar space-y-6">
                            <div>
                                <Card id="account-information" className="participant-account-card">
                                    <div className="participant-pass-label"><span>REPRESENTATIVE PASS</span><span>VANKY CUP</span></div>
                                    <div className="flex items-center gap-2 mb-6 text-[#c6cdd8]">
                                        <UserIcon className="w-5 h-5" />
                                        <h3 className="text-sm font-bold uppercase tracking-wider">アカウント情報</h3>
                                    </div>
                                    <dl className="space-y-5">
                                        <div>
                                            <dt className="text-xs text-[#bdc5d1] block mb-1">代表者氏名</dt>
                                            <dd className="text-white font-medium text-lg">{user.name}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs text-[#bdc5d1] block mb-1">メールアドレス</dt>
                                            <dd className="text-white font-medium">{user.email}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs text-[#bdc5d1] block mb-1">電話番号</dt>
                                            <dd className="text-white font-medium">{user.phone}</dd>
                                        </div>
                                    </dl>
                                    <div className="mt-8 pt-6 border-t border-[#8791a1]/50">
                                        <Button
                                            variant="outline"
                                            className="w-full text-sm flex items-center gap-2"
                                            onClick={() => setIsEditProfileOpen(true)}
                                        >
                                            <Settings className="w-4 h-4" /> プロフィール編集
                                        </Button>
                                    </div>
                                    <div className="participant-pass-footer" aria-hidden="true"><span>ONE TEAM.<br />ONE GOOD DAY.</span><span className="participant-print-bars" /></div>
                                </Card>
                            </div>

                            <aside className="participant-desk-booklet">
                                <span>REPRESENTATIVE / FIELD NOTES</span>
                                <h3>大会までの準備メモ</h3>
                                <ol><li><b>01</b><div><strong>メンバーをそろえる</strong><p>各チームのページから選手情報を追加します。</p></div></li><li><b>02</b><div><strong>内容を確定する</strong><p>登録期限とメンバーの内容を確認してください。</p></div></li><li><b>03</b><div><strong>書類を確認する</strong><p>確定後はチームのページから請求書を確認できます。</p></div></li></ol>
                            </aside>

                        </div>

                    </div>
                </div>
            </main>

            {/* Modals */}
            <EditProfileModal
                isOpen={isEditProfileOpen}
                onClose={() => setIsEditProfileOpen(false)}
                user={user}
                onSave={(updatedUser) => {
                    setUser(updatedUser);
                    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                }}
            />
            {receiptModalEntryId && (
                <ParticipantDialog isOpen onClose={() => setReceiptModalEntryId(null)} title="領収書の発行" description="発行前に宛名と保存についての注意事項を確認してください。" eyebrow="TEAM DOCUMENTS / RECEIPT" busy={isIssuingReceipt}>
                    <div className="space-y-5">

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
                        <div className="bg-[#15171d]/60 rounded-xl p-4 border border-[#8791a1]">
                            <p className="text-xs text-[#bdc5d1] mb-1 font-bold uppercase tracking-wider">領収書の宛名（御社名）</p>
                            {isEditingReceiptName ? (
                                <input
                                    type="text" aria-label="領収書の宛名" disabled={isIssuingReceipt}
                                    value={receiptNameInput}
                                    onChange={(e) => setReceiptNameInput(e.target.value)}
                                    className="w-full bg-[#242830] border border-[#c47c89] rounded-lg px-3 py-2 text-white text-base focus:outline-none focus:ring-2 focus:ring-orange-300"
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
                                disabled={isIssuingReceipt} onClick={() => setIsEditingReceiptName(true)}
                                className="text-sm text-[#ffb2be] hover:text-[#ffc7d0] underline"
                            >
                                宛名を変更する
                            </button>
                        ) : (
                            <button
                                disabled={isIssuingReceipt} onClick={() => setIsEditingReceiptName(false)}
                                className="text-sm text-[#c6cdd8] hover:text-[#e0e5ed] underline"
                            >
                                変更をキャンセル
                            </button>
                        )}

                        {/* アクションボタン */}
                        <div className="flex flex-col gap-2 pt-2">
                            <button
                                onClick={() => handleIssueReceipt(receiptNameInput || undefined)}
                                disabled={isIssuingReceipt}
                                className="w-full bg-[#a62034] hover:bg-[#cb3146] disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
                            >
                                {isIssuingReceipt ? '発行中...' : 'この内容で発行する'}
                            </button>
                            <button
                                disabled={isIssuingReceipt} onClick={() => !isIssuingReceipt && setReceiptModalEntryId(null)}
                                className="w-full bg-[#343b47] hover:bg-[#46505f] text-[#e0e5ed] font-bold py-3 rounded-xl transition-colors"
                            >
                                戻る（発行しない）
                            </button>
                        </div>
                    </div>
                </ParticipantDialog>
            )}
        </div>
    );
}

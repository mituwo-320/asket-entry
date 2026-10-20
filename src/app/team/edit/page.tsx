"use client";
import type { Setting } from "@/lib/types";
import { participantFetch } from "@/lib/participant-fetch";

import { useEffect, useState, Suspense } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ParticipantHeader, ParticipantHeading, ParticipantSectionNav, ParticipantSectionTitle, ParticipantFormFooter, ParticipantState } from "@/components/participant/ParticipantFrame";
import { TeamEntryDetails, User } from "@/lib/types";

function EditTeamContent() {
    const searchParams = useSearchParams();
    const entryId = searchParams.get('id');

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);
    const [, setSettings] = useState<Partial<Setting> | null>(null);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [savedSignature, setSavedSignature] = useState("");
    const [projectEndDate, setProjectEndDate] = useState<string | null>(null);
    const [teamStatus, setTeamStatus] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    const [, setTournamentId] = useState("");
    const [hasClinic, setHasClinic] = useState(false);
    const [clinicTitle, setClinicTitle] = useState("");
    const [clinicDescription, setClinicDescription] = useState("");
    const [clinicLimit, setClinicLimit] = useState(20);
    const [formData, setFormData] = useState({
        // Team
        teamName: "",
        teamNameKana: "",
        teamIntroduction: "",
        // Representative (User)
        representativeName: "",
        phone: "",
        // Representative (Player)
        repFurigana: "",
        wristbandColor: "赤",
        insurance: false,
        // Clinic
        clinicParticipation: null as boolean | null,
        clinicCount: 0,
    });

    useEffect(() => {
        participantFetch("/api/settings")
            .then(res => res.json())
            .then(data => {
                setSettings(data);
                setIsSettingsLoaded(true);
            })
            .catch(() => setIsSettingsLoaded(true));
    }, []);

    useEffect(() => {
        if (!entryId) return;

        const fetchData = async () => {
            try {
                const res = await participantFetch('/api/team/data', {
                    headers: { 'x-team-id': entryId }
                });

                if (!res.ok) throw new Error("Failed to fetch data");

                const data = await res.json();
                const team: TeamEntryDetails = data.teamEntry;
                setTournamentId(team.tournamentId);
                setHasClinic(team.hasClinic || false);
                setClinicTitle(team.clinicTitle || "");
                setClinicDescription(team.clinicDescription || "");
                setClinicLimit(team.clinicLimit !== undefined ? team.clinicLimit : 20);
                setProjectEndDate(team.projectEndDate || null);
                setTeamStatus(team.status);
                if (data.isAdmin !== undefined) setIsAdmin(data.isAdmin);
                const user: User | undefined = data.user;
                const repPlayer = team.players.find(p => p.isRepresentative) || team.players[0];

                const initialForm = {
                    teamName: team.teamName,
                    teamNameKana: team.teamNameKana || "",
                    teamIntroduction: team.teamIntroduction || "",
                    representativeName: repPlayer.name,
                    phone: user?.phone || "",
                    repFurigana: repPlayer.furigana,
                    wristbandColor: repPlayer.wristbandColor || "赤",
                    insurance: repPlayer.insurance,
                    clinicParticipation: team.clinicParticipation !== undefined && team.clinicParticipation !== null ? team.clinicParticipation : null,
                    clinicCount: team.clinicCount || 0,
                };
                setFormData(initialForm);
                setSavedSignature(JSON.stringify(initialForm));

            } catch (e) {
                console.error(e);
                setError("データの取得に失敗しました");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [entryId]);

    const isDirty = savedSignature !== JSON.stringify(formData);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving || !isDirty) return;
        setIsSaving(true);
        setError("");
        setSuccessMsg("");
        try {
            const res = await participantFetch('/api/team/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-team-id': entryId || ''
                },
                body: JSON.stringify(formData)
            });

            if (!res.ok) throw new Error("Update failed");

            setSuccessMsg("保存しました");
            setSavedSignature(JSON.stringify(formData));
        } catch {
            setError("保存に失敗しました");
        } finally {
            setIsSaving(false);
        }
    };

    if (!entryId) return <ParticipantState title="チームを選択してください" message="マイページから編集するチームを選んでください。" />;
    if (isLoading || !isSettingsLoaded) return <ParticipantState title="チーム情報を読み込んでいます" loading />;
    if (!teamStatus) return <ParticipantState title="チーム情報を読み込めませんでした" message="マイページに戻り、時間をおいてもう一度お試しください。" />;
    if (teamStatus === 'submitted' && !isAdmin) return <ParticipantState title="本エントリーは完了しています" message="メンバーを確定しているため、チーム設定を変更できません。変更が必要な場合は運営へお問い合わせください。" href={`/team/dashboard?id=${entryId}`} linkLabel="チームのページへ戻る" />;
    if (projectEndDate && new Date() > new Date(projectEndDate) && !isAdmin) return <ParticipantState title="編集受付期間が終了しました" message="登録内容の変更が必要な場合は、運営へお問い合わせください。" href={`/team/dashboard?id=${entryId}`} linkLabel="チームのページへ戻る" />;

    return (
        <>
            <ParticipantHeader backHref={`/team/dashboard?id=${entryId}`} backLabel="チームへ戻る" />
            <main id="participant-main" tabIndex={-1} className="participant-main participant-main-narrow">
                <ParticipantHeading eyebrow="TEAM SETTINGS" title="チーム設定" description="チームの紹介と代表者の連絡先を確認・変更できます。" />
                <ParticipantSectionNav label="チーム設定の項目" items={[{ href: "#edit-team-info", label: "チーム情報" }, { href: "#edit-representative-info", label: "代表者情報" }]} />
                <Card className="participant-settings-file">
                    <div className="participant-settings-file-cover"><span>TEAM FILE / UPDATE</span><p>チームの登録情報</p><span aria-hidden="true">VANKY CUP</span></div>
                    <div className="participant-settings-file-note"><p>チーム情報と代表者情報を、まとめて保存します。</p><span data-dirty={isDirty}>{isDirty ? "未保存の変更あり" : "変更はありません"}</span></div>
                    <form onSubmit={handleSubmit} aria-busy={isSaving}><fieldset disabled={isSaving} className="space-y-6 participant-settings-fields">

                        {/* Team Info */}
                        <div className="space-y-4">
                            <ParticipantSectionTitle id="edit-team-info" number="01" title="チーム情報" description="紹介文は大会当日のチーム紹介に使われます。" />

                            <div className="space-y-2">

                                <Input label="チーム名"
                                    value={formData.teamName}
                                    onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                                    required
                                    className="bg-[#15171d]/50 border-[#697383]"
                                />
                            </div>

                            <div className="space-y-2">

                                <Input label="チーム名 (フリガナ)"
                                    value={formData.teamNameKana}
                                    onChange={(e) => setFormData({ ...formData, teamNameKana: e.target.value })}
                                    required
                                    className="bg-[#15171d]/50 border-[#697383]"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="team-settings-introduction" className="text-sm font-medium text-[#c6cdd8]">チーム紹介・意気込み</label>
                                <textarea id="team-settings-introduction"
                                    value={formData.teamIntroduction}
                                    onChange={(e) => setFormData({ ...formData, teamIntroduction: e.target.value })}
                                    required
                                    className="w-full bg-[#15171d]/50 border border-[#697383] rounded-md p-3 min-h-[100px] focus:border-[#c47c89]/50 focus:ring-orange-300/20 text-sm text-[#edf0f5]"
                                />
                            </div>

                            {hasClinic && (
                                <div className="space-y-4 p-5 bg-[#34313a]/20 border border-[#c47c89]/30 rounded-xl">
                                    <label className="text-sm font-extrabold text-[#ffc7d0] flex items-center gap-2">
                                        {clinicTitle || '🏀 バスケクリニックへの参加希望'}
                                    </label>
                                    <p className="text-xs text-[#c6cdd8] leading-relaxed whitespace-pre-line">
                                        {clinicDescription}
                                    </p>
                                    <div className="flex flex-wrap gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-[#edf0f5]">
                                            <input
                                                type="radio"
                                                name="clinicParticipation"
                                                checked={formData.clinicParticipation === true}
                                                onChange={() => setFormData({ ...formData, clinicParticipation: true, clinicCount: 1 })}
                                                className="w-4 h-4 text-indigo-600 border-[#8791a1] bg-[#242830] focus:ring-orange-300"
                                            />
                                            クリニックに参加する
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-[#edf0f5]">
                                            <input
                                                type="radio"
                                                name="clinicParticipation"
                                                checked={formData.clinicParticipation === false}
                                                onChange={() => setFormData({ ...formData, clinicParticipation: false, clinicCount: 0 })}
                                                className="w-4 h-4 text-indigo-600 border-[#8791a1] bg-[#242830] focus:ring-orange-300"
                                            />
                                            参加しない
                                        </label>
                                    </div>
                                    {formData.clinicParticipation && (
                                        <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <label htmlFor="team-settings-clinic-count" className="text-sm font-medium text-[#c6cdd8]">参加予定人数</label>
                                            <select id="team-settings-clinic-count"
                                                value={formData.clinicCount}
                                                onChange={(e) => setFormData({ ...formData, clinicCount: parseInt(e.target.value, 10) })}
                                                className="bg-[#15171d] border border-[#697383] text-[#edf0f5] text-sm rounded-md focus:ring-1 focus:ring-orange-300 focus:border-[#c47c89] block w-full p-2.5 outline-none font-sans"
                                            >
                                                {Array.from({ length: clinicLimit }, (_, i) => i + 1).map((n) => (
                                                    <option key={n} value={n}>
                                                        {n} 名
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    <p className="text-[10px] text-[#bdc5d1] leading-normal mt-2">
                                        ※現時点で参加人数等が決まっていない場合は、未選択のままでも保存可能です。参加・不参加および人数は、仮エントリー完了後にマイページよりいつでもご変更いただけます（メンバー確定時までに最終決定をお願いします）。
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Representative Info */}
                        <div className="space-y-4 pt-4">
                            <ParticipantSectionTitle id="edit-representative-info" number="02" title="代表者情報" description="運営から連絡できる情報をご登録ください。" />

                            <div className="space-y-2">

                                <Input label="代表者氏名"
                                    value={formData.representativeName}
                                    onChange={(e) => setFormData({ ...formData, representativeName: e.target.value })}
                                    required
                                    className="bg-[#15171d]/50 border-[#697383]"
                                />
                            </div>

                            <div className="space-y-2">

                                <Input label="代表者氏名 (フリガナ)"
                                    value={formData.repFurigana}
                                    onChange={(e) => setFormData({ ...formData, repFurigana: e.target.value })}
                                    required
                                    className="bg-[#15171d]/50 border-[#697383]"
                                />
                            </div>

                            <div className="space-y-2">

                                <Input type="tel" autoComplete="tel" label="電話番号"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    required
                                    className="bg-[#15171d]/50 border-[#697383]"
                                />
                            </div>
                        </div>

                        {error && (
                            <div role="alert" className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 text-center">
                                {error}
                            </div>
                        )}

                        <div className="participant-settings-save">
                            <div><p role="status">{isSaving ? "変更を保存しています…" : isDirty ? "変更した内容は、まだ保存されていません。" : successMsg || "変更する項目を入力してください。"}</p><Link href={`/team/dashboard?id=${entryId}`}>チームのページへ戻る</Link></div>
                            <Button type="submit" disabled={isSaving || !isDirty} className="bg-[#a62034] hover:bg-[#cb3146] min-w-[120px]">
                                {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />保存中…</> : <><Save className="w-4 h-4 mr-2" /> 保存</>}
                            </Button>
                        </div>

                    </fieldset></form>
                    <ParticipantFormFooter />
                </Card>
            </main>
        </>
    );
}

export default function EditTeamPage() {
    return (
        <Suspense fallback={<ParticipantState title="チーム情報を読み込んでいます" loading />}>
            <EditTeamContent />
        </Suspense>
    );
}

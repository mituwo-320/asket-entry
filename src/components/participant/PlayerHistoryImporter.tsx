"use client";

import { useEffect, useRef, useState } from 'react';
import { Check, History, Loader2, Pencil, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PlayerForm } from '@/components/ui/PlayerForm';
import { ParticipantDialog } from './ParticipantDialog';
import { participantFetch } from '@/lib/participant-fetch';
import { MAX_HISTORY_IMPORT, playerIdentity, type HistoryPlayer, type HistoryTeam, type PlayerImportDraft } from '@/lib/player-history-types';
import type { Player } from '@/lib/types';

type ImportResult = { players: Player[]; added: number; skipped: number };
export function PlayerHistoryImporter({ entryId, currentPlayers, onClose, onComplete }: {
    entryId: string; currentPlayers: Player[]; onClose: () => void; onComplete: (result: ImportResult) => void;
}) {
    const [teams, setTeams] = useState<HistoryTeam[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);
    const [reload, setReload] = useState(0);
    const [teamId, setTeamId] = useState('');
    const [search, setSearch] = useState('');
    const [drafts, setDrafts] = useState<Map<string, PlayerImportDraft>>(() => new Map());
    const [editingId, setEditingId] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const pending = useRef(false);
    const editor = useRef<HTMLDivElement>(null);
    const editButtons = useRef(new Map<string, HTMLButtonElement>());
    const lastEdited = useRef<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        participantFetch('/api/player/history', { headers: { 'x-team-id': entryId }, signal: controller.signal })
            .then(async response => {
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || '過去のメンバーを読み込めませんでした。');
                if (!controller.signal.aborted) { setTeams(data.teams); setLoadFailed(false); }
            }).catch(() => { if (!controller.signal.aborted) setLoadFailed(true); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [entryId, reload]);

    useEffect(() => {
        if (editingId) editor.current?.querySelector('input')?.focus();
        else if (lastEdited.current) editButtons.current.get(lastEdited.current)?.focus();
    }, [editingId]);

    const team = teams.find(item => item.id === teamId) || teams[0];
    const query = search.normalize('NFKC').replace(/\s+/g, '').toLocaleLowerCase('ja-JP');
    const visible = (team?.players || []).filter(player => (player.name + player.furigana).normalize('NFKC').replace(/\s+/g, '').toLocaleLowerCase('ja-JP').includes(query));
    const selected = Array.from(drafts.values());
    const currentNames = new Set(currentPlayers.map(playerIdentity));
    const isRegistered = (player: HistoryPlayer) => player.alreadyAdded || currentNames.has(playerIdentity(player));
    const selectedElsewhere = (player: HistoryPlayer) => selected.some(draft => draft.sourcePlayerId !== player.id && playerIdentity(draft) === playerIdentity(player));
    const toDraft = (player: HistoryPlayer): PlayerImportDraft => ({ sourcePlayerId: player.id, name: player.name, furigana: player.furigana, insurance: player.insurance, wristbandColor: ['赤', '青', '黄'].includes(player.wristbandColor || '') ? player.wristbandColor! : '赤' });
    const toggle = (player: HistoryPlayer) => {
        setError('');
        setDrafts(previous => {
            const next = new Map(previous);
            if (next.has(player.id)) next.delete(player.id);
            else if (next.size < MAX_HISTORY_IMPORT) next.set(player.id, toDraft(player));
            return next;
        });
    };
    const edit = (player: HistoryPlayer) => {
        if (!drafts.get(player.id) && selected.length >= MAX_HISTORY_IMPORT) return;
        setDrafts(previous => new Map(previous).set(player.id, previous.get(player.id) || toDraft(player)));
        lastEdited.current = player.id;
        setEditingId(player.id);
        setError('');
    };
    const selectVisible = () => {
        setDrafts(previous => {
            const next = new Map(previous);
            const names = new Set([...currentNames, ...Array.from(next.values()).map(playerIdentity)]);
            for (const player of visible) {
                if (next.size >= MAX_HISTORY_IMPORT) break;
                if (!isRegistered(player) && !next.has(player.id) && !names.has(playerIdentity(player))) { next.set(player.id, toDraft(player)); names.add(playerIdentity(player)); }
            }
            return next;
        });
        setError('');
    };
    const add = async () => {
        if (pending.current || !selected.length) return;
        if (selected.some(player => !player.name.trim() || !player.furigana.trim())) { setError('氏名とフリガナを確認してください。「編集」から修正できます。'); return; }
        pending.current = true; setSaving(true); setError('');
        try {
            const response = await participantFetch('/api/player/history', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-team-id': entryId }, body: JSON.stringify({ players: selected }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || '追加できませんでした。もう一度お試しください。');
            onComplete(data as ImportResult);
        } catch (failure) { setError(failure instanceof Error ? failure.message : '追加できませんでした。選択と編集内容は残っています。'); }
        finally { pending.current = false; setSaving(false); }
    };
    const editing = editingId ? drafts.get(editingId) : undefined;

    return <ParticipantDialog isOpen onClose={onClose} title={editing ? '引用するメンバーを編集' : '過去のメンバーから追加'} description={editing ? '今回追加する情報だけを変更します。引用元のチームには反映されません。' : '以前登録したチームから選んで、まとめて追加できます。'} eyebrow="TEAM ROSTER / MEMBER ARCHIVE" busy={saving}>
        {editing && editingId ? <div ref={editor}>
            <p className="participant-history-note">編集を反映した後、一覧の「まとめて追加」で登録します。</p>
            <PlayerForm key={editingId} initialData={{ id: editingId, name: editing.name, furigana: editing.furigana, insurance: editing.insurance, wristbandColor: editing.wristbandColor, isRepresentative: false }} submitLabel="変更を反映" cancelLabel="一覧へ戻る" onSave={player => {
                setDrafts(previous => new Map(previous).set(editingId, { sourcePlayerId: editingId, name: player.name, furigana: player.furigana, insurance: player.insurance, wristbandColor: player.wristbandColor || '赤' }));
                setEditingId(null);
            }} onCancel={() => setEditingId(null)} />
        </div> : loading ? <p role="status" className="participant-history-state"><Loader2 className="animate-spin" aria-hidden="true" />以前のチームを読み込んでいます…</p>
        : loadFailed ? <div className="participant-history-state"><p role="alert">過去のメンバーを読み込めませんでした。</p><Button variant="outline" onClick={() => { setLoading(true); setReload(value => value + 1); }}>もう一度読み込む</Button></div>
        : !teams.length ? <div className="participant-history-state"><History size={30} aria-hidden="true" /><h3>引用できるメンバーがまだいません</h3><p>このアカウントで別のチームに登録したメンバーが、ここに表示されます。</p><Button variant="outline" onClick={onClose}>選手リストへ戻る</Button></div>
        : <>
            <div className="participant-history-note"><Users size={18} aria-hidden="true" /><p>自分が登録したチームのみ表示します。<strong>保険・リストバンドは今回の参加内容に合わせて確認してください。</strong>代表者も通常の選手として追加します。</p></div>
            <fieldset disabled={saving} className="space-y-4">
                <legend className="participant-sr-only">引用するメンバーを選択</legend>
                <label className="participant-history-team-label">引用元のチーム
                    <select value={team?.id || ''} onChange={event => { setTeamId(event.target.value); setSearch(''); }}>
                        {teams.map(item => <option key={item.id} value={item.id}>{item.projectName} / {item.teamName}（{new Date(item.createdAt).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })}）</option>)}
                    </select>
                </label>
                <Input label="メンバーを検索" placeholder="氏名・フリガナ" value={search} onChange={event => setSearch(event.target.value)} />
                <div className="participant-history-list-heading"><span><Search size={14} aria-hidden="true" />{visible.length}人を表示</span><button type="button" onClick={selectVisible} disabled={!visible.length || selected.length >= MAX_HISTORY_IMPORT}>表示中をまとめて選択</button></div>
                <ul className="participant-history-list">
                    {visible.map(player => {
                        const draft = drafts.get(player.id);
                        const registered = isRegistered(player);
                        const elsewhere = !draft && selectedElsewhere(player);
                        const disabled = registered || elsewhere || (!draft && selected.length >= MAX_HISTORY_IMPORT);
                        return <li key={player.id} data-selected={!!draft} className="participant-history-player">
                            <label className="participant-history-player-choice"><input type="checkbox" aria-label={`${player.name}を選択`} checked={!!draft} disabled={disabled} onChange={() => toggle(player)} />
                                <span><strong>{draft?.name || player.name}</strong><small>{draft?.furigana || player.furigana || 'フリガナ未登録'}</small><small>リストバンド：{draft?.wristbandColor || player.wristbandColor || '赤'} ／ 保険：{(draft?.insurance ?? player.insurance) ? '加入' : '加入しない'}</small></span>
                            </label>
                            {registered || elsewhere ? <span className="participant-history-added"><Check size={14} aria-hidden="true" />{registered ? '追加済み' : '選択済み'}</span> : <button ref={element => { if (element) editButtons.current.set(player.id, element); else editButtons.current.delete(player.id); }} type="button" aria-label={`${player.name}を編集して追加`} onClick={() => edit(player)} disabled={disabled}><Pencil size={14} aria-hidden="true" />編集</button>}
                        </li>;
                    })}
                </ul>
                {!visible.length ? <p className="participant-history-empty">該当するメンバーがいません。検索条件を変えてください。</p> : null}
            </fieldset>
            <div className="participant-history-selection"><strong>{selected.length}人を選択中</strong><span>チームを切り替えても選択は残ります。一度に{MAX_HISTORY_IMPORT}人まで。</span>{selected.length ? <button type="button" onClick={() => { setDrafts(new Map()); setError(''); }} disabled={saving}>選択を解除</button> : null}</div>
            {selected.length ? <ul className="participant-history-selected-names" aria-label="追加するメンバー">{selected.map(draft => <li key={draft.sourcePlayerId}><button type="button" disabled={saving} aria-label={`${draft.name}の選択を解除`} onClick={() => setDrafts(previous => { const next = new Map(previous); next.delete(draft.sourcePlayerId); return next; })}>{draft.name}<span aria-hidden="true">×</span></button></li>)}</ul> : null}
            {error ? <p role="alert" className="participant-feedback participant-feedback-error">{error}</p> : null}
            <div className="participant-history-actions"><Button type="button" variant="outline" onClick={onClose} disabled={saving}>キャンセル</Button><Button type="button" onClick={add} disabled={saving || !selected.length}>{saving ? <><Loader2 size={16} className="animate-spin" aria-hidden="true" />追加中…</> : `${selected.length}人をまとめて追加`}</Button></div>
            <p className="participant-history-footnote">同じ氏名・フリガナの登録は重複として扱います。別人の場合は通常の「選手を追加」を使ってください。</p>
        </>}
    </ParticipantDialog>;
}

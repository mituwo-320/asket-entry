"use client";

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, History, Loader2, Pencil, Search, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PlayerForm } from '@/components/ui/PlayerForm';
import { ParticipantDialog } from './ParticipantDialog';
import { participantFetch } from '@/lib/participant-fetch';
import { MAX_HISTORY_IMPORT, playerIdentity, type HistoryPlayer, type HistoryTeam, type PlayerImportDraft } from '@/lib/player-history-types';
import type { Player } from '@/lib/types';

const searchKey = (value: string) => value.normalize('NFKC').replace(/\s+/g, '').toLocaleLowerCase('ja-JP').replace(/[ぁ-ゖ]/g, character => String.fromCharCode(character.charCodeAt(0) + 0x60));

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
    const [view, setView] = useState<'browse' | 'review'>('browse');
    const [discardPrompt, setDiscardPrompt] = useState(false);
    const [drafts, setDrafts] = useState<Map<string, PlayerImportDraft>>(() => new Map());
    const [editingId, setEditingId] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const pending = useRef(false);
    const editor = useRef<HTMLDivElement>(null);
    const reviewHeading = useRef<HTMLHeadingElement>(null);
    const continueButton = useRef<HTMLButtonElement>(null);
    const feedback = useRef<HTMLParagraphElement>(null);
    const searchInput = useRef<HTMLInputElement>(null);
    const returnFocus = useRef<HTMLElement | null>(null);
    const focusAfterRemoval = useRef(false);
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
        if (discardPrompt) { continueButton.current?.focus(); return; }
        if (returnFocus.current?.isConnected) { returnFocus.current.focus(); returnFocus.current = null; return; }
        if (editingId) editor.current?.querySelector('input')?.focus();
        else if (lastEdited.current) editButtons.current.get(lastEdited.current)?.focus();
        else if (view === 'review') reviewHeading.current?.focus();
    }, [editingId, view, discardPrompt]);

    useEffect(() => { if (error) feedback.current?.focus(); }, [error]);
    useEffect(() => {
        if (focusAfterRemoval.current) { reviewHeading.current?.focus(); focusAfterRemoval.current = false; }
    }, [drafts]);

    const team = teams.find(item => item.id === teamId) || teams[0];
    const sources = new Map(teams.flatMap(item => item.players.map(player => [player.id, { player, team: item }] as const)));
    const query = searchKey(search);
    const visible = (team?.players || []).filter(player => {
        const draft = drafts.get(player.id);
        return searchKey(player.name + player.furigana + (draft ? draft.name + draft.furigana : '')).includes(query);
    });
    const selected = Array.from(drafts.values());
    const currentNames = new Set(currentPlayers.map(playerIdentity));
    const isRegistered = (player: HistoryPlayer) => player.alreadyAdded || currentNames.has(playerIdentity(player));
    const selectedElsewhere = (player: HistoryPlayer) => selected.some(draft => draft.sourcePlayerId !== player.id && playerIdentity(draft) === playerIdentity(player));
    const toDraft = (player: HistoryPlayer): PlayerImportDraft => ({ sourcePlayerId: player.id, name: player.name, furigana: player.furigana, insurance: player.insurance, wristbandColor: ['赤', '青', '黄'].includes(player.wristbandColor || '') ? player.wristbandColor! : '赤' });
    const isEdited = (draft: PlayerImportDraft) => {
        const source = sources.get(draft.sourcePlayerId)?.player;
        return source && (draft.name !== source.name || draft.furigana !== source.furigana || draft.insurance !== source.insurance || draft.wristbandColor !== toDraft(source).wristbandColor);
    };
    const remove = (id: string) => { focusAfterRemoval.current = view === 'review'; setDrafts(previous => { const next = new Map(previous); next.delete(id); return next; }); setError(''); };
    const changeView = (next: 'browse' | 'review') => { lastEdited.current = null; setView(next); setError(''); };
    const requestClose = () => {
        if (pending.current) return;
        if (discardPrompt) { setDiscardPrompt(false); return; }
        if (drafts.size) { returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setDiscardPrompt(true); }
        else onClose();
    };
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
        if (selected.some(player => !player.name.trim() || !player.furigana.trim())) { setView('review'); setError('氏名とフリガナを確認してください。「編集」から修正できます。'); return; }
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

    return <ParticipantDialog isOpen onClose={requestClose} title={discardPrompt ? '追加前の内容が残っています' : editing ? '引用するメンバーを編集' : '過去のメンバーから追加'} description={discardPrompt ? '選択・編集した内容はまだ登録されていません。' : editing ? '今回追加する情報だけを変更します。引用元のチームには反映されません。' : '以前登録したチームから選んで、まとめて追加できます。'} eyebrow="TEAM ROSTER / MEMBER ARCHIVE" busy={saving}>
        {discardPrompt ? <div className="participant-history-discard">
            <p>{selected.length}人の選択・編集内容を破棄して閉じますか？</p>
            <div className="participant-dialog-actions"><Button ref={continueButton} type="button" onClick={() => setDiscardPrompt(false)}>作業を続ける</Button><Button variant="outline" type="button" onClick={onClose}>破棄して閉じる</Button></div>
        </div> : null}
        <div hidden={discardPrompt} className="participant-history-importer">
        {editing && editingId ? <div ref={editor}>
            <p className="participant-history-note">今回追加する情報を修正します。「変更を反映」で一覧へ戻り、まとめて登録できます。</p>
            <PlayerForm key={editingId} initialData={{ id: editingId, name: editing.name, furigana: editing.furigana, insurance: editing.insurance, wristbandColor: editing.wristbandColor, isRepresentative: false }} submitLabel="変更を反映" cancelLabel="一覧へ戻る" onSave={player => {
                setDrafts(previous => new Map(previous).set(editingId, { sourcePlayerId: editingId, name: player.name, furigana: player.furigana, insurance: player.insurance, wristbandColor: player.wristbandColor || '赤' }));
                setEditingId(null);
            }} onCancel={() => setEditingId(null)} />
        </div> : loading ? <p role="status" className="participant-history-state"><Loader2 className="animate-spin" aria-hidden="true" />以前のチームを読み込んでいます…</p>
        : loadFailed ? <div className="participant-history-state"><p role="alert">過去のメンバーを読み込めませんでした。</p><Button variant="outline" onClick={() => { setLoading(true); setReload(value => value + 1); }}>もう一度読み込む</Button></div>
        : !teams.length ? <div className="participant-history-state"><History size={30} aria-hidden="true" /><h3>引用できるメンバーがまだいません</h3><p>このアカウントで別のチームに登録したメンバーが、ここに表示されます。</p><Button variant="outline" onClick={onClose}>選手リストへ戻る</Button></div>
        : <>
            <div className="participant-history-note"><Users size={18} aria-hidden="true" /><p>自分が登録したチームのみ表示します。<strong>保険・リストバンドは今回の参加内容に合わせて確認してください。</strong>代表者も通常の選手として追加します。</p></div>
            <div className="participant-history-views" role="group" aria-label="メンバーの表示切り替え">
                <button type="button" aria-pressed={view === 'browse'} disabled={saving} onClick={() => changeView('browse')}><Search size={16} aria-hidden="true" />メンバーを探す</button>
                <button type="button" aria-pressed={view === 'review'} disabled={saving} onClick={() => changeView('review')}><Users size={16} aria-hidden="true" />選択中を確認<span>{selected.length}</span></button>
            </div>
            {view === 'browse' ? <fieldset disabled={saving} className="space-y-4">
                <legend className="participant-sr-only">引用するメンバーを選択</legend>
                <label className="participant-history-team-label">引用元のチーム
                    <select value={team?.id || ''} onChange={event => { setTeamId(event.target.value); setSearch(''); }}>
                        {teams.map(item => <option key={item.id} value={item.id}>{item.projectName} / {item.teamName}（{new Date(item.createdAt).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })}）</option>)}
                    </select>
                </label>
                <div className="participant-history-search"><Input ref={searchInput} label="メンバーを検索" placeholder="氏名・フリガナ（ひらがなでも検索）" value={search} onChange={event => setSearch(event.target.value)} />{search ? <button type="button" aria-label="検索をクリア" onClick={() => { setSearch(''); searchInput.current?.focus(); }}><X size={17} aria-hidden="true" /></button> : null}</div>
                <div className="participant-history-list-heading"><span><Search size={14} aria-hidden="true" />{visible.length}人を表示</span><button type="button" onClick={selectVisible} disabled={!visible.some(player => !isRegistered(player) && !drafts.has(player.id) && !selectedElsewhere(player)) || selected.length >= MAX_HISTORY_IMPORT}>表示中をまとめて選択</button></div>
                <ul className="participant-history-list">
                    {visible.map(player => {
                        const draft = drafts.get(player.id);
                        const registered = isRegistered(player);
                        const elsewhere = !draft && selectedElsewhere(player);
                        const disabled = registered || elsewhere || (!draft && selected.length >= MAX_HISTORY_IMPORT);
                        return <li key={player.id} data-selected={!!draft} className="participant-history-player">
                            <label className="participant-history-player-choice"><input type="checkbox" aria-label={`${player.name}を選択`} checked={!!draft} disabled={disabled} onChange={() => toggle(player)} />
                                <span><strong>{draft?.name || player.name}{draft && isEdited(draft) ? <em className="participant-history-edited">変更あり</em> : null}</strong><small>{draft?.furigana || player.furigana || 'フリガナ未登録'}</small><small>リストバンド：{draft?.wristbandColor || player.wristbandColor || '赤'} ／ 保険：{(draft?.insurance ?? player.insurance) ? '加入' : '加入しない'}</small></span>
                            </label>
                            {registered || elsewhere ? <span className="participant-history-added"><Check size={14} aria-hidden="true" />{registered ? '追加済み' : '選択済み'}</span> : <button ref={element => { if (element) editButtons.current.set(player.id, element); else editButtons.current.delete(player.id); }} type="button" aria-label={`${player.name}を編集して追加`} onClick={() => edit(player)} disabled={disabled}><Pencil size={14} aria-hidden="true" />編集</button>}
                        </li>;
                    })}
                </ul>
                {!visible.length ? <p className="participant-history-empty">該当するメンバーがいません。検索条件を変えてください。</p> : null}
            </fieldset> : <section aria-labelledby="history-review-heading">
                <h3 id="history-review-heading" ref={reviewHeading} tabIndex={-1} className="participant-history-review-heading">追加するメンバーを確認</h3>
                <p className="participant-history-review-help">チームをまたいで選んだ人も、ここでまとめて編集できます。</p>
                {selected.length ? <>
                    <dl className="participant-history-totals"><div><dt>追加予定</dt><dd>{selected.length}<small>人</small></dd></div><div><dt>保険加入</dt><dd>{selected.filter(player => player.insurance).length}<small>人</small></dd></div><div><dt>保険なし</dt><dd>{selected.filter(player => !player.insurance).length}<small>人</small></dd></div></dl>
                    <ul className="participant-history-review-list" aria-label="追加予定のメンバー">
                        {selected.map(draft => {
                            const source = sources.get(draft.sourcePlayerId);
                            return <li key={draft.sourcePlayerId} className="participant-history-review-card">
                                <div className="participant-history-review-person"><strong>{draft.name}{isEdited(draft) ? <em className="participant-history-edited">変更あり</em> : null}</strong><span>{draft.furigana || 'フリガナの入力が必要です'}</span><small>{source?.team.projectName} / {source?.team.teamName}</small></div>
                                <div className="participant-history-review-details"><span>リストバンド：{draft.wristbandColor}</span><span>保険：{draft.insurance ? '加入' : '加入しない'}</span></div>
                                <div className="participant-history-review-controls"><button type="button" ref={element => { if (element) editButtons.current.set(draft.sourcePlayerId, element); else editButtons.current.delete(draft.sourcePlayerId); }} disabled={saving} aria-label={`${draft.name}を編集して追加`} onClick={() => { if (source) edit(source.player); }}><Pencil size={15} aria-hidden="true" />編集</button><button type="button" disabled={saving} aria-label={`${draft.name}の選択を解除`} onClick={() => remove(draft.sourcePlayerId)}><X size={15} aria-hidden="true" />外す</button></div>
                            </li>;
                        })}
                    </ul>
                </> : <div className="participant-history-state"><Users size={28} aria-hidden="true" /><p>まだメンバーが選ばれていません。</p><Button type="button" variant="outline" onClick={() => changeView('browse')}>チームからメンバーを選ぶ</Button></div>}
            </section>}
            <div className="participant-history-selection"><strong role="status" aria-live="polite" aria-atomic="true">{selected.length}人を選択中</strong><span>チームを切り替えても選択は残ります。一度に{MAX_HISTORY_IMPORT}人まで。</span>{selected.length ? <button type="button" onClick={() => { setDrafts(new Map()); setError(''); }} disabled={saving}>選択を解除</button> : null}</div>
            {selected.length && view === 'browse' ? <ul className="participant-history-selected-names" aria-label="追加するメンバー">{selected.map(draft => <li key={draft.sourcePlayerId}><button type="button" disabled={saving} aria-label={`${draft.name}の選択を解除`} onClick={() => remove(draft.sourcePlayerId)}>{draft.name}<span aria-hidden="true">×</span></button></li>)}</ul> : null}
            {error ? <p ref={feedback} tabIndex={-1} role="alert" className="participant-feedback participant-feedback-error">{error}</p> : null}
            <div className="participant-history-actions"><div className="participant-history-action-summary"><strong>{selected.length}人を追加予定</strong><span>{view === 'browse' ? '選択中の一覧で内容を確認できます' : '元のチームの情報は変更しません'}</span></div><div className="participant-history-action-buttons">{view === 'browse' && selected.length ? <Button type="button" variant="outline" onClick={() => changeView('review')} disabled={saving}>選択内容を確認</Button> : <Button type="button" variant="outline" onClick={view === 'review' ? () => changeView('browse') : requestClose} disabled={saving}>{view === 'review' ? <><ArrowLeft size={16} aria-hidden="true" />選択に戻る</> : 'キャンセル'}</Button>}<Button type="button" onClick={add} disabled={saving || !selected.length}>{saving ? <><Loader2 size={16} className="animate-spin" aria-hidden="true" />追加中…</> : `${selected.length}人をまとめて追加`}</Button></div></div>
            <p className="participant-history-footnote">同じ氏名・フリガナの登録は重複として扱います。別人の場合は通常の「選手を追加」を使ってください。</p>
        </>}
        </div>
    </ParticipantDialog>;
}

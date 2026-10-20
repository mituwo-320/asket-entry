"use client";

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { PlayerImportDraft } from '@/lib/player-history-types';

export type MemberParticipationPatch = Partial<Pick<PlayerImportDraft, 'insurance' | 'wristbandColor'>>;

export function PlayerHistoryBulkEditor({ players, onApply, onCancel }: {
    players: PlayerImportDraft[];
    onApply: (patch: MemberParticipationPatch) => void;
    onCancel: () => void;
}) {
    const [insurance, setInsurance] = useState('keep');
    const [wristband, setWristband] = useState('keep');
    const [confirming, setConfirming] = useState(false);
    const firstField = useRef<HTMLSelectElement>(null);
    const heading = useRef<HTMLHeadingElement>(null);
    const applied = useRef(false);
    const patch: MemberParticipationPatch = {
        ...(insurance === 'keep' ? {} : { insurance: insurance === 'yes' }),
        ...(wristband === 'keep' ? {} : { wristbandColor: wristband }),
    };
    const changedCount = players.filter(player => (patch.insurance !== undefined && patch.insurance !== player.insurance) || (patch.wristbandColor !== undefined && patch.wristbandColor !== player.wristbandColor)).length;
    const hasSetting = insurance !== 'keep' || wristband !== 'keep';

    useEffect(() => { if (confirming) heading.current?.focus(); else firstField.current?.focus(); }, [confirming]);

    return <section className="participant-history-bulk">
        <h3 ref={heading} tabIndex={-1}>{confirming ? '反映する内容を確認' : '選択中の参加内容をまとめて変更'}</h3>
        <p>対象は、追加予定として選択している<strong>{players.length}人全員</strong>です。変更する項目だけ選んでください。</p>
        {confirming ? <>
            <dl className="participant-history-bulk-summary">
                <div><dt>スポーツ保険</dt><dd>{insurance === 'keep' ? '変更しない' : insurance === 'yes' ? '大会保険に加入' : '加入しない'}</dd></div>
                <div><dt>リストバンド</dt><dd>{wristband === 'keep' ? '変更しない' : `${wristband}に変更`}</dd></div>
            </dl>
            <p>現在の内容から変更されるのは<strong>{changedCount}人</strong>です。</p>
        </> : <div className="participant-history-bulk-fields">
            <label className="participant-history-team-label">まとめて変更する保険
                <select ref={firstField} value={insurance} onChange={event => setInsurance(event.target.value)}>
                    <option value="keep">変更しない（現在のまま）</option>
                    <option value="yes">大会保険に加入</option>
                    <option value="no">加入しない</option>
                </select>
            </label>
            <label className="participant-history-team-label">まとめて変更するリストバンド
                <select value={wristband} onChange={event => setWristband(event.target.value)}>
                    <option value="keep">変更しない（現在のまま）</option>
                    <option value="赤">赤（経験5年以上）</option>
                    <option value="青">青（経験2年超・5年未満）</option>
                    <option value="黄">黄（経験2年以下）</option>
                </select>
            </label>
            <p>リストバンドは学生時代のバスケットボール経験に合わせて選んでください。</p>
            {hasSetting && !changedCount ? <p role="status">選択中のメンバーはすでにこの設定です。</p> : null}
        </div>}
        <details className="participant-history-bulk-targets"><summary>対象の{players.length}人を確認</summary><ul>{players.map(player => <li key={player.sourcePlayerId}>{player.name}<small>{player.furigana}</small></li>)}</ul></details>
        <p className="participant-history-footnote">今回は追加前の内容に反映します。元のチームや登録済みの選手は変更しません。反映後も一人ずつ編集できます。</p>
        <div className="participant-history-actions"><div className="participant-history-action-buttons">
            <Button type="button" variant="outline" onClick={confirming ? () => setConfirming(false) : onCancel}>{confirming ? '設定に戻る' : '変更せず一覧へ戻る'}</Button>
            <Button type="button" disabled={!changedCount} onClick={() => {
                if (!confirming) { setConfirming(true); return; }
                if (!applied.current) { applied.current = true; onApply(patch); }
            }}>{confirming ? `${players.length}人に反映` : '変更内容を確認'}</Button>
        </div></div>
    </section>;
}

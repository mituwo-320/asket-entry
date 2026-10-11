"use client";

import { useId } from "react";

export function WristbandChoices({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const name = useId();
  return <fieldset className="space-y-3">
    <legend className="text-sm font-medium">リストバンドの色</legend>
    <p className="text-xs text-[#c2cbb5]">学生時代のバスケットボール経験に合わせて選んでください。</p>
    <div className="participant-choice-group grid grid-cols-1 sm:grid-cols-3 gap-2">
      {[
        { color: "赤", description: "経験5年以上" },
        { color: "青", description: "経験2年超・5年未満" },
        { color: "黄", description: "経験2年以下" },
      ].map(({ color, description }) => <label key={color} className="participant-choice rounded-lg border border-slate-700 p-3 cursor-pointer">
        <span className="participant-wristband" data-color={color} aria-hidden="true" />
        <span className="participant-choice-title"><input type="radio" name={name} value={color} checked={value === color} onChange={() => onChange(color)} />{color}</span>
        <span className="participant-choice-description text-xs">{description}</span>
      </label>)}
    </div>
  </fieldset>;
}

export function InsuranceChoices({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  const name = useId();
  return <fieldset className="space-y-3">
    <legend className="text-sm font-medium">スポーツ保険の加入状況</legend>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <label className="participant-choice rounded-lg border border-slate-700 p-4 cursor-pointer">
        <span className="participant-choice-title"><input type="radio" name={name} checked={value} onChange={() => onChange(true)} />大会保険に加入</span>
        <span className="participant-choice-description text-xs">大会が指定するスポーツ保険に加入します（推奨）。</span>
      </label>
      <label className="participant-choice rounded-lg border border-slate-700 p-4 cursor-pointer">
        <span className="participant-choice-title"><input type="radio" name={name} checked={!value} onChange={() => onChange(false)} />加入しない</span>
        <span className="participant-choice-description text-xs">各自で加入済み、または加入を希望しません。</span>
      </label>
    </div>
  </fieldset>;
}

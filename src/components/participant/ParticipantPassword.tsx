"use client";

import { useId, useState, type ReactNode, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/Input";

export function ParticipantPassword({ label, hint, id, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label?: string; hint?: string }) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  const description = [props["aria-describedby"], hint ? `${inputId}-hint` : null].filter(Boolean).join(" ") || undefined;
  return <div className="participant-password-field">
    {label ? <label htmlFor={inputId}>{label}</label> : null}
    <div className="participant-password-control">
      <Input {...props} id={inputId} type={visible ? "text" : "password"} aria-describedby={description} />
      <button type="button" disabled={props.disabled} aria-label={`${label ?? "パスワード"}を${visible ? "隠す" : "表示"}`} aria-pressed={visible} aria-controls={inputId} onClick={() => setVisible(value => !value)}>
        {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        <span>{visible ? "隠す" : "表示"}</span>
      </button>
    </div>
    {hint ? <p id={`${inputId}-hint`}>{hint}</p> : null}
  </div>;
}

export function ParticipantAccountNote({ title, children }: { title: string; children: ReactNode }) {
  return <aside className="participant-account-note"><span aria-hidden="true">TEAM DESK / GUIDE</span><h2>{title}</h2><div>{children}</div></aside>;
}

export function ParticipantResetProgress({ step }: { step: 1 | 2 | 3 }) {
  return <ol className="participant-reset-progress" aria-label="パスワード再設定の進行状況">
    {["メール入力", "メールを確認", "再設定"].map((label, index) => <li key={label} aria-current={index + 1 === step ? "step" : undefined} data-complete={index + 1 < step}><span aria-hidden="true">0{index + 1}</span>{label}</li>)}
  </ol>;
}

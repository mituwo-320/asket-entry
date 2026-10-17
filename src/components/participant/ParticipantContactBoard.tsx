"use client";

import { useState } from "react";
import { ArrowUpRight, CheckCircle2, MessageCircle, X, ChevronDown } from "lucide-react";
import type { Project, TeamEntry } from "@/lib/types";

export function ParticipantContactBoard({ projects, entries, defaultLink, onDismiss, collapsed = false }: { projects: Project[]; entries: TeamEntry[]; defaultLink?: string; onDismiss: () => void; collapsed?: boolean }) {
  const [now] = useState(() => Date.now());
  const contacts = projects.filter(project => {
    if (!entries.some(entry => entry.tournamentId === project.id)) return false;
    if (project.entryEndDate && now - new Date(project.entryEndDate).getTime() > 30 * 24 * 60 * 60 * 1000) return false;
    return !!(project.lineOpenChatLink || defaultLink);
  });
  if (contacts.length === 0) return null;
  return <section className="participant-contact-board" aria-labelledby="contact-board-title" data-collapsed={collapsed}>
    <header><div><p>COURTSIDE / INFORMATION</p><h2 id="contact-board-title"><MessageCircle size={20} aria-hidden="true" />大会からの大切な連絡</h2></div><button type="button" aria-label={collapsed ? "LINEのお知らせを詳しく見る" : "LINEのお知らせを閉じる"} aria-expanded={!collapsed} onClick={onDismiss}>{collapsed ? <ChevronDown size={19} aria-hidden="true" /> : <X size={19} aria-hidden="true" />}</button></header>
    <p className="participant-contact-intro">集合時間や持ち物、当日の変更はLINEオープンチャットへ。代表者の方は参加必須です。大会ごとのチャットにご参加ください。</p>
    <ul>{contacts.map(project => {
      const projectEntries = entries.filter(entry => entry.tournamentId === project.id);
      const confirmed = projectEntries.every(entry => entry.isOpenChatJoined === true);
      return <li key={project.id} data-confirmed={confirmed}><div><span className="participant-contact-status">{confirmed ? <CheckCircle2 size={14} aria-hidden="true" /> : <span className="participant-contact-dot" aria-hidden="true" />}{confirmed ? "運営が参加を確認済み" : "参加状況をご確認ください"}</span><h3>{project.name}</h3><p>{confirmed ? "参加の確認が取れています。最新のお知らせはチャットでご確認ください。" : "参加済みの場合も、運営の確認が反映されるまではこの案内が表示されます。"}</p></div><a href={project.lineOpenChatLink || defaultLink} target="_blank" rel="noopener noreferrer">チャットを開く<ArrowUpRight size={17} aria-hidden="true" /><span className="sr-only">（{project.name}・別タブ）</span></a></li>;
    })}</ul>
    <footer>リンクを開いただけでは、参加確認済みにはなりません。</footer>
  </section>;
}

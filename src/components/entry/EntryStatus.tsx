"use client";

import { useEffect, useState } from "react";

type Project = { id: string; name: string };
type Status =
  | { state: "loading" }
  | { state: "ready"; projects: Project[] }
  | { state: "error" };

export function EntryStatus() {
  const [status, setStatus] = useState<Status>({ state: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/projects/active", { signal: controller.signal });
        if (!response.ok) throw new Error("Failed to load entry status");
        const data: unknown = await response.json();
        if (!data || typeof data !== "object" || !("projects" in data) || !Array.isArray(data.projects)) {
          throw new Error("Invalid entry status");
        }
        const projects: Project[] = data.projects.map((project: unknown) => {
          if (!project || typeof project !== "object" || !("id" in project) || !("name" in project) || typeof project.id !== "string" || typeof project.name !== "string") {
            throw new Error("Invalid project");
          }
          return { id: project.id, name: project.name };
        });
        if (active) setStatus({ state: "ready", projects });
      } catch {
        if (active) setStatus({ state: "error" });
      } finally {
        clearTimeout(timeout);
      }
    }

    void load();
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  return (
    <div aria-live="polite" aria-atomic="true" className="entry-status">
      <p className="entry-status-title">受付状況</p>
      {status.state === "loading" ? (
        <p >大会の受付状況を確認しています…</p>
      ) : status.state === "error" ? (
        <p >受付状況を取得できませんでした。時間をおいて再度ご確認ください。</p>
      ) : status.projects.length === 0 ? (
        <p >現在、参加申し込みを受け付けている大会はありません。</p>
      ) : (
        <>
          <p className="entry-status-open">参加申し込みの受付期間中です。</p>
          <ul className="mt-1">
            {status.projects.map(project => <li key={project.id}>{project.name}</li>)}
          </ul>
          <p className="entry-status-note">空き状況・キャンセル待ちは登録画面でご確認ください。</p>
        </>
      )}
    </div>
  );
}

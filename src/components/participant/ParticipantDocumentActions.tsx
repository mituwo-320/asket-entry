"use client";

import { Printer, FileCheck2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ParticipantDocumentActions({ onPrint }: { onPrint: () => void }) {
  return <section className="participant-document-actions print:hidden" aria-label="書類の保存・印刷">
    <div className="participant-document-action-copy"><FileCheck2 size={27} aria-hidden="true" /><div><h2>内容を確認して、書類を保存</h2><p>印刷画面からPDF保存または印刷を行ってください。操作はお使いの端末によって異なります。</p></div></div>
    <Button type="button" onClick={onPrint}><Printer size={18} aria-hidden="true" />PDF保存・印刷</Button>
    <ol><li><span>01</span>宛名・金額を確認</li><li><span>02</span>PDF保存・印刷を選ぶ</li><li><span>03</span>保存した書類を確認</li></ol>
  </section>;
}

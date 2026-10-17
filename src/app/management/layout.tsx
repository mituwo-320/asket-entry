import type { ReactNode } from "react";
import "./management.css";
import "@/components/admin/bracket-desk.css";

export default function ManagementLayout({ children }: { children: ReactNode }) {
  return <div className="operations-surface">{children}<footer className="operations-footer print:hidden"><strong>vanky<span>cup</span></strong><span>OPERATIONS DESK / PLAY TOGETHER.</span></footer></div>;
}

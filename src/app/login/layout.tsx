import type { ReactNode } from "react";
import "../entry.css";

export default function LoginLayout({ children }: { children: ReactNode }) {
  return <div className="entry-surface">{children}</div>;
}

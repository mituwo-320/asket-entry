import type { ReactNode } from "react";
import "../../entry.css";

export default function RegisterLayout({ children }: { children: ReactNode }) {
  return <div className="entry-surface">{children}</div>;
}

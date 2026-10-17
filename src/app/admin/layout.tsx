import type { ReactNode } from "react";
import "./admin.css";
import "@/components/admin/bracket-desk.css";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="admin-surface">{children}</div>;
}

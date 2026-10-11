import type { ReactNode } from "react";
import { ParticipantTheme } from "@/components/participant/ParticipantFrame";
import "../entry.css";
import "../participant.css";

export default function ParticipantLayout({ children }: { children: ReactNode }) {
  return <ParticipantTheme>{children}</ParticipantTheme>;
}

import type { ReactNode } from "react";
import { CupMark } from "@/components/entry/CupMark";

type StoryStep = { title: string; description: string };

export function ParticipantStory({ eyebrow, title, description, guideTitle, steps }: {
  eyebrow: string;
  title: ReactNode;
  description: string;
  guideTitle: string;
  steps: StoryStep[];
}) {
  return <aside className="participant-form-aside participant-story">
    <div className="participant-story-art">
      <div className="participant-story-masthead" aria-hidden="true"><span>VANKY CUP</span><span>PLAY TOGETHER.</span></div>
      <div className="participant-story-copy">
        <p className="participant-eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p className="participant-story-description">{description}</p>
      </div>
      <CupMark className="participant-story-seal" />
    </div>
    <div className="participant-story-guide">
      <div className="participant-story-guide-heading"><h3>{guideTitle}</h3><span aria-hidden="true">FIELD GUIDE / {String(steps.length).padStart(2, "0")}</span></div>
      <ol>{steps.map((step, index) => <li key={step.title}>
        <span className="participant-story-step" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
        <div><h4>{step.title}</h4><p>{step.description}</p></div>
      </li>)}</ol>
    </div>
  </aside>;
}

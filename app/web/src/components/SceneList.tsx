import type { Project } from "../../../shared/project";
import { sceneIdsOf, sceneLabel } from "../../../shared/toReel";
import { plainText } from "../../../../src/looks/emphasis";

type Props = {
  readonly project: Project;
  readonly selected: number;
  readonly onSelect: (index: number) => void;
  readonly onAddStep: () => void;
};

const SOURCE_LABEL = { eleven: "ElevenLabs", voicebox: "Voicebox (old)", omnivoice: "OmniVoice", upload: "Uploaded", mac: "Mac voice (old)" } as const;

export const voiceStatus = (project: Project, sceneId: string) => {
  const clip = project.voice[sceneId];
  if (!clip) return { label: "No voice", tone: "muted" } as const;
  if (clip.source !== "upload" && clip.text !== (project.plan.narration[sceneId] ?? "")) return { label: "Text changed", tone: "warn" } as const;
  return { label: SOURCE_LABEL[clip.source], tone: "ok" } as const;
};

export const SceneList = ({ project, selected, onSelect, onAddStep }: Props) => (
  <nav className="scene-list">
    {sceneIdsOf(project.plan).map((sceneId, i) => {
      const status = voiceStatus(project, sceneId);
      const heading =
        sceneId === "title" ? project.plan.title.main : sceneId === "outro" ? project.plan.outro.main : project.plan.steps[i - 1]?.title;
      return (
        <button key={sceneId} className={`scene-item${i === selected ? " selected" : ""}`} onClick={() => onSelect(i)}>
          <small>{sceneLabel(sceneId)}</small>
          <strong>{(heading && plainText(heading)) || "Untitled"}</strong>
          <span className={`badge ${status.tone}`}>{status.label}</span>
        </button>
      );
    })}
    <button className="add-step" onClick={onAddStep} disabled={project.plan.steps.length >= 7}>
      + Add step
    </button>
  </nav>
);

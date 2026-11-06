import { Thumbnail } from "@remotion/player";
import { memo, useState } from "react";
import type { ProjectSummary } from "../api";
import { SingleScene } from "../../../../src/Reel";
import { buildScenes, FPS } from "../../../../src/timeline";
import { TILE_FRAME } from "../style";

type Props = {
  readonly projects: readonly ProjectSummary[];
  readonly busy: boolean;
  readonly onDuplicate: (id: string) => void;
  readonly onDelete: (project: ProjectSummary) => void;
};

// Search only helps once there are more reels than fit at a glance.
const SEARCH_FROM = 7;

const dateOf = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// A reel as a card: a still of its title scene, its name, its size and whether an MP4 exists.
const ReelCard = memo(({ project, busy, onDuplicate, onDelete }: { readonly project: ProjectSummary } & Omit<Props, "projects">) => {
  const frames = buildScenes(project.preview.spec, project.preview.voice)[0]?.frames ?? 1;
  return (
    <li className="reel-card">
      <a href={`#/p/${project.id}`} className="reel-open">
        <Thumbnail
          component={SingleScene}
          inputProps={{ ...project.preview, sceneIndex: 0 }}
          frameToDisplay={Math.min(TILE_FRAME, frames - 1)}
          durationInFrames={frames}
          compositionWidth={1080}
          compositionHeight={1920}
          fps={FPS}
          className="reel-thumb"
          style={{ width: "100%", aspectRatio: "9 / 16" }}
        />
        <strong>{project.name}</strong>
      </a>
      <p className="reel-meta">
        <span>{project.steps} steps</span>
        <span className={project.rendered ? "badge ok" : "badge"}>{project.rendered ? "MP4 ready" : "Not rendered"}</span>
      </p>
      <p className="reel-meta">
        <time dateTime={project.updatedAt}>{dateOf(project.updatedAt)}</time>
      </p>
      <div className="reel-actions">
        <button type="button" disabled={busy} onClick={() => onDuplicate(project.id)} title="Copy this reel to use as a template">
          Duplicate
        </button>
        <button type="button" className="danger" disabled={busy} onClick={() => onDelete(project)}>
          Delete
        </button>
      </div>
    </li>
  );
});

export const ReelList = ({ projects, busy, onDuplicate, onDelete }: Props) => {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q ? projects.filter((p) => p.name.toLowerCase().includes(q)) : projects;
  return (
    <>
      {projects.length >= SEARCH_FROM ? (
        <label className="field reel-search">
          <span>Find a reel</span>
          <input type="search" value={query} placeholder="Type part of its name" onChange={(e) => setQuery(e.target.value)} />
        </label>
      ) : null}
      {shown.length ? (
        <ul className="reel-grid">
          {shown.map((project) => (
            <ReelCard key={project.id} project={project} busy={busy} onDuplicate={onDuplicate} onDelete={onDelete} />
          ))}
        </ul>
      ) : (
        <p className="hint">No reel matches "{query}".</p>
      )}
    </>
  );
};

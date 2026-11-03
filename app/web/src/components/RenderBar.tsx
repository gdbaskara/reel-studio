import type { Project } from "../../../shared/project";
import { api } from "../api";

type Props = { readonly project: Project; readonly busy: boolean; readonly onRender: () => void; readonly onReset: () => void };

export const RenderBar = ({ project, busy, onRender, onReset }: Props) => {
  const { status, progress, error, updatedAt } = project.render;
  return (
    <div className="render-bar">
      {status === "rendering" ? (
        <div className="progress">
          <div style={{ width: `${Math.round(progress * 100)}%` }} />
          <span>Rendering {Math.round(progress * 100)}%</span>
        </div>
      ) : (
        <button className="primary" disabled={busy} onClick={onRender}>
          {status === "done" ? "Render again" : "Render MP4"}
        </button>
      )}
      {status === "done" ? (
        <a className="download" href={api.videoUrl(project.id, updatedAt)}>
          Download video
        </a>
      ) : null}
      {status === "error" ? (
        <p className="error" title={error}>
          Render failed. <button className="link" onClick={onReset}>Dismiss</button>
        </p>
      ) : null}
    </div>
  );
};

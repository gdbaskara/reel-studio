import { useRef } from "react";
import type { StepImage } from "../../../shared/project";

type Props = {
  readonly image: StepImage | undefined;
  readonly busy: boolean;
  readonly onUpload: (file: File) => void;
  readonly onRemove: () => void;
};

// A picture for the step, such as a screenshot of the app being explained. It replaces the doodle.
export const StepPicture = ({ image, busy, onUpload, onRemove }: Props) => {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="field">
      <span>Picture {busy ? <span className="badge">Uploading...</span> : null}</span>
      {image ? <img className="step-picture" src={image.src} alt="Step picture" /> : <p className="hint">Add a screenshot or photo to show in this step. It takes the place of the doodle.</p>}
      <div className="voice-actions">
        <button type="button" disabled={busy} onClick={() => input.current?.click()}>
          {image ? "Replace picture" : "Upload picture"}
        </button>
        {image ? (
          <button type="button" className="danger" disabled={busy} onClick={onRemove}>
            Remove
          </button>
        ) : null}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
};

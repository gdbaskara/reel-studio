import { useRef } from "react";
import { BRAND_POSITIONS, type Brand, type BrandPosition, type Logo } from "../../../shared/project";

type Props = {
  readonly brand: Brand;
  readonly logo: Logo | undefined;
  readonly busy: boolean;
  readonly onChange: (brand: Brand) => void;
  readonly onUpload: (file: File) => void;
  readonly onRemoveLogo: () => void;
};

const POSITION_LABEL: Readonly<Record<BrandPosition, string>> = {
  "top-left": "Left",
  "top-center": "Centre",
  "top-right": "Right",
};

// A handle and/or logo shown at the top of every scene.
export const BrandPanel = ({ brand, logo, busy, onChange, onUpload, onRemoveLogo }: Props) => {
  const input = useRef<HTMLInputElement>(null);
  return (
    <section className="brand-panel">
      <header>
        <h3>Brand</h3>
        {busy ? <span className="badge">Working...</span> : null}
      </header>
      <label className="field">
        <span>Handle or name</span>
        <input value={brand.handle} maxLength={30} placeholder="@yourname" onChange={(e) => onChange({ ...brand, handle: e.target.value })} />
      </label>
      <div className="brand-row">
        {logo ? <img className="logo-preview" src={logo.src} alt="Logo" /> : null}
        <button type="button" disabled={busy} onClick={() => input.current?.click()}>
          {logo ? "Replace logo" : "Upload logo"}
        </button>
        {logo ? (
          <button type="button" className="danger" disabled={busy} onClick={onRemoveLogo}>
            Remove
          </button>
        ) : null}
      </div>
      {brand.handle.trim() || logo ? (
        <div className="mode-toggle" role="group" aria-label="Brand position">
          {BRAND_POSITIONS.map((position) => (
            <button
              key={position}
              type="button"
              className={brand.position === position ? "selected" : ""}
              aria-pressed={brand.position === position}
              onClick={() => onChange({ ...brand, position })}
            >
              {POSITION_LABEL[position]}
            </button>
          ))}
        </div>
      ) : (
        <p className="hint">Add a handle or logo to show it at the top of every scene.</p>
      )}
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
    </section>
  );
};

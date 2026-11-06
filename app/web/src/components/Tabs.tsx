import type { KeyboardEvent } from "react";

type Props<T extends string> = {
  readonly label: string;
  readonly tabs: readonly { readonly id: T; readonly title: string }[];
  readonly value: T;
  readonly onChange: (id: T) => void;
};

// A tab row with the keyboard pattern people expect: arrows move between tabs, Home and End jump.
export const Tabs = <T extends string>({ label, tabs, value, onChange }: Props<T>) => {
  const onKey = (e: KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.id === value);
    const next =
      e.key === "ArrowRight" ? (i + 1) % tabs.length : e.key === "ArrowLeft" ? (i - 1 + tabs.length) % tabs.length : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : -1;
    if (next < 0) return;
    e.preventDefault();
    onChange(tabs[next].id);
    document.getElementById(`tab-${tabs[next].id}`)?.focus();
  };
  return (
    <div className="tabs" role="tablist" aria-label={label} onKeyDown={onKey}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          id={`tab-${tab.id}`}
          type="button"
          role="tab"
          aria-selected={tab.id === value}
          aria-controls={`panel-${tab.id}`}
          tabIndex={tab.id === value ? 0 : -1}
          className={tab.id === value ? "selected" : ""}
          onClick={() => onChange(tab.id)}
        >
          {tab.title}
        </button>
      ))}
    </div>
  );
};

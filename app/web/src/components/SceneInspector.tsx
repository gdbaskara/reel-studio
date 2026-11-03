import { DRAWINGS, type Plan } from "../../../shared/project";

type Props = {
  readonly plan: Plan;
  readonly sceneId: string;
  readonly onChange: (fn: (plan: Plan) => Plan) => void;
  readonly onRemoveStep: () => void;
};

const Text = ({ label, value, max, onChange }: { label: string; value: string; max: number; onChange: (v: string) => void }) => (
  <label className="field">
    <span>{label}</span>
    <input value={value} maxLength={max} onChange={(e) => onChange(e.target.value)} />
  </label>
);

export const SceneInspector = ({ plan, sceneId, onChange, onRemoveStep }: Props) => {
  const stepIndex = sceneId.startsWith("step-") ? Number(sceneId.slice(5)) - 1 : -1;
  const step = plan.steps[stepIndex];
  const setStep = (patch: Partial<Plan["steps"][number]>) =>
    onChange((p) => ({ ...p, steps: p.steps.map((s, i) => (i === stepIndex ? { ...s, ...patch } : s)) }));

  return (
    <section className="inspector">
      <h3>On screen</h3>
      {sceneId === "title" ? (
        <>
          <Text label="Small line" value={plan.title.lead} max={40} onChange={(lead) => onChange((p) => ({ ...p, title: { ...p.title, lead } }))} />
          <Text label="Big line" value={plan.title.main} max={40} onChange={(main) => onChange((p) => ({ ...p, title: { ...p.title, main } }))} />
        </>
      ) : null}
      {step ? (
        <>
          <Text label="Step title" value={step.title} max={60} onChange={(title) => setStep({ title })} />
          <Text label="Sticky note" value={step.note} max={120} onChange={(note) => setStep({ note })} />
          <label className="field">
            <span>Doodle</span>
            <select value={step.drawing} onChange={(e) => setStep({ drawing: e.target.value as (typeof DRAWINGS)[number] })}>
              {DRAWINGS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : null}
      {sceneId === "outro" ? (
        <>
          <Text label="Big line" value={plan.outro.main} max={40} onChange={(main) => onChange((p) => ({ ...p, outro: { ...p.outro, main } }))} />
          <Text label="Small line" value={plan.outro.sub} max={60} onChange={(sub) => onChange((p) => ({ ...p, outro: { ...p.outro, sub } }))} />
        </>
      ) : null}
      <label className="field">
        <span>Narration (what is said, also used for captions)</span>
        <textarea
          rows={3}
          maxLength={600}
          value={plan.narration[sceneId] ?? ""}
          onChange={(e) => onChange((p) => ({ ...p, narration: { ...p.narration, [sceneId]: e.target.value } }))}
        />
      </label>
      {step && plan.steps.length > 1 ? (
        <button className="danger subtle" onClick={onRemoveStep}>
          Delete this step
        </button>
      ) : null}
    </section>
  );
};

import { DRAWINGS, type CreateOptions, type Plan } from "../../../shared/project";
import { hintsFor } from "../hints";

type Props = {
  readonly plan: Plan;
  readonly sceneId: string;
  readonly language: CreateOptions["language"];
  readonly onChange: (fn: (plan: Plan) => Plan) => void;
  readonly onRemoveStep: () => void;
};

type TextProps = { label: string; value: string; max: number; hint: string; onChange: (v: string) => void };

const Text = ({ label, value, max, hint, onChange }: TextProps) => (
  <label className="field">
    <span>{label}</span>
    <input value={value} maxLength={max} placeholder={hint} onChange={(e) => onChange(e.target.value)} />
  </label>
);

export const SceneInspector = ({ plan, sceneId, language, onChange, onRemoveStep }: Props) => {
  const hints = hintsFor(language);
  const stepIndex = sceneId.startsWith("step-") ? Number(sceneId.slice(5)) - 1 : -1;
  const step = plan.steps[stepIndex];
  const setStep = (patch: Partial<Plan["steps"][number]>) =>
    onChange((p) => ({ ...p, steps: p.steps.map((s, i) => (i === stepIndex ? { ...s, ...patch } : s)) }));

  return (
    <section className="inspector">
      <h3>On screen</h3>
      {sceneId === "title" ? (
        <>
          <Text label="Small line" value={plan.title.lead} max={40} hint={hints.titleLead} onChange={(lead) => onChange((p) => ({ ...p, title: { ...p.title, lead } }))} />
          <Text label="Big line" value={plan.title.main} max={40} hint={hints.titleMain} onChange={(main) => onChange((p) => ({ ...p, title: { ...p.title, main } }))} />
        </>
      ) : null}
      {step ? (
        <>
          <Text label="Step title" value={step.title} max={60} hint={hints.stepTitle} onChange={(title) => setStep({ title })} />
          <Text label="Sticky note" value={step.note} max={120} hint={hints.stepNote} onChange={(note) => setStep({ note })} />
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
          <Text label="Big line" value={plan.outro.main} max={40} hint={hints.outroMain} onChange={(main) => onChange((p) => ({ ...p, outro: { ...p.outro, main } }))} />
          <Text label="Small line" value={plan.outro.sub} max={60} hint={hints.outroSub} onChange={(sub) => onChange((p) => ({ ...p, outro: { ...p.outro, sub } }))} />
        </>
      ) : null}
      <label className="field">
        <span>Narration (what is said, also used for captions)</span>
        <textarea
          rows={3}
          maxLength={600}
          placeholder={hints.narration}
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

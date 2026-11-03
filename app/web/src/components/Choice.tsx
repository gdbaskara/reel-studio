type Option<T extends string> = {
  readonly value: T;
  readonly title: string;
  readonly detail: string;
  readonly disabled?: boolean;
};

type Props<T extends string> = {
  readonly label: string;
  readonly value: T;
  readonly options: readonly Option<T>[];
  readonly onChange: (value: T) => void;
};

// A group of selectable cards, used for the choices on the create screen.
export const Choice = <T extends string>({ label, value, options, onChange }: Props<T>) => (
  <fieldset className="choice">
    <legend>{label}</legend>
    <div className="choice-grid">
      {options.map((option) => (
        <label key={option.value} className={`choice-card${value === option.value ? " selected" : ""}${option.disabled ? " disabled" : ""}`}>
          <input
            type="radio"
            name={label}
            value={option.value}
            checked={value === option.value}
            disabled={option.disabled}
            onChange={() => onChange(option.value)}
          />
          <strong>{option.title}</strong>
          <span>{option.detail}</span>
        </label>
      ))}
    </div>
  </fieldset>
);

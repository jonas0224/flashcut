const LETTERS = ["A", "B", "C", "D"] as const;
const VARIANTS = ["a", "b", "c", "d"] as const;

type Props = {
  index: number;
  choice: string;
  selected: boolean;
  dimmed: boolean;
  disabled: boolean;
  onSelect: () => void;
};

export function ChoiceButton({
  index,
  choice,
  selected,
  dimmed,
  disabled,
  onSelect,
}: Props) {
  const letter = LETTERS[index] ?? String(index + 1);
  const variant = VARIANTS[index] ?? "a";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={`fc-choice fc-choice-${variant} ${
        selected ? "fc-choice-selected fc-choice-lock" : ""
      } ${dimmed ? "fc-choice-dimmed" : ""}`}
    >
      <span className="fc-choice-letter" aria-hidden>
        {letter}
      </span>
      <span className="fc-choice-label">{choice}</span>
      {selected && (
        <span className="fc-choice-check ml-auto shrink-0" aria-hidden>
          ✓
        </span>
      )}
    </button>
  );
}

import { SKIN_TYPES, skinTypeInfo } from "../model/skinTypes";

interface Props {
  skinType: number;
  fitzpatrick: Record<string, number>;
  onChange: (skinType: number) => void;
}

export function SkinTypeSelector({ skinType, fitzpatrick, onChange }: Props) {
  const current = skinTypeInfo(skinType);
  const multiplier = fitzpatrick[String(skinType)] ?? 1;

  return (
    <fieldset id="skin-type" className="scroll-mt-4">
      <legend className="text-sm font-medium text-gray-300 mb-2">Your skin type</legend>
      <div className="grid grid-cols-6 gap-1" role="radiogroup" aria-describedby="skin-type-desc">
        {SKIN_TYPES.map((s) => {
          const selected = s.type === skinType;
          return (
            <label key={s.type} className="group relative cursor-pointer">
              <input
                type="radio"
                name="skin-type"
                value={s.type}
                checked={selected}
                onChange={() => onChange(s.type)}
                className="peer sr-only"
                aria-label={`Type ${s.numeral}: ${s.description}`}
              />
              <span
                className={`flex h-11 flex-col items-center justify-center gap-1 rounded-md border transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-amber-400 ${
                  selected
                    ? "border-amber-400 bg-gray-800"
                    : "border-transparent hover:border-gray-600 hover:bg-gray-800/60"
                }`}
              >
                <span
                  className="h-4 w-4 rounded-full ring-1 ring-white/25"
                  style={{ backgroundColor: s.tone }}
                  aria-hidden="true"
                />
                <span className={`text-[11px] leading-none ${selected ? "text-white font-semibold" : "text-gray-400"}`}>
                  {s.numeral}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      <p id="skin-type-desc" className="mt-2 text-sm text-gray-200">
        {current.description}
      </p>
      <p className="mt-0.5 text-xs text-gray-400">
        {skinType === 1
          ? "Needs the least sun to make vitamin D."
          : `Needs about ${multiplier}× as much sun as type I.`}
      </p>
    </fieldset>
  );
}

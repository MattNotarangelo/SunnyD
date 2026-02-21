const ROMAN = ["I", "II", "III", "IV", "V", "VI"];
const SKIN_EMOJI = ["🧑🏻", "🧑🏻", "🧑🏼", "🧑🏽", "🧑🏾", "🧑🏿"];
const STOPS = ROMAN.length;
const THUMB_PX = 18;

interface Props {
  skinType: number;
  fitzpatrick: Record<string, number>;
  onChange: (skinType: number) => void;
}

export function SkinTypeSelector({ skinType, fitzpatrick, onChange }: Props) {
  const kSkin = fitzpatrick[String(skinType)] ?? 1;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">
        Skin Type: <span className="text-white font-semibold">{ROMAN[skinType - 1]}</span>
        <span className="text-gray-400 text-xs ml-2">(k = {kSkin})</span>
        <span className="ml-1 text-2xl">{SKIN_EMOJI[skinType - 1]}</span>
      </label>
      <input
        type="range"
        min={1}
        max={6}
        step={1}
        value={skinType}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-amber-400"
      />
      <div className="relative h-4 mt-0.5">
        {ROMAN.map((r, i) => (
          <span
            key={r}
            className="absolute text-[10px] text-gray-500 -translate-x-1/2"
            style={{
              left: `calc(${THUMB_PX / 2}px + (100% - ${THUMB_PX}px) * ${i / (STOPS - 1)})`,
            }}
          >
            {r}
          </span>
        ))}
      </div>
    </div>
  );
}

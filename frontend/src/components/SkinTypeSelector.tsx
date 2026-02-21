const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

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
      <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
        {ROMAN.map((r) => (
          <span key={r}>{r}</span>
        ))}
      </div>
    </div>
  );
}

const IU_OPTIONS = [600, 1000, 2000];

interface Props {
  iu: number;
  onChange: (iu: number) => void;
}

export function IUSelector({ iu, onChange }: Props) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">
        Target IU
      </label>
      <div className="flex gap-2">
        {IU_OPTIONS.map((val) => (
          <button
            key={val}
            onClick={() => onChange(val)}
            className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
              iu === val
                ? "bg-amber-500 text-gray-900"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {val}
          </button>
        ))}
      </div>
    </div>
  );
}

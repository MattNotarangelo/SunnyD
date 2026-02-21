interface Props {
  text: string;
  modelVersion: string;
}

export function Disclaimer({ text, modelVersion }: Props) {
  return (
    <div className="text-xs text-gray-500 border-t border-gray-700 pt-3">
      <p>{text}</p>
      <p className="mt-1 text-gray-600">Model v{modelVersion}</p>
    </div>
  );
}

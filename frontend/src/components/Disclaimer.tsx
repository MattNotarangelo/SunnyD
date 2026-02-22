interface Props {
  text: string;
  modelVersion: string;
  onAbout?: () => void;
}

export function Disclaimer({ text, modelVersion, onAbout }: Props) {
  return (
    <div className="text-xs text-gray-500 border-t border-gray-700 pt-3">
      <p>{text}</p>
      <div className="mt-1 flex items-center justify-between text-gray-600">
        <span>Model v{modelVersion}</span>
        {onAbout && (
          <button
            onClick={onAbout}
            className="text-gray-500 hover:text-amber-400 transition-colors p-0.5"
            title="About"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

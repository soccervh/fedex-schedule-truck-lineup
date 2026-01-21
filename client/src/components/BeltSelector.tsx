interface BeltSelectorProps {
  selectedBelt: number;
  onSelect: (belt: number) => void;
}

export function BeltSelector({ selectedBelt, onSelect }: BeltSelectorProps) {
  const belts = [1, 2, 3, 4];

  return (
    <div className="flex gap-2">
      {belts.map((belt) => (
        <button
          key={belt}
          onClick={() => onSelect(belt)}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            selectedBelt === belt
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50 border'
          }`}
        >
          Belt {belt}
        </button>
      ))}
    </div>
  );
}

import { type Preset } from "../api/client";

interface Props {
  preset: Preset;
  from: string;
  to: string;
  onChange: (preset: Preset, from: string, to: string) => void;
}

const PRESETS: { label: string; value: Preset }[] = [
  { label: "Last 24h", value: "1d" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Custom", value: "custom" },
];

export function TimeFilter({ preset, from, to, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value, from, to)}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            preset === p.value
              ? "bg-violet-600 text-white"
              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }`}
        >
          {p.label}
        </button>
      ))}
      {preset === "custom" && (
        <div className="flex items-center gap-2 ml-2">
          <input
            type="datetime-local"
            value={from}
            onChange={(e) => onChange("custom", e.target.value, to)}
            className="bg-gray-800 text-gray-200 text-sm rounded px-2 py-1 border border-gray-700"
          />
          <span className="text-gray-500 text-sm">to</span>
          <input
            type="datetime-local"
            value={to}
            onChange={(e) => onChange("custom", from, e.target.value)}
            className="bg-gray-800 text-gray-200 text-sm rounded px-2 py-1 border border-gray-700"
          />
        </div>
      )}
    </div>
  );
}

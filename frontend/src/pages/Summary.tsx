import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { generateSummary } from "../api/client";
import { subDays, formatISO } from "date-fns";
import { Sparkles } from "lucide-react";

type QuickRange = "1d" | "7d" | "30d";

function defaultRange(range: QuickRange): [string, string] {
  const now = new Date();
  const days = range === "1d" ? 1 : range === "7d" ? 7 : 30;
  return [
    formatISO(subDays(now, days)).slice(0, 16),
    formatISO(now).slice(0, 16),
  ];
}

export function Summary() {
  const [from, setFrom] = useState(defaultRange("7d")[0]);
  const [to, setTo] = useState(defaultRange("7d")[1]);

  const mutation = useMutation({
    mutationFn: () => generateSummary(from + ":00", to + ":00"),
  });

  const setRange = (r: QuickRange) => {
    const [f, t] = defaultRange(r);
    setFrom(f);
    setTo(t);
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <h1 className="text-xl font-semibold text-white">Generate Summary</h1>

      <div className="space-y-3">
        <div className="flex gap-2">
          {(["1d", "7d", "30d"] as QuickRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="px-3 py-1.5 rounded text-sm bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
            >
              {r === "1d" ? "Last 24h" : r === "7d" ? "Last 7 days" : "Last 30 days"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <input
            type="datetime-local"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-gray-800 text-gray-200 text-sm rounded px-2 py-1.5 border border-gray-700"
          />
          <span className="text-gray-500 text-sm">to</span>
          <input
            type="datetime-local"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="bg-gray-800 text-gray-200 text-sm rounded px-2 py-1.5 border border-gray-700"
          />
        </div>

        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles size={15} />
          {mutation.isPending ? "Generating…" : "Generate Summary"}
        </button>
      </div>

      {mutation.data && (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-5 space-y-4">
          <p className="text-gray-200 leading-relaxed whitespace-pre-wrap text-sm">
            {mutation.data.summary}
          </p>
          <div className="border-t border-gray-800 pt-4 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-semibold text-white">
                {(mutation.data.stats.total_visits as number).toLocaleString()}
              </div>
              <div className="text-gray-500 text-xs mt-1">Total Visits</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-white">
                {mutation.data.stats.unique_domains as number}
              </div>
              <div className="text-gray-500 text-xs mt-1">Unique Domains</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-white">
                {mutation.data.stats.device_count as number}
              </div>
              <div className="text-gray-500 text-xs mt-1">Devices</div>
            </div>
          </div>
        </div>
      )}

      {mutation.error && (
        <div className="text-red-400 text-sm">Failed to generate summary. Check your API key.</div>
      )}
    </div>
  );
}

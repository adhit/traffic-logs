import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchDomainDetail, type Preset } from "../api/client";
import { TimeFilter } from "../components/TimeFilter";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";

type Tab = "by_device" | "by_date" | "rows";

interface Props {
  domain: string;
  onBack: () => void;
}

export function DomainDetail({ domain, onBack }: Props) {
  const [preset, setPreset] = useState<Preset>("7d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tab, setTab] = useState<Tab>("by_device");

  const { data, isLoading } = useQuery({
    queryKey: ["domain-detail", domain, preset, from, to],
    queryFn: () => fetchDomainDetail(domain, preset, from, to),
  });

  const tabs: { key: Tab; label: string }[] = [
    { key: "by_device", label: "By Device" },
    { key: "by_date", label: "By Date" },
    { key: "rows", label: "All Rows" },
  ];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-white font-mono">{domain}</h1>
          {data?.ai_description && (
            <p className="text-gray-400 text-sm mt-0.5">{data.ai_description}</p>
          )}
        </div>
      </div>

      <TimeFilter
        preset={preset}
        from={from}
        to={to}
        onChange={(p, f, t) => { setPreset(p); setFrom(f); setTo(t); }}
      />

      <div className="flex gap-1 border-b border-gray-800">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? "border-violet-500 text-violet-400"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-gray-500 text-sm py-10 text-center">Loading…</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          {tab === "by_device" && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-left">
                  <th className="px-4 py-3 font-medium">Device</th>
                  <th className="px-4 py-3 font-medium">IP</th>
                  <th className="px-4 py-3 font-medium text-right">Visits</th>
                  <th className="px-4 py-3 font-medium text-right">Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {(data?.by_device ?? []).map((r) => (
                  <tr key={r.device_ip} className="border-b border-gray-800/50">
                    <td className="px-4 py-3 text-white">{r.device_name}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{r.device_ip}</td>
                    <td className="px-4 py-3 text-right text-white font-medium">{r.visits.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs">
                      {format(new Date(r.last_seen + "Z"), "MMM d, HH:mm")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "by_date" && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-left">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium text-right">Visits</th>
                </tr>
              </thead>
              <tbody>
                {(data?.by_date ?? []).map((r) => (
                  <tr key={r.date} className="border-b border-gray-800/50">
                    <td className="px-4 py-3 text-white">{r.date}</td>
                    <td className="px-4 py-3 text-right text-white font-medium">{r.visits.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "rows" && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-left">
                  <th className="px-4 py-3 font-medium">Device</th>
                  <th className="px-4 py-3 font-medium">Domain</th>
                  <th className="px-4 py-3 font-medium text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {(data?.rows ?? []).map((r) => (
                  <tr key={r.id} className="border-b border-gray-800/50">
                    <td className="px-4 py-3 text-gray-300">{r.device_name}</td>
                    <td className="px-4 py-3 font-mono text-violet-400 text-xs">{r.domain}</td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs">
                      {format(new Date(r.timestamp + "Z"), "MMM d, HH:mm:ss")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

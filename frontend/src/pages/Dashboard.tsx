import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchDomains, fetchDevices, type Preset } from "../api/client";
import { TimeFilter } from "../components/TimeFilter";
import { format } from "date-fns";

// Patterns that indicate background app/OS traffic rather than browser visits
const APP_NOISE = [
  /^[a-f0-9]{8,}\./i,           // hex-looking subdomains (CDN tokens)
  /\d{1,3}-\d{1,3}-\d{1,3}/,    // IP-like segments in hostname
  /(telemetry|metrics|analytics|tracking|ping|update|push|notify|crash|log\.|logs\.|cdn\.|static\.|assets\.|api\.)/,
  /\.(akamai|cloudfront|fastly|edgekey|edgesuite|akadns)\./,
];

function looksLikeBrowserDomain(domain: string): boolean {
  return !APP_NOISE.some((re) => re.test(domain));
}

interface Props {
  onDomainClick: (domain: string) => void;
}

export function Dashboard({ onDomainClick }: Props) {
  const [preset, setPreset] = useState<Preset>("7d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [deviceIp, setDeviceIp] = useState("");
  const [websitesOnly, setWebsitesOnly] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["domains", preset, from, to, deviceIp],
    queryFn: () => fetchDomains(preset, from, to, deviceIp || undefined),
  });

  const { data: devices } = useQuery({ queryKey: ["devices"], queryFn: fetchDevices });

  const rows = (data ?? [])
    .filter((r) => r.domain.toLowerCase().includes(search.toLowerCase()))
    .filter((r) => !websitesOnly || looksLikeBrowserDomain(r.domain));

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <h1 className="text-xl font-semibold text-white">Network Traffic</h1>
        <div className="ml-auto flex items-center gap-3">
          <select
            value={deviceIp}
            onChange={(e) => setDeviceIp(e.target.value)}
            className="bg-gray-800 text-gray-200 text-sm rounded px-3 py-1.5 border border-gray-700 focus:outline-none focus:border-violet-500"
          >
            <option value="">All devices</option>
            {(devices ?? []).map((d) => (
              <option key={d.ip} value={d.ip}>
                {d.friendly_name ?? d.hostname ?? d.ip}
              </option>
            ))}
          </select>
          <input
            placeholder="Search domain…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-gray-800 text-gray-200 text-sm rounded px-3 py-1.5 border border-gray-700 w-52 focus:outline-none focus:border-violet-500"
          />
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none whitespace-nowrap">
            <input
              type="checkbox"
              checked={websitesOnly}
              onChange={(e) => setWebsitesOnly(e.target.checked)}
              className="accent-violet-500"
            />
            Websites only
          </label>
        </div>
      </div>

      <TimeFilter
        preset={preset}
        from={from}
        to={to}
        onChange={(p, f, t) => { setPreset(p); setFrom(f); setTo(t); }}
      />

      {isLoading ? (
        <div className="text-gray-500 text-sm py-10 text-center">Loading…</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-left">
                <th className="px-4 py-3 font-medium">Domain</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium text-right">Visits</th>
                <th className="px-4 py-3 font-medium text-right">Devices</th>
                <th className="px-4 py-3 font-medium text-right">Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.domain}
                  onClick={() => onDomainClick(row.domain)}
                  className="border-b border-gray-800/50 hover:bg-gray-800/40 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-violet-400 text-xs">
                    {row.domain}
                  </td>
                  <td className="px-4 py-3 text-gray-400 max-w-xs truncate">
                    {row.ai_description ?? (
                      <span className="text-gray-600 italic">Generating…</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-white font-medium">
                    {row.visits.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400">
                    {row.device_count}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 text-xs">
                    {format(new Date(row.last_seen + "Z"), "MMM d, HH:mm")}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-600">
                    No data for this time range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchDevices, updateDevice } from "../api/client";
import { format } from "date-fns";
import { Pencil, Check, X } from "lucide-react";

export function Devices() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["devices"], queryFn: fetchDevices });
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");

  const mutation = useMutation({
    mutationFn: ({ ip, friendly_name }: { ip: string; friendly_name: string }) =>
      updateDevice(ip, friendly_name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["devices"] });
      setEditing(null);
    },
  });

  if (isLoading) return <div className="p-6 text-gray-500">Loading…</div>;

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-semibold text-white">Devices</h1>
      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-left">
              <th className="px-4 py-3 font-medium">IP</th>
              <th className="px-4 py-3 font-medium">Hostname</th>
              <th className="px-4 py-3 font-medium">Friendly Name</th>
              <th className="px-4 py-3 font-medium text-right">Last Seen</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((d) => (
              <tr key={d.ip} className="border-b border-gray-800/50">
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{d.ip}</td>
                <td className="px-4 py-3 text-gray-400">{d.hostname ?? "—"}</td>
                <td className="px-4 py-3 text-white">
                  {editing === d.ip ? (
                    <input
                      autoFocus
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") mutation.mutate({ ip: d.ip, friendly_name: name });
                        if (e.key === "Escape") setEditing(null);
                      }}
                      className="bg-gray-700 text-white text-sm rounded px-2 py-1 border border-violet-500 focus:outline-none w-40"
                    />
                  ) : (
                    d.friendly_name ?? <span className="text-gray-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-gray-500 text-xs">
                  {d.last_seen ? format(new Date(d.last_seen + "Z"), "MMM d, HH:mm") : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  {editing === d.ip ? (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => mutation.mutate({ ip: d.ip, friendly_name: name })}
                        className="text-green-400 hover:text-green-300"
                      >
                        <Check size={14} />
                      </button>
                      <button onClick={() => setEditing(null)} className="text-gray-500 hover:text-gray-300">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditing(d.ip); setName(d.friendly_name ?? ""); }}
                      className="text-gray-600 hover:text-gray-300 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

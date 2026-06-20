import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Dashboard } from "./pages/Dashboard";
import { DomainDetail } from "./pages/DomainDetail";
import { Devices } from "./pages/Devices";
import { Summary } from "./pages/Summary";
import { Activity, Monitor, Sparkles } from "lucide-react";

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } });

type Page = "dashboard" | "devices" | "summary";

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  const nav = (p: Page) => { setPage(p); setSelectedDomain(null); };

  return (
    <QueryClientProvider client={qc}>
      <div className="flex h-screen overflow-hidden">
        <aside className="w-52 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col py-5">
          <div className="px-4 mb-6">
            <span className="text-white font-semibold text-sm tracking-wide">Traffic Logs</span>
          </div>
          <nav className="flex-1 space-y-0.5 px-2">
            {[
              { key: "dashboard" as Page, label: "Dashboard", icon: Activity },
              { key: "devices" as Page, label: "Devices", icon: Monitor },
              { key: "summary" as Page, label: "AI Summary", icon: Sparkles },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => nav(key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors ${
                  page === key && !selectedDomain
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/60"
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto">
          {selectedDomain ? (
            <DomainDetail domain={selectedDomain} onBack={() => setSelectedDomain(null)} />
          ) : page === "dashboard" ? (
            <Dashboard onDomainClick={setSelectedDomain} />
          ) : page === "devices" ? (
            <Devices />
          ) : (
            <Summary />
          )}
        </main>
      </div>
    </QueryClientProvider>
  );
}

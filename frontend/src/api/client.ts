import axios from "axios";

const BASE = import.meta.env.VITE_API_URL ?? "";

const api = axios.create({ baseURL: BASE });

export interface DomainRow {
  domain: string;
  visits: number;
  device_count: number;
  last_seen: string;
  ai_description: string | null;
}

export interface DomainDetail {
  domain: string;
  ai_description: string | null;
  by_device: { device_ip: string; device_name: string; visits: number; last_seen: string }[];
  by_date: { date: string; visits: number }[];
  rows: VisitRow[];
}

export interface VisitRow {
  id: number;
  device_ip: string;
  device_name: string;
  domain: string;
  timestamp: string;
}

export interface Device {
  ip: string;
  hostname: string | null;
  friendly_name: string | null;
  last_seen: string;
}

export interface SummaryResponse {
  summary: string;
  stats: Record<string, unknown>;
}

export type Preset = "1d" | "7d" | "30d" | "custom";

function dateParams(preset: Preset, from?: string, to?: string) {
  if (preset !== "custom") return { preset };
  return { from_date: from, to_date: to };
}

export const fetchDomains = (preset: Preset, from?: string, to?: string) =>
  api.get<DomainRow[]>("/api/domains", { params: dateParams(preset, from, to) }).then((r) => r.data);

export const fetchDomainDetail = (domain: string, preset: Preset, from?: string, to?: string) =>
  api.get<DomainDetail>(`/api/domains/${encodeURIComponent(domain)}`, { params: dateParams(preset, from, to) }).then((r) => r.data);

export const fetchVisits = (params: Record<string, string | number>) =>
  api.get<{ total: number; items: VisitRow[] }>("/api/visits", { params }).then((r) => r.data);

export const fetchDevices = () =>
  api.get<Device[]>("/api/devices").then((r) => r.data);

export const updateDevice = (ip: string, friendly_name: string) =>
  api.put(`/api/devices/${encodeURIComponent(ip)}`, { friendly_name });

export const generateSummary = (from_date: string, to_date: string) =>
  api.post<SummaryResponse>("/api/summary", { from_date, to_date }).then((r) => r.data);

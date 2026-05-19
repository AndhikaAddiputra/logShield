import { useAuthStore } from "../store/authStore";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface UserProfile {
  _id: string;
  type: "user";
  email: string;
  name: string;
  kib_bencana_id: string;
  role: string;
  posko_id: string | null;
  phone: string;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  ok: boolean;
  token: string;
  user: UserProfile;
  couchdb: {
    url: string;
    username: string;
    password: string;
    database: string;
  };
}

export interface PoskoDoc {
  _id: string;
  type: "posko";
  kib_16: string;
  name: string;
  address: string;
  district: string;
  province: string;
  total_pengungsi: number;
  count_balita: number;
  count_lansia: number;
  count_perempuan: number;
  count_pria: number;
  count_disabilitas: number;
  pj_phone: string;
  pj_name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePoskoPayload {
  kib_16: string;
  name: string;
  address: string;
  district: string;
  province: string;
  total_pengungsi: number;
  count_balita: number;
  count_lansia: number;
  count_perempuan: number;
  count_pria: number;
  count_disabilitas: number;
  pj_phone: string;
  pj_name: string;
}

export interface RequestItemInput {
  commodity: string;
  quantity: number;
  unit: string;
  note?: string;
}

export interface CreateRequestPayload {
  posko_id: string;
  items: RequestItemInput[];
  status?: string;
  priority?: string;
}

export interface RequestRow {
  id: string;
  request_code: string;
  title: string;
  location: string;
  status: string;
  status_label: string;
  status_color: string;
  date: string;
  time: string;
  items: { name: string; quantity: string; keterangan: string }[];
  action_label: string;
  action_disabled: boolean;
}

export interface ListRequestsResponse {
  ok: boolean;
  rows: RequestRow[];
}

export interface StockSummary {
  ok: boolean;
  updated_at: string;
  total_item: number;
  critical_count: number;
  distribution_today: number;
  posko_served: number;
  active_posko_count: number;
}

export interface AiDashboardResponse {
  status: string;
  dataset: any;
  forecasting: any;
  recommendations: any;
  anomalies: any;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { token } = useAuthStore.getState();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new ApiError(data.message || "Request failed", res.status);
  }

  return data as T;
}

export function login(identifier: string, password: string) {
  return request<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });
}

export function createPosko(payload: CreatePoskoPayload) {
  return request<{ ok: boolean; posko: PoskoDoc }>("/api/poskos", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchRequests(params: { status?: string; search?: string; limit?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.search) qs.set("search", params.search);
  if (params.limit) qs.set("limit", String(params.limit));
  const query = qs.toString();
  return request<ListRequestsResponse>(`/api/requests${query ? `?${query}` : ""}`);
}

export function createRequest(payload: CreateRequestPayload) {
  return request("/api/requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchStockSummary() {
  return request<StockSummary>("/api/stocks/summary");
}

export function fetchAiDashboard(limit = 5) {
  return request<AiDashboardResponse>(`/api/ai/dashboard?limit=${limit}`);
}

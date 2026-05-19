const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export interface SignupPayload {
  email: string;
  name: string;
  nik: string;
  password: string;
  phone: string;
}

export interface SignupResponse {
  ok: boolean;
  id: string;
  status: string;
  message: string;
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

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("logshield-token") : null;
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...authHeaders(),
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new ApiError(data.message || "Request failed", res.status);
  }

  return data as T;
}

async function requestForm<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  const data = await res.json();
  if (!res.ok && res.status !== 207) {
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

export function signup(payload: SignupPayload) {
  return request<SignupResponse>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("logshield-token");
}

export function getStoredUser(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("logshield-user");
  return raw ? JSON.parse(raw) : null;
}

export function storeAuth(token: string, user: UserProfile) {
  localStorage.setItem("logshield-token", token);
  localStorage.setItem("logshield-user", JSON.stringify(user));
  localStorage.setItem("logshield-authenticated", "true");
}

export function clearAuth() {
  localStorage.removeItem("logshield-token");
  localStorage.removeItem("logshield-user");
  localStorage.removeItem("logshield-authenticated");
}

export interface PersonnelRow {
  id: string;
  source: "user" | "signup_request";
  status: "active" | "pending";
  nama_personel: string;
  kib_bencana_id: string | null;
  nik?: string | null;
  role: string | null;
  posko_assignment: string | null;
  aksi: string[];
}

export interface PersonnelResponse {
  ok: boolean;
  viewer: {
    user_id: string;
    role: string;
    posko_id: string | null;
  };
  columns: string[];
  rows: PersonnelRow[];
}

export function fetchPersonnel() {
  return request<PersonnelResponse>("/api/personnel");
}

export interface ApprovePayload {
  role: string;
  kib_bencana_id: string;
  posko_id: string | null;
  name?: string;
  email?: string;
  phone?: string;
}

export interface RejectPayload {
  reason: string;
}

export function approveSignup(id: string, payload: ApprovePayload) {
  return request(`/api/personnel/requests/${encodeURIComponent(id)}/approve`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function rejectSignup(id: string, payload: RejectPayload) {
  return request(`/api/personnel/requests/${encodeURIComponent(id)}/reject`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface PoskoDoc {
  _id: string;
  _rev?: string;
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
  status: "active" | "inactive" | "closed";
  created_at: string;
  updated_at: string;
}

export interface PoskoListResponse {
  ok: boolean;
  rows: PoskoDoc[];
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

export interface CreatePoskoResponse {
  ok: boolean;
  posko: PoskoDoc;
}

export interface ImportCsvResponse {
  ok: boolean;
  inserted: number;
  failed: number;
  errors: { row: number; message: string }[];
}

export function fetchPoskos() {
  return request<PoskoListResponse>("/api/poskos");
}

export function createPosko(payload: CreatePoskoPayload) {
  return request<CreatePoskoResponse>("/api/poskos", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function importPoskosCsv(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  return requestForm<ImportCsvResponse>("/api/poskos/import-csv", fd);
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

export interface StockItem {
  commodity: string;
  quantity_available: number;
  unit: string;
  min_threshold: number;
  is_critical: boolean;
  progress: number;
}

export interface StockCategory {
  category: string;
  title: string;
  subtitle: string;
  item_count: number;
  items: StockItem[];
}

export interface StockCategoriesResponse {
  ok: boolean;
  categories: StockCategory[];
}

export interface StockTrendDay {
  date: string;
  label: string;
  masuk: number;
  keluar: number;
}

export interface StockTrendResponse {
  ok: boolean;
  days: StockTrendDay[];
}

export interface AddStockPayload {
  warehouse_id: string;
  commodity: string;
  category: string;
  quantity: number;
  unit: string;
  min_threshold: number;
}

export interface AddStockResponse {
  ok: boolean;
  asset: {
    _id: string;
    _rev: string;
    type: string;
    warehouse_id: string;
    commodity: string;
    category: string;
    quantity_available: number;
    unit: string;
    min_threshold: number;
    created_at: string;
    updated_at: string;
  };
  movement: {
    _id: string;
    _rev: string;
    type: string;
    warehouse_id: string;
    commodity: string;
    category: string;
    quantity: number;
    unit: string;
    movement_type: string;
    source: string;
    created_by: string;
    created_at: string;
  };
}

export function fetchStockSummary() {
  return request<StockSummary>("/api/stocks/summary");
}

export function fetchStockCategories() {
  return request<StockCategoriesResponse>("/api/stocks/categories");
}

export function fetchStockTrend(days = 7) {
  return request<StockTrendResponse>(`/api/stocks/trend?days=${days}`);
}

export function addStock(payload: AddStockPayload) {
  return request<AddStockResponse>("/api/stocks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface RequestItemUI {
  name: string;
  quantity: string;
  keterangan: string;
}

export interface RequestRow {
  id: string;
  request_code: string;
  title: string;
  location: string;
  status: string;
  status_label: string;
  status_color: "danger" | "warning" | "success" | "info";
  priority: string;
  date: string;
  time: string;
  items: RequestItemUI[];
  action_label: string;
  action_disabled: boolean;
}

export interface ListRequestsResponse {
  ok: boolean;
  rows: RequestRow[];
}

export interface ListRequestsParams {
  status?: string;
  posko_id?: string;
  commodity?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  limit?: number;
}

export function fetchRequests(params: ListRequestsParams = {}) {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.posko_id) qs.set("posko_id", params.posko_id);
  if (params.commodity) qs.set("commodity", params.commodity);
  if (params.date_from) qs.set("date_from", params.date_from);
  if (params.date_to) qs.set("date_to", params.date_to);
  if (params.search) qs.set("search", params.search);
  if (params.limit) qs.set("limit", String(params.limit));
  const query = qs.toString();
  return request<ListRequestsResponse>(`/api/requests${query ? `?${query}` : ""}`);
}

export function processRequest(id: string) {
  return request(`/api/requests/${encodeURIComponent(id)}/process`, {
    method: "POST",
  });
}

export function completeRequest(id: string) {
  return request(`/api/requests/${encodeURIComponent(id)}/complete`, {
    method: "POST",
  });
}

export interface CreateRequestPayload {
  posko_id: string;
  items: { commodity: string; quantity: number; unit: string; note?: string }[];
  status?: "mendesak" | "menunggu";
  priority?: "critical" | "high" | "normal" | "low";
}

export function createRequest(payload: CreateRequestPayload) {
  return request("/api/requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface DashboardOverview {
  ok: boolean;
  cards: {
    total_posko: number;
    critical_items: number;
    critical_units: number;
    pending_requests: number;
    ai_health: string;
    ai_status: string;
  };
  updated_at: string;
}

export interface StockWeightDay {
  date: string;
  label: string;
  kebutuhan: number;
  persediaan: number;
}

export interface StockWeightFilterOption {
  category: string;
  label: string;
  commodities: string[];
}

export interface StockWeightResponse {
  ok: boolean;
  filter: { category?: string; commodity?: string };
  options: StockWeightFilterOption[];
  days: StockWeightDay[];
}

export interface RegionalHeatmapPosko {
  posko_id: string;
  name: string;
  district: string;
  province: string;
}

export interface RegionalHeatmapValue {
  posko_id: string;
  value: number;
  intensity: number;
}

export interface RegionalHeatmapRow {
  category: string;
  label: string;
  values: RegionalHeatmapValue[];
}

export interface RegionalHeatmapResponse {
  ok: boolean;
  columns: RegionalHeatmapPosko[];
  rows: RegionalHeatmapRow[];
}

export interface VulnerableGroup {
  key: string;
  label: string;
  fulfilled: number;
  target: number;
  percentage: number;
}

export interface VulnerableFulfillmentResponse {
  ok: boolean;
  groups: VulnerableGroup[];
}

export interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string;
}

export interface SearchResponse {
  ok: boolean;
  query: string;
  results: SearchResult[];
}

export interface DashboardNotification {
  type: string;
  severity: string;
  title: string;
  message: string;
  created_at: string;
}

export interface NotificationsResponse {
  ok: boolean;
  unread_count: number;
  notifications: DashboardNotification[];
}

export function fetchDashboardOverview() {
  return request<DashboardOverview>("/api/dashboard/overview");
}

export function fetchStockWeight(params: { category?: string; commodity?: string; days?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.category) qs.set("category", params.category);
  if (params.commodity) qs.set("commodity", params.commodity);
  if (params.days) qs.set("days", String(params.days));
  const query = qs.toString();
  return request<StockWeightResponse>(`/api/dashboard/stock-weight${query ? `?${query}` : ""}`);
}

export function fetchRegionalHeatmap(limit = 7) {
  return request<RegionalHeatmapResponse>(`/api/dashboard/regional-heatmap?limit=${limit}`);
}

export function fetchVulnerableFulfillment() {
  return request<VulnerableFulfillmentResponse>("/api/dashboard/vulnerable-fulfillment");
}

export function fetchDashboardSearch(q: string, limit = 10) {
  return request<SearchResponse>(`/api/dashboard/search?q=${encodeURIComponent(q)}&limit=${limit}`);
}

export function fetchDashboardNotifications() {
  return request<NotificationsResponse>("/api/dashboard/notifications");
}

export interface StockReading {
  _id: string;
  type: "stock_reading";
  warehouse_id: string;
  node_id: string;
  commodity: string;
  weight_g: number;
  weight_delta_g: number;
  sample_count: number;
  rssi: number;
  uptime_s: number;
  battery_mv: number | null;
  timestamp: string;
  created_at: string;
}

export interface StockReadingsResponse {
  ok: boolean;
  readings: StockReading[];
}

export function fetchStockReadings(params: { warehouse_id?: string; commodity?: string; node_id?: string; limit?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.warehouse_id) qs.set("warehouse_id", params.warehouse_id);
  if (params.commodity) qs.set("commodity", params.commodity);
  if (params.node_id) qs.set("node_id", params.node_id);
  if (params.limit) qs.set("limit", String(params.limit));
  const query = qs.toString();
  return request<StockReadingsResponse>(`/api/stock-readings${query ? `?${query}` : ""}`);
}

export interface SettingsProfile {
  user_id: string;
  name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  initials: string;
  role: string;
  kib_bencana_id: string | null;
  posko_id: string | null;
  status: string;
  status_label: string;
  created_at: string;
  updated_at: string;
}

export interface SettingsNotifications {
  _id: string;
  user_id: string;
  email: boolean;
  app: boolean;
  sms: boolean;
  updated_at: string;
}

export interface SettingsResponse {
  ok: boolean;
  profile: SettingsProfile;
  notifications: SettingsNotifications;
}

export function fetchSettings() {
  return request<SettingsResponse>("/api/settings");
}

export function updateProfile(payload: { name?: string; email?: string; phone?: string; avatar_url?: string }) {
  return request<{ ok: boolean; profile: SettingsProfile }>("/api/settings/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function changePassword(current_password: string, new_password: string) {
  return request<{ ok: boolean; message: string }>("/api/settings/password", {
    method: "POST",
    body: JSON.stringify({ current_password, new_password }),
  });
}

export function updateNotificationSettings(payload: { email?: boolean; app?: boolean; sms?: boolean }) {
  return request<{ ok: boolean; notifications: SettingsNotifications }>("/api/settings/notifications", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("logshield-token") : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

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

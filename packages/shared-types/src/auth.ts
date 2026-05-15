export interface SignupPayload {
  email: string;
  name: string;
  nik: string;
  password: string;
  phone: string;
}

export interface SignupResponse {
  ok: true;
  id: string;
  status: "pending";
  message: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface CouchdbCredentials {
  url: string;
  username: string;
  password: string;
  database: string;
}

export interface UserProfile {
  _id: string;
  type: "user";
  email: string;
  name: string;
  kib_bencana_id: string;
  role: "admin" | "koordinator" | "lapangan";
  posko_id: string | null;
  phone: string;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  ok: true;
  token: string;
  user: UserProfile;
  couchdb: CouchdbCredentials;
}

export interface SignupRequestDoc {
  _id: string;
  type: "signup_request";
  email: string;
  name: string;
  phone: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface ApprovePayload {
  role: "admin" | "koordinator" | "lapangan";
  kib_bencana_id: string;
  posko_id: string | null;
}

export interface RejectPayload {
  reason: string;
}

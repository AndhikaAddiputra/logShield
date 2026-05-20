import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserProfile {
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

interface CouchDBCredentials {
  url: string;
  username: string;
  password: string;
  database: string;
}

interface LoginResponse {
  ok: boolean;
  token: string;
  user: UserProfile;
  couchdb: CouchDBCredentials;
}

export interface AuthState {
  token: string | null;
  user: UserProfile | null;
  couchdb: CouchDBCredentials | null;
  setAuth: (res: LoginResponse) => void;
  setUserPoskoId: (poskoId: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      couchdb: null,
      setAuth: (res) =>
        set({
          token: res.token,
          user: res.user,
          couchdb: res.couchdb,
        }),
      setUserPoskoId: (poskoId) =>
        set((state) => ({
          user: state.user ? { ...state.user, posko_id: poskoId } : state.user,
        })),
      clearAuth: () =>
        set({ token: null, user: null, couchdb: null }),
    }),
    { name: "logshield-mobile-auth" }
  )
);

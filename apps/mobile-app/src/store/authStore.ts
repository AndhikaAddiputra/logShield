import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserProfile, LoginResponse } from "../lib/api";

export interface AuthState {
  token: string | null;
  user: UserProfile | null;
  couchdb: LoginResponse["couchdb"] | null;
  setAuth: (res: LoginResponse) => void;
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
      clearAuth: () =>
        set({ token: null, user: null, couchdb: null }),
    }),
    { name: "logshield-mobile-auth" }
  )
);

import { create } from "zustand";
import {
  subscribeToAuth,
  signIn,
  signInWithGoogle,
  logout as fbLogout,
  syncMe,
  getMe,
} from "../services/authService";

let hydrationPromise = null;

const useAuthStore = create((set, get) => ({
  // Firebase identity
  user: null,
  loading: true,          // Firebase auth resolving for the first time

  // Backend identity
  mongoUser: null,        // { name, email, role, active }
  role: null,             // "customer" | "barber" | "admin" | "owner" | null
  bootstrapping: false,   // true while fetching Mongo identity

  // Errors
  authError: null,

  /* ---------------------------------------------------------------- */
  /* Backend hydration                                                 */
  /* ---------------------------------------------------------------- */

  /**
   * Runs after every Firebase sign-in and on every app boot where
   * Firebase reports a live session.
   *
   * 1) POST /api/me/sync — idempotent, ensures Mongo User + Customer
   * 2) GET  /api/me      — pulls { name, email, role, active }
   *
   * Sets `mongoUser` and `role`.
   *
   * Deduplicated: concurrent callers (e.g. login() and
   * AuthInitializer firing at the same time) share a single in-flight
   * promise instead of issuing duplicate /api/me/sync requests.
   */
  _hydrateMongo: async () => {
    if (hydrationPromise) {
      return hydrationPromise;
    }

    hydrationPromise = (async () => {
      set({ bootstrapping: true, authError: null });

      try {
        await syncMe();

        const me = await getMe();

        set({
          mongoUser: me,
          role: me?.role || null,
          bootstrapping: false,
        });

        return me;
      } catch (error) {
        set({
          mongoUser: null,
          role: null,
          bootstrapping: false,
          authError: error,
        });

        throw error;
      } finally {
        hydrationPromise = null;
      }
    })();

    return hydrationPromise;
  },

  refreshMe: async () => {
    return get()._hydrateMongo();
  },

  /* ---------------------------------------------------------------- */
  /* Sign in / sign out                                                */
  /* ---------------------------------------------------------------- */

  login: async (email, password) => {
    set({ authError: null });

    const fbUser = await signIn(email, password);

    set({ user: fbUser, loading: false });

    // Hydrate backend identity.
    // If this throws, the caller (Login.jsx) decides how to react.
    await get()._hydrateMongo();

    return fbUser;
  },

  loginWithGoogle: async () => {
    set({ authError: null });

    const fbUser = await signInWithGoogle();

    set({ user: fbUser, loading: false });

    await get()._hydrateMongo();

    return fbUser;
  },

  logout: async () => {
    await fbLogout();

    set({
      user: null,
      mongoUser: null,
      role: null,
      bootstrapping: false,
      authError: null,
      loading: false,
    });
  },

  /* ---------------------------------------------------------------- */
  /* App boot                                                          */
  /* ---------------------------------------------------------------- */

  /**
   * Call once at the app root (e.g., AuthInitializer.jsx).
   * Returns the unsubscribe function.
   */
  initializeAuth: () => {
    return subscribeToAuth(async (fbUser) => {
      if (fbUser) {
        set({ user: fbUser, loading: false });

        try {
          await get()._hydrateMongo();
        } catch {
          // Error already stored in authError by _hydrateMongo.
          // Don't throw — this runs inside a listener, not a promise.
        }
      } else {
        set({
          user: null,
          mongoUser: null,
          role: null,
          bootstrapping: false,
          loading: false,
          authError: null,
        });
      }
    });
  },
}));

export default useAuthStore;
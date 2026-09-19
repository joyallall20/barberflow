import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";

import { auth } from "../config/firebase";
import api from "./api";
import API_PATH from "./apiPath";

/* ------------------------------------------------------------------ */
/* Firebase Auth primitives                                            */
/* ------------------------------------------------------------------ */

export const loginAdmin = async (email, password) => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
};

/**
 * Neutral alias — Firebase has no admin/customer split.
 * Prefer this name in new code; keep loginAdmin for existing callers.
 */
export const signIn = loginAdmin;

export const logoutAdmin = async () => {
  await signOut(auth);
};

export const logout = logoutAdmin;

export const subscribeToAuth = (callback) => {
  return onAuthStateChanged(auth, callback);
};

export const getCurrentUser = () => {
  return auth.currentUser;
};

export const sendPasswordReset = async (email) => {
  await sendPasswordResetEmail(auth, email);
};

/* ------------------------------------------------------------------ */
/* Google sign-in                                                      */
/* ------------------------------------------------------------------ */

const googleProvider = new GoogleAuthProvider();
// Force the account chooser every time — avoids silently using
// whichever Google account was last active.
googleProvider.setCustomParameters({ prompt: "select_account" });

export const signInWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

/* ------------------------------------------------------------------ */
/* Backend identity (MongoDB user + role)                              */
/* ------------------------------------------------------------------ */

/**
 * POST /api/me/sync
 * Idempotent upsert of the Mongo User + linked Customer.
 * Must be called once after Firebase sign-in, before any other
 * protected request.
 *
 * Returns: { name, email, role, active }
 */
export const syncMe = async () => {
  const response = await api.post(API_PATH.ME_SYNC);
  const payload = response?.data;

  // Tolerate both { success, data: {...} } and bare {...}
  return payload?.data ?? payload;
};

/**
 * GET /api/me
 * Returns the caller's current identity from the backend.
 *
 * Returns: { name, email, role, active }
 */
export const getMe = async () => {
  const response = await api.get(API_PATH.ME);
  const payload = response?.data;

  return payload?.data ?? payload;
};
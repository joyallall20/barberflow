// src/auth/AuthInitializer.jsx
import { useEffect } from "react";
import useAuthStore from "../store/authStore.js";

const AuthInitializer = () => {
  useEffect(() => {
    const unsubscribe = useAuthStore.getState().initializeAuth();
    return unsubscribe;
  }, []);

  return null;
};

export default AuthInitializer;
export { AuthInitializer };
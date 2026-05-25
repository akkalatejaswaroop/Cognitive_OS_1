"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useAuth } from "@/contexts/AuthContext";

/**
 * AuthInitializer — bridges the Firebase auth state (cookie set by AuthContext)
 * to the backend user store (authStore). Whenever the user is authenticated with
 * Firebase, we call fetchMe() to load the full backend profile.
 */
export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const fetchMe = useAuthStore((state) => state.fetchMe);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      const timer = setTimeout(() => {
        fetchMe();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [fetchMe, isAuthenticated]);

  return <>{children}</>;
}

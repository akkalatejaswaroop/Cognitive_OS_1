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
      // The Firebase token is already in the access_token cookie (set by AuthContext)
      // so we just need to call the backend to get the full profile
      fetchMe();
    }
  }, [fetchMe, isAuthenticated]);

  return <>{children}</>;
}

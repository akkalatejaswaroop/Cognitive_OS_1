"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useAuth } from "@/contexts/AuthContext";

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const fetchMe = useAuthStore((state) => state.fetchMe);
  const { session, isAuthenticated } = useAuth();

  useEffect(() => {
    // Only fetch from backend if authenticated in Supabase
    if (isAuthenticated) {
      fetchMe();
    }
  }, [fetchMe, session, isAuthenticated]);

  return <>{children}</>;
}

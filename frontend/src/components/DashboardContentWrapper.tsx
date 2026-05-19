"use client";

import { useSidebarStore } from "@/store/useSidebarStore";
import { useBreakpoint } from "@/lib/hooks/useBreakpoint";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

export function DashboardContentWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isOpen, setSidebarOpen } = useSidebarStore();
  const { isMobileOrTablet } = useBreakpoint();

  // Auto-collapse sidebar on tablet/mobile screens
  useEffect(() => {
    if (isMobileOrTablet) {
      setSidebarOpen(false);
    }
  }, [isMobileOrTablet, setSidebarOpen]);

  return (
    <div
      className={cn(
        "flex-1 flex flex-col h-screen overflow-hidden relative z-10 transition-all duration-300 ease-in-out w-full",
        isOpen ? "md:pl-64" : "md:pl-20"
      )}
    >
      {children}
    </div>
  );
}

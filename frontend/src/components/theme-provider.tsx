"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";

/**
 * ThemeProvider
 * Wraps next-themes with sensible defaults for Cognitive OS.
 * - attribute="class"  → toggles `.dark` on <html> for Tailwind
 * - defaultTheme="dark" → AI-futuristic dark mode out of the box
 * - enableSystem        → respects OS preference when set to "system"
 * - storageKey          → persists preference to localStorage
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
      storageKey="cognitive-os-theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}

/**
 * useThemeMounted
 *
 * Convenience hook that returns `useTheme()` values plus a
 * `mounted` flag. Components should hide theme-dependent UI
 * until `mounted === true` to avoid hydration mismatches.
 */
export function useThemeMounted() {
  const themeContext = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return {
    ...themeContext,
    mounted,
    /** true when the currently resolved theme is dark */
    isDark: themeContext.resolvedTheme === "dark",
  };
}

/**
 * Re-export useTheme so consumers only need one import path.
 */
export { useTheme } from "next-themes";

"use client";

import { useEffect, useState } from "react";

/* ═══════════════════════════════════════════════════════════════
   Breakpoint System for Cognitive OS
   ─────────────────────────────────────────────────────────────
   mobile   :    0 – 639px   (sm)
   tablet   :  640 – 1023px  (md)
   laptop   : 1024 – 1279px  (lg)
   desktop  : 1280 – 1535px  (xl)
   ultrawide: 1536+          (2xl)
═══════════════════════════════════════════════════════════════ */

const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type Breakpoint = "mobile" | "tablet" | "laptop" | "desktop" | "ultrawide";

function getBreakpoint(width: number): Breakpoint {
  if (width < BREAKPOINTS.sm) return "mobile";
  if (width < BREAKPOINTS.lg) return "tablet";
  if (width < BREAKPOINTS.xl) return "laptop";
  if (width < BREAKPOINTS["2xl"]) return "desktop";
  return "ultrawide";
}

/**
 * useBreakpoint — returns the current named breakpoint and boolean helpers.
 *
 * Usage:
 * ```tsx
 * const { breakpoint, isMobile, isTablet, isDesktop } = useBreakpoint();
 * ```
 */
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>("desktop");
  const [width, setWidth] = useState(0);

  useEffect(() => {
    function handleResize() {
      const w = window.innerWidth;
      setWidth(w);
      setBreakpoint(getBreakpoint(w));
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return {
    breakpoint,
    width,
    isMobile: breakpoint === "mobile",
    isTablet: breakpoint === "tablet",
    isLaptop: breakpoint === "laptop",
    isDesktop: breakpoint === "desktop",
    isUltrawide: breakpoint === "ultrawide",
    /** true for tablet + mobile */
    isMobileOrTablet: breakpoint === "mobile" || breakpoint === "tablet",
    /** true for laptop, desktop, ultrawide */
    isLaptopUp: breakpoint === "laptop" || breakpoint === "desktop" || breakpoint === "ultrawide",
  };
}

/**
 * useMediaQuery — subscribe to a raw CSS media query.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR guard for media query
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

/**
 * useMounted — simple SSR guard.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);
  return mounted;
}

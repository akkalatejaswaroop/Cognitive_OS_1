"use client";

import { Variants } from "framer-motion";

/* ═══════════════════════════════════════════════════════════════
   PREMIUM MOTION VARIANTS FOR COGNITIVE OS
═══════════════════════════════════════════════════════════════ */

/**
 * pageTransition
 * Smooth fade & slight upward slide for route-level components.
 */
export const pageTransition: Variants = {
  initial: {
    opacity: 0,
    y: 12,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1], // Apple-like custom easeOutExpo
    },
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: {
      duration: 0.25,
      ease: "easeIn",
    },
  },
};

/**
 * staggerContainer
 * Stagger child transitions (like cards or list items).
 */
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

/**
 * staggerItem
 * Applies a clean rise-and-fade to list/grid components.
 */
export const staggerItem: Variants = {
  initial: {
    opacity: 0,
    y: 16,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 24,
    },
  },
};

/**
 * cardHover
 * Premium hover state scaling, border-glow, and shadow amplification.
 */
export const cardHover = {
  whileHover: {
    y: -4,
    scale: 1.008,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
    },
  },
  whileTap: {
    scale: 0.995,
  },
} as const;

/**
 * pulseSlow
 * Infinite breathing animation for AI orbs or system statuses.
 */
export const pulseSlow = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [0.7, 1, 0.7],
    transition: {
      duration: 4,
      ease: "easeInOut",
      repeat: Infinity,
    },
  },
};

/**
 * textStream
 * Simulates streaming terminal text / agent typing.
 */
export const textStream = {
  initial: {
    width: 0,
  },
  animate: {
    width: "100%",
    transition: {
      duration: 1.2,
      ease: "easeInOut",
    },
  },
};

/**
 * modalEntrance
 * Modal entry with a slight scale zoom and back drop fade.
 */
export const modalEntrance: Variants = {
  initial: {
    opacity: 0,
    scale: 0.94,
    y: 15,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 26,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.94,
    y: 10,
    transition: {
      duration: 0.18,
      ease: "easeIn",
    },
  },
};

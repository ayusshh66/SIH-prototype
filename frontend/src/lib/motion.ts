/**
 * Framer Motion Animation System
 * Standardized easing, variants, and reduced-motion awareness
 */

export const EASE = [0.22, 1, 0.36, 1] as const;

export const isReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const fadeInUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 4 },
  transition: { duration: 0.28, ease: EASE },
};

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
};

export const drawerSlide = {
  initial: { x: '100%' },
  animate: { x: 0 },
  exit: { x: '100%' },
  transition: { duration: 0.32, ease: EASE },
};

export const modalScale = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
  transition: { duration: 0.18, ease: EASE },
};

export const collapseHeight = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1 },
  exit: { height: 0, opacity: 0 },
  transition: { duration: 0.24, ease: EASE },
};

export const buttonTapMotion = {
  whileHover: { y: -1 },
  whileTap: { scale: 0.97 },
  transition: { duration: 0.12 },
};

export const badgePulseVariant = {
  scale: [1, 1.08, 1],
  transition: { duration: 0.4 },
};

export const criticalConflictPulse = {
  animate: { opacity: [1, 0.55, 1] },
  transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' as const },
};

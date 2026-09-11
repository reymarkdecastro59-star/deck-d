// Motion presets for the internal app.
// The app is 2D and functional — motion is restrained.

export const duration = {
  1: 0.12,
  2: 0.18,
  3: 0.26,
  4: 0.36,
}

export const easing = {
  out: [0.2, 0.7, 0.2, 1],
  inOut: [0.4, 0, 0.2, 1],
}

// motion lib transition presets — pass to <motion.div transition={...}>
export const transition = {
  hover: { duration: duration[1], ease: easing.out },
  button: { duration: duration[1], ease: easing.out },
  tab: { duration: duration[2], ease: easing.out },
  panel: { duration: duration[3], ease: easing.out },
  route: { duration: duration[3], ease: easing.out },
}

// Enter/exit fades — subtle opacity + small translation, nothing bouncy.
export const fadeIn = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: transition.panel,
}

export const fadeInSubtle = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: transition.hover,
}

"use client";

import { motion, useScroll, useSpring } from "motion/react";

/** A hairline at the very top that fills as you read. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 40, restDelta: 0.001 });
  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-50 h-[2px] origin-left bg-[linear-gradient(90deg,var(--ember),var(--lilac),var(--dusk))]"
    />
  );
}

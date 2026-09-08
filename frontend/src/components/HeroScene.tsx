import { motion, useReducedMotion } from "motion/react";

export function HeroScene() {
  const reduce = useReducedMotion();
  return (
    <div className="hero-scene" aria-hidden="true">
      <motion.img
        className="hero-art hero-art-scout"
        src="/characters/scout.png"
        alt=""
        width={280}
        height={452}
        initial={reduce ? false : { y: 16, opacity: 0 }}
        animate={reduce ? undefined : { y: [0, -8, 0], opacity: 1 }}
        transition={reduce ? undefined : { y: { duration: 7, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 0.7 } }}
      />
      <motion.img
        className="hero-art hero-art-carto"
        src="/characters/cartographer.png"
        alt=""
        width={220}
        height={351}
        initial={reduce ? false : { y: 24, opacity: 0 }}
        animate={reduce ? undefined : { y: [0, -6, 0], opacity: 1 }}
        transition={reduce ? undefined : { y: { duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }, opacity: { duration: 0.8, delay: 0.15 } }}
      />
    </div>
  );
}

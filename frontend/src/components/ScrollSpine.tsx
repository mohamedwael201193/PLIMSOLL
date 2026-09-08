import { useAnimationFrame, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, useVelocity, motion } from "motion/react";
import { useEffect, useRef } from "react";

function wrap(min: number, max: number, v: number) {
  const range = max - min;
  return ((((v - min) % range) + range) % range) + min;
}

export function ScrollSpine({ text, baseVelocity = -18 }: { text: string; baseVelocity?: number }) {
  const reduce = useReducedMotion();
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 2], { clamp: false });
  const x = useTransform(baseX, (v) => `${wrap(-20, -45, v)}%`);
  const directionFactor = useRef(1);
  const started = useRef(false);

  useEffect(() => {
    const t = window.setTimeout(() => {
      started.current = true;
    }, 400);
    return () => window.clearTimeout(t);
  }, []);

  useAnimationFrame((_t, delta) => {
    if (reduce || !started.current) return;
    let moveBy = directionFactor.current * baseVelocity * (delta / 1000);
    const vf = velocityFactor.get();
    if (vf < 0) directionFactor.current = -1;
    else if (vf > 0) directionFactor.current = 1;
    moveBy += directionFactor.current * moveBy * vf;
    baseX.set(baseX.get() + moveBy);
  });

  if (reduce) {
    return (
      <div className="spine-static">
        <p>{text}</p>
      </div>
    );
  }

  return (
    <div className="spine" aria-hidden="true">
      <motion.div className="spine-track" style={{ x }}>
        <span>{text}</span>
        <span>{text}</span>
        <span>{text}</span>
        <span>{text}</span>
      </motion.div>
    </div>
  );
}

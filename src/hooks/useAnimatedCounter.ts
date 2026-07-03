import { useEffect, useState, useRef } from 'react';

export function useAnimatedCounter(end: number, duration = 600, startOnMount = true) {
  const [count, setCount] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!startOnMount || startedRef.current) return;
    startedRef.current = true;
    if (end === 0) { setCount(0); return; }
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(ease * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [end, duration, startOnMount]);

  return count;
}

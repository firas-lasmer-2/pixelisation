import { useEffect, useRef } from "react";

interface UseScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  staggerDelay?: number;
}

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollRevealOptions = {}
) {
  const ref = useRef<T>(null);
  const { threshold = 0.15, rootMargin = "0px 0px -50px 0px", staggerDelay = 0 } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (staggerDelay > 0) {
            setTimeout(() => el.classList.add("revealed"), staggerDelay);
          } else {
            el.classList.add("revealed");
          }
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, staggerDelay]);

  return ref;
}

export function useStaggeredReveal(count: number, baseDelay = 100) {
  const refs = Array.from({ length: count }, (_, i) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useScrollReveal({ staggerDelay: i * baseDelay })
  );
  return refs;
}

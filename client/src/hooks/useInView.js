import { useEffect, useState } from "react";

export default function useInView(ref) {
  const [inView, setInView] = useState(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    if (typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return typeof IntersectionObserver === "undefined" ? false : inView;
}

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function useScrollToHash() {
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return undefined;
    let id;
    try { id = decodeURIComponent(hash.slice(1)); } catch { return undefined; }
    const timer = setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.tagName === 'DETAILS') el.open = true;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
    return () => clearTimeout(timer);
  }, [hash]);
}

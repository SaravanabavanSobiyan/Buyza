import { useEffect } from "react";

let locks = 0;
let savedStyles = null;

const lock = () => {
  locks += 1;
  if (locks > 1) return;

  const { body, documentElement } = document;
  const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
  savedStyles = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
  body.style.overflow = "hidden";
  if (scrollbarWidth > 0 && scrollbarWidth < 50) body.style.paddingRight = `${scrollbarWidth}px`;
};

const unlock = () => {
  locks = Math.max(0, locks - 1);
  if (locks > 0 || !savedStyles) return;
  document.body.style.overflow = savedStyles.overflow;
  document.body.style.paddingRight = savedStyles.paddingRight;
  savedStyles = null;
};

export default function useLockBodyScroll(active = true) {
  useEffect(() => {
    if (!active) return undefined;
    lock();
    return unlock;
  }, [active]);
}

export const isOutside = (rect, viewportWidth) =>
  rect.width > 0 && (rect.right > viewportWidth + 1 || rect.left < -1);

const isClipped = (element) => {
  for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
    if (getComputedStyle(parent).overflowX !== "visible") return true;
  }
  return false;
};

const label = (element) => {
  const classes =
    typeof element.className === "string" && element.className.trim()
      ? `.${element.className.trim().split(/\s+/).slice(0, 3).join(".")}`
      : "";
  return `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}${classes}`;
};

export const installOverflowCheck = () => {
  if (!import.meta.env.DEV) return () => {};
  let timer;

  const check = () => {
    document.querySelectorAll("[data-overflow-debug]").forEach((element) => {
      element.style.outline = "";
      element.removeAttribute("data-overflow-debug");
    });

    const viewportWidth = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth <= viewportWidth + 1) return;

    const culprits = [...document.body.querySelectorAll("*")]
      .filter((element) => isOutside(element.getBoundingClientRect(), viewportWidth) && !isClipped(element))
      .slice(0, 10);
    culprits.forEach((element) => {
      element.style.outline = "2px solid red";
      element.setAttribute("data-overflow-debug", "");
    });
    console.warn(
      `[layout] This page scrolls sideways (${viewportWidth}px wide). Likely causes (outlined in red):`,
      culprits.map(label)
    );
  };

  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(check, 600);
  };

  window.addEventListener("resize", schedule);
  window.addEventListener("load", schedule, true);
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  schedule();

  return () => {
    clearTimeout(timer);
    window.removeEventListener("resize", schedule);
    window.removeEventListener("load", schedule, true);
    observer.disconnect();
  };
};

import { useEffect } from "react";

const SITE_NAME = "Buyza";

export default function usePageTitle(title, description, siteName = SITE_NAME) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title ? `${title} | ${siteName}` : siteName;

    let meta = document.querySelector('meta[name="description"]');
    const created = !meta;
    const previousDescription = meta?.getAttribute("content");
    if (description) {
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "description");
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", description);
    }

    return () => {
      document.title = previousTitle;
      if (description && meta) {
        if (created) meta.remove();
        else if (previousDescription === null) meta.removeAttribute("content");
        else meta.setAttribute("content", previousDescription);
      }
    };
  }, [title, description, siteName]);
}

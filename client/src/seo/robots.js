export const robotsContent = ({ noindex = false, follow = false } = {}) => {
  if (noindex) return follow ? "noindex,follow" : "noindex,nofollow";
  return "index,follow,max-image-preview:large";
};

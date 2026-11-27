import NotFound from "../components/common/NotFound";
import Seo from "../components/seo/Seo";

export default function NotFoundPage() {
  return (
    <>
      <Seo noindex title="Page not found" />
      <NotFound />
    </>
  );
}

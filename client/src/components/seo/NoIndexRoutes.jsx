import { Outlet, useLocation } from "react-router-dom";
import Seo from "./Seo";
import { titleFor } from "../../seo/titles";

export default function NoIndexRoutes() {
  const { pathname } = useLocation();
  return (
    <>
      <Seo noindex title={titleFor(pathname)} />
      <Outlet />
    </>
  );
}

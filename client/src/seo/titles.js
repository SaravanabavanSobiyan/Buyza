import { matchPath } from "react-router-dom";

const TITLES = [
  ["/cart", "Shopping cart"],
  ["/checkout/payment", "Payment"],
  ["/checkout/review", "Review your order"],
  ["/checkout", "Checkout"],
  ["/order-success", "Order confirmed"],
  ["/orders/:orderNumber", "Order details"],
  ["/orders", "My orders"],
  ["/wishlist", "My wishlist"],
  ["/account", "My account"],
  ["/account/*", "My account"],
  ["/login", "Log in"],
  ["/register", "Create account"],
  ["/forgot-password", "Forgot password"],
  ["/reset-password/:token", "Reset password"],
  ["/admin/login", "Admin log in"],
  ["/admin", "Admin"],
  ["/admin/*", "Admin"],
];

export const titleFor = (pathname) => {
  const hit = TITLES.find(([pattern]) => matchPath({ path: pattern, end: true }, pathname));
  return hit ? hit[1] : undefined;
};

import { useSelector } from "react-redux";

export default function useCheckoutGuard() {
  const { cart, loaded } = useSelector((state) => state.cart);
  const { address, buyNowItem, quote, selectedShippingId } = useSelector(
    (state) => state.checkout
  );

  if (!loaded) return "loading";
  if (
    !buyNowItem &&
    (cart.items.length === 0 || cart.items.some((item) => !item.isAvailable))
  ) {
    return "/cart";
  }
  if (!address || !quote || !selectedShippingId) return "/checkout";
  if (!quote.canCheckout) return "/cart";
  return null;
}

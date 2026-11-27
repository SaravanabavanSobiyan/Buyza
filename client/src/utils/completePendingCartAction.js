import {
  addToCart,
  closeDrawer,
  mergeGuestCart,
  openDrawer,
} from "../store/cartSlice";
import {
  clearQuote,
  saveBuyNowItem,
  setBuyNowItem,
} from "../store/checkoutSlice";

export default async function completePendingCartAction(dispatch, action) {
  if (!action) return null;

  await dispatch(mergeGuestCart()).unwrap();

  if (action.type === "addToCart") {
    await dispatch(
      addToCart({
        productId: action.productId,
        variantSku: action.variantSku || null,
        quantity: action.quantity,
      })
    ).unwrap();
    dispatch(openDrawer());
    return "cart";
  }

  if (action.type === "buyNow") {
    saveBuyNowItem(action.item);
    dispatch(setBuyNowItem(action.item));
    dispatch(clearQuote());
    dispatch(closeDrawer());
    return "checkout";
  }

  return null;
}

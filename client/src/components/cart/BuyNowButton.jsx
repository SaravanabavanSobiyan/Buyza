import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { closeDrawer } from "../../store/cartSlice";
import {
  clearQuote,
  saveBuyNowItem,
  setBuyNowItem,
} from "../../store/checkoutSlice";

export default function BuyNowButton({
  productId,
  variantSku = null,
  quantity = 1,
  disabled = false,
  className = "",
  product,
  unitPrice,
}) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state) => state.auth.user);
  const [loading, setLoading] = useState(false);

  const item = {
    productId,
    variantSku,
    quantity,
    name: product.name,
    slug: product.slug,
    image: product.image,
    unitPrice,
  };

  const handleClick = async () => {
    if (!user) {
      navigate("/login", {
        state: { from: location, pendingCartAction: { type: "buyNow", item } },
      });
      return;
    }

    try {
      setLoading(true);
      saveBuyNowItem(item);
      dispatch(setBuyNowItem(item));
      dispatch(clearQuote());
      dispatch(closeDrawer());
      navigate("/checkout");
    } catch {
      toast.error(
        "Unable to start Buy now checkout. Check your browser storage and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      className={`min-h-11 rounded-xl border border-[#c9a96e] bg-white px-5 py-2.5 text-sm font-semibold text-[#46382f] shadow-sm transition hover:bg-[#faf7f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a7946] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {loading ? "Please wait..." : "Buy now"}
    </button>
  );
}

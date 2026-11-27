import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { toggleWishlist } from "../../store/wishlistSlice";
import { showErrorToast } from "../../utils/showErrorToast";

export default function WishlistButton({ productId, className = "", onChanged }) {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const ids = useSelector((state) => state.wishlist.ids);
  const loaded = useSelector((state) => state.wishlist.loaded);
  const pending = useSelector((state) => Boolean(state.wishlist.pendingIds[productId]));
  const saved = ids.includes(productId);
  const [loading, setLoading] = useState(false);

  const handleClick = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!user) {
      toast("Log in to save items");
      navigate("/login", { state: { from: location } });
      return;
    }

    if (!loaded || pending || loading) return;

    setLoading(true);
    try {
      const result = await dispatch(toggleWishlist({ productId, saved })).unwrap();
      toast.success(result.saved ? "Added to wishlist" : "Removed from wishlist");
      await onChanged?.(result.saved);
    } catch (message) {
      showErrorToast(message, "Unable to update your wishlist.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={Boolean(user) && (!loaded || pending || loading)}
      aria-pressed={saved}
      aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
      aria-busy={pending || loading}
      className={`tap inline-flex items-center justify-center rounded-full border border-[#e8e1d7] bg-white/95 text-[#8b3a3a] shadow-sm transition hover:bg-white disabled:cursor-wait disabled:opacity-70 ${className}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
      </svg>
    </button>
  );
}

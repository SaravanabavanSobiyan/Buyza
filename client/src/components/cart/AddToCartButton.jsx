import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { addToCart, openDrawer } from "../../store/cartSlice";
import Button from "../Button";
import { showErrorToast } from "../../utils/showErrorToast";

export default function AddToCartButton({
  productId,
  variantSku = null,
  quantity = 1,
  disabled = false,
  className = "",
  children = "Add to cart",
}) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state) => state.auth.user);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!user) {
      navigate("/login", {
        state: {
          from: location,
          pendingCartAction: { type: "addToCart", productId, variantSku, quantity },
        },
      });
      return;
    }

    try {
      setLoading(true);
      await dispatch(addToCart({ productId, variantSku, quantity })).unwrap();
      toast.success("Added to cart");
      dispatch(openDrawer());
    } catch (message) {
      showErrorToast(message, "Unable to add this item to your cart.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button type="button" onClick={handleClick} disabled={disabled} loading={loading}     className={`min-h-11 ${className}`}>
      {children}
    </Button>
  );
}

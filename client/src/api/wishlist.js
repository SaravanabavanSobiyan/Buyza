import api from "./axios";

export const fetchWishlistIds = async () => {
  const { data } = await api.get("/wishlist/ids");
  return data.ids;
};

export const fetchWishlist = async (params) => {
  const { data } = await api.get("/wishlist", { params });
  return data;
};

export const addWishlistItem = (productId) => api.put(`/wishlist/${productId}`);

export const removeWishlistItem = (productId) => api.delete(`/wishlist/${productId}`);

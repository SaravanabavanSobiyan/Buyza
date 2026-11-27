import api from "./axios";

export const getAdminProducts = async (params) => (await api.get("/admin/products", { params })).data.data;
export const getAdminProduct = async (id) => (await api.get(`/admin/products/${id}`)).data.data.product;
export const createProduct = async (payload) => (await api.post("/admin/products", payload)).data.data.product;
export const updateProduct = async ({ id, ...payload }) =>
  (await api.patch(`/admin/products/${id}`, payload)).data.data.product;
export const deleteProduct = async (id) => (await api.delete(`/admin/products/${id}`)).data;

export async function uploadProductImages(files) {
  const form = new FormData();
  files.forEach((f) => form.append("images", f));
  return (await api.post("/admin/uploads/product-images", form)).data.data.images;
}

import api from "./axios";

export const getAdminCategories = async () => (await api.get("/admin/categories")).data.data.categories;
export const createCategory = async (payload) => (await api.post("/admin/categories", payload)).data.data.category;
export const updateCategory = async ({ id, ...payload }) =>
  (await api.patch(`/admin/categories/${id}`, payload)).data.data.category;
export const deleteCategory = async (id) => (await api.delete(`/admin/categories/${id}`)).data;

export const getAdminBrands = async () => (await api.get("/admin/brands")).data.data.brands;
export const createBrand = async (payload) => (await api.post("/admin/brands", payload)).data.data.brand;
export const updateBrand = async ({ id, ...payload }) =>
  (await api.patch(`/admin/brands/${id}`, payload)).data.data.brand;
export const deleteBrand = async (id) => (await api.delete(`/admin/brands/${id}`)).data;

import api from "./axios";

export const getCategoryTree = async () => (await api.get("/categories")).data.data.categories;
export const getCategory = async (slug) => (await api.get(`/categories/${encodeURIComponent(slug)}`)).data.data;
export const getBrands = async () => (await api.get("/brands")).data.data.brands;
export const getProducts = async (params) => (await api.get("/products", { params })).data.data;
export const getProduct = async (slug) =>
  (await api.get(`/products/${encodeURIComponent(slug)}`)).data.data.product;
export const getHome = async () => (await api.get("/home")).data.data;

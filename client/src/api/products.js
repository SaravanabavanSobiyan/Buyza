import api from "./axios";

export const getProducts = async () => (await api.get("/products")).data.data.products;

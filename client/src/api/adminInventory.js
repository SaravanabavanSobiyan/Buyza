import api from "./axios";

export const getInventory = async (params) => (await api.get("/admin/inventory", { params })).data.data;
export const getStockAlerts = async () => (await api.get("/admin/inventory/alerts")).data.data;
export const adjustStock = async (payload) => (await api.post("/admin/inventory/adjust", payload)).data.data;
export const getStockHistory = async (params) => (await api.get("/admin/inventory/history", { params })).data.data;

import api, { setAccessToken } from "./axios";

export const updateProfile = async (payload) => (await api.patch("/users/me", payload)).data.data.user;

export async function uploadAvatar(file) {
  const form = new FormData();
  form.append("avatar", file);
  return (await api.patch("/users/me/avatar", form)).data.data.user;
}

export async function changePassword(payload) {
  const { data } = await api.put("/users/me/password", payload);
  setAccessToken(data.data.accessToken);
  return data;
}

export const getAddresses = async () => (await api.get("/addresses")).data.data.addresses;
export const createAddress = async (payload) => (await api.post("/addresses", payload)).data.data.address;
export const updateAddress = async ({ id, ...payload }) =>
  (await api.patch(`/addresses/${id}`, payload)).data.data.address;
export const setDefaultAddress = async (id) => (await api.patch(`/addresses/${id}/default`)).data.data.address;
export const deleteAddress = async (id) => (await api.delete(`/addresses/${id}`)).data;

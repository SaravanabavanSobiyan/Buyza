import api from "./axios";

const base = (productId) => `/products/${productId}/reviews`;
const multipart = { headers: { "Content-Type": "multipart/form-data" } };

export const fetchReviews = (productId, params) => api.get(base(productId), { params }).then((r) => r.data);

export const fetchEligibility = (productId) => api.get(`${base(productId)}/eligibility`).then((r) => r.data);

export const submitReview = (productId, formData) => api.post(base(productId), formData, multipart).then((r) => r.data.review);

export const updateReview = (productId, reviewId, formData) =>
  api.patch(`${base(productId)}/${reviewId}`, formData, multipart).then((r) => r.data.review);

export const deleteReview = (productId, reviewId) => api.delete(`${base(productId)}/${reviewId}`);

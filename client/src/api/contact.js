import api from './axios';

export const sendContactMessage = (body) => api.post('/contact', body).then((r) => r.data);

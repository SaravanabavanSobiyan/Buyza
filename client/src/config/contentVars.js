import { STORE } from './store';
import { POLICIES } from './policies';
import { formatPrice } from '../utils/formatPrice';

export const CONTENT_VARS = {
  storeName: STORE.name,
  email: STORE.email,
  phone: STORE.phone,
  phoneDigits: STORE.phone.replace(/[^\d+]/g, ''),
  address: STORE.address.join(', '),
  returnDays: String(POLICIES.returnDays),
  freeShippingThreshold: formatPrice(POLICIES.freeShippingThreshold),
  processingTime: POLICIES.processingTime,
  refundMethod: POLICIES.refundMethod,
  refundDays: POLICIES.refundDays,
  responseTime: POLICIES.responseTime,
  taxNote: POLICIES.taxNote,
  retention: POLICIES.retention,
};

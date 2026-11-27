export const POLICIES = {
  returnDays: 7,
  freeShippingThreshold: 5000000,
  processingTime: '1-2 business days',
  refundMethod: 'bank transfer',
  refundDays: '5-7 business days',
  responseTime: '1-2 business days',
  taxNote: 'Prices include any applicable taxes.',
  retention: 'as long as we need them to fulfil your orders and meet our legal and accounting duties',
};

export const SHIPPING_ZONES = [
  { zone: 'Colombo and suburbs', provinces: 'Western Province', fee: 40000, eta: '1-2 business days' },
  {
    zone: 'Major towns',
    provinces: 'Central Province, Southern Province, North Western Province, Sabaragamuwa Province',
    fee: 50000,
    eta: '2-4 business days',
  },
  {
    zone: 'Other areas',
    provinces: 'Northern Province, Eastern Province, North Central Province, Uva Province',
    fee: 50000,
    eta: '3-5 business days',
  },
];

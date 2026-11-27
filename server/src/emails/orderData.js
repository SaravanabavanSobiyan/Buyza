const iso = (v) => (v instanceof Date ? v.toISOString() : v ?? null);

export const orderEmailData = (order, extra = {}) => {
  const a = order.shippingAddress || {};
  return {
    orderNumber: order.orderNumber,
    isGuest: !order.user,
    items: order.items.map((i) => ({
      name: i.name,
      variantSku: i.variantSku || null,
      quantity: i.quantity,
      lineTotal: i.lineTotal,
    })),
    subtotal: order.subtotal,
    discount: order.discount || 0,
    shipping: order.shipping,
    total: order.total,
    shippingName: order.shippingMethod?.name || 'Delivery',
    etaMin: iso(order.shippingMethod?.etaMin),
    etaMax: iso(order.shippingMethod?.etaMax),
    address: {
      fullName: a.fullName,
      phone: a.phone,
      line1: a.line1,
      line2: a.line2,
      city: a.city,
      province: a.province,
      postalCode: a.postalCode,
    },
    paymentMethod: order.payment?.method,
    paymentStatus: order.payment?.status,
    ...extra,
  };
};

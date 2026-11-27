export const FAQ = {
  title: 'Frequently asked questions',
  description: 'Answers about ordering, delivery, payment, returns and your account at {{storeName}}.',
  intro: "Can't find what you need? [Contact us](/contact) and we'll help.",
  updated: '2026-11-22',
  groups: [
    { id: 'orders', title: 'Orders', items: [
      { id: 'place-order', q: 'How do I place an order?', a: 'Add products to your cart, go to checkout, enter your delivery address and place your order. You will get a confirmation email.' },
      { id: 'guest-checkout', q: 'Do I need an account to order?', a: 'No, you can check out as a guest. An account lets you see order history, save addresses and keep a wishlist.' },
      { id: 'cancel-order', q: 'Can I cancel my order?', a: 'Yes, from [My orders](/orders) while it is Pending or Processing. After it ships, [contact us](/contact) or refuse the delivery.' },
      { id: 'order-status', q: 'How do I check my order status?', a: 'Log in and open [My orders](/orders). Guest customers can [contact us](/contact) with their order number.' },
    ] },
    { id: 'delivery', title: 'Delivery', items: [
      { id: 'delivery-areas', q: 'Where do you deliver?', a: 'We deliver across Sri Lanka. Fees depend on the province, as shown on our [shipping page](/shipping).' },
      { id: 'delivery-time', q: 'How long does delivery take?', a: 'We dispatch orders within {{processingTime}}. Delivery then takes about 1 to 5 business days depending on your province.' },
      { id: 'delivery-cost', q: 'How much is delivery?', a: 'It depends on your province. The exact fee is shown at checkout before you pay. See the [shipping page](/shipping).' },
      { id: 'free-shipping', q: 'Is there free shipping?', a: 'Yes, on orders of {{freeShippingThreshold}} or more.' },
    ] },
    { id: 'payment', title: 'Payment', items: [
      { id: 'payment-methods', q: 'What payment methods do you accept?', a: 'Right now we accept cash on delivery. Card payments are not available yet.' },
      { id: 'cod-how', q: 'How does cash on delivery work?', a: 'You pay the courier in cash when your order arrives. Please keep the exact amount ready.' },
      { id: 'prices', q: 'What currency are prices in?', a: 'All prices are in Sri Lankan rupees (LKR). {{taxNote}}' },
    ] },
    { id: 'returns', title: 'Returns and refunds', items: [
      { id: 'return-how', q: 'How do I return something?', a: '[Contact us](/contact) within {{returnDays}} days of delivery. The full steps are on our [returns page](/returns).' },
      { id: 'refund-time', q: 'When will I get my refund?', a: 'By {{refundMethod}} within {{refundDays}} of us receiving and checking the item.' },
      { id: 'damaged-item', q: 'My item arrived damaged or wrong. What now?', a: '[Contact us](/contact) within 48 hours with your order number and photos. We will replace it or refund you.' },
    ] },
    { id: 'account', title: 'Your account', items: [
      { id: 'forgot-password', q: 'I forgot my password.', a: 'Use [Forgot password](/forgot-password) and we will email you a link to choose a new password.' },
      { id: 'who-can-review', q: 'Who can write a review?', a: 'Customers who have received the product. Once your order is delivered, you can use the review form on the product page.' },
      { id: 'wishlist', q: 'How does the wishlist work?', a: 'Use the heart on a product to save it. Your saved items are in your [wishlist](/wishlist).' },
      { id: 'delete-account', q: 'How do I delete my account?', a: 'Email us at [{{email}}](mailto:{{email}}) and we will delete your account and personal data. See our [privacy policy](/privacy#your-choices).' },
    ] },
  ],
};

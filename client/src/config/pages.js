import { SHIPPING_ZONES } from './policies';
import { formatPrice } from '../utils/formatPrice';

const UPDATED = '2026-11-22';

export const PAGES = {
  about: {
    path: '/about', title: 'About us',
    description: 'Learn who we are, what we sell and how we look after our customers at {{storeName}}.',
    intro: '{{storeName}} is a Sri Lankan online shop that delivers quality products to your door.',
    updated: UPDATED, toc: false,
    sections: [
      { id: 'who-we-are', heading: 'Who we are', blocks: [{ type: 'p', text: 'We started {{storeName}} to make shopping online simple and trustworthy for customers across Sri Lanka. Everything we sell is chosen with care, priced in rupees and sent by courier to your address.' }] },
      { id: 'what-to-expect', heading: 'What you can expect', blocks: [{ type: 'list', items: ['Clear prices in Sri Lankan rupees, with delivery shown before you pay.', 'Cash on delivery: you pay when your order arrives.', 'Honest reviews, written only by customers who bought and received the product.', 'Easy returns within {{returnDays}} days. See our [returns policy](/returns).', 'Friendly support: we reply within {{responseTime}}.'] }] },
      { id: 'get-in-touch', heading: 'Get in touch', blocks: [{ type: 'p', text: 'Email us at [{{email}}](mailto:{{email}}) or call [{{phone}}](tel:{{phoneDigits}}). You can also use our [contact form](/contact). Our address is {{address}}.' }] },
    ],
  },
  shipping: {
    path: '/shipping', title: 'Shipping and delivery',
    description: 'Delivery areas, fees, free shipping, delivery times and how cash on delivery works at {{storeName}}.',
    intro: 'We deliver across Sri Lanka by courier. Here is what to expect.',
    updated: UPDATED, toc: false,
    sections: [
      { id: 'fees-and-times', heading: 'Delivery fees and times', blocks: [
        { type: 'p', text: 'The fee depends on the province you are delivering to. You will see the exact fee and an estimated delivery date at checkout before you place your order.' },
        { type: 'table', caption: 'Delivery fees and estimated times by province', headers: ['Area', 'Provinces', 'Delivery fee', 'Estimated time'], rows: SHIPPING_ZONES.map((z) => [z.zone, z.provinces, formatPrice(z.fee), z.eta]) },
        { type: 'note', text: 'Estimated times count business days from when your order is dispatched, not from when you order. Public holidays and bad weather can cause delays.' },
      ] },
      { id: 'free-shipping', heading: 'Free shipping', blocks: [{ type: 'p', text: 'Orders of {{freeShippingThreshold}} or more ship free. Your checkout shows how much more you need to qualify.' }] },
      { id: 'processing', heading: 'Processing time', blocks: [{ type: 'p', text: 'We prepare and dispatch orders within {{processingTime}} of receiving them.' }] },
      { id: 'cash-on-delivery', heading: 'Cash on delivery', blocks: [{ type: 'p', text: 'You pay the courier in cash when your order arrives. Please keep the exact amount ready. The amount to pay is shown on your order confirmation.' }] },
      { id: 'tracking', heading: 'Tracking your order', blocks: [{ type: 'p', text: 'If you have an account, open [My orders](/orders) to see the status of every order. If you checked out as a guest, use the emails we send you, or [contact us](/contact) with your order number.' }] },
      { id: 'delivery-problems', heading: 'If something goes wrong', blocks: [{ type: 'list', items: ['Nobody home: the courier will try to call you. Please keep your phone on.', 'Wrong address: [contact us](/contact) as soon as possible so we can fix it before dispatch.', 'Damaged or missing items: see [what to do if there is a problem](/returns#damaged-or-wrong).'] }] },
    ],
  },
  returns: {
    path: '/returns', title: 'Returns and refunds',
    description: 'Our {{returnDays}}-day return policy: what you can return, how to send it back and when you will be refunded.',
    intro: 'Changed your mind or something is not right? You have {{returnDays}} days from delivery to ask for a return.',
    updated: UPDATED, toc: false,
    sections: [
      { id: 'what-can-be-returned', heading: 'What can be returned', blocks: [{ type: 'list', items: ['Items that are unused, in their original packaging and in the same condition you received them.', 'Requests made within {{returnDays}} days of delivery.', 'Items that came with proof of purchase, which is your order number.'] }, { type: 'p', text: 'Items marked "final sale" on the product page cannot be returned unless they are faulty.' }] },
      { id: 'how-to-return', heading: 'How to return an item', blocks: [{ type: 'list', ordered: true, items: ['[Contact us](/contact) within {{returnDays}} days of delivery with your order number and the reason for the return.', 'We will reply within {{responseTime}} with instructions on where to send the item.', 'Pack the item securely in its original packaging and send it to us.', 'When it arrives we check it and confirm your refund by email.'] }] },
      { id: 'refunds', heading: 'Refunds', blocks: [{ type: 'p', text: 'Approved refunds are paid by {{refundMethod}} within {{refundDays}} of us receiving and checking the item.' }, { type: 'p', text: 'Delivery fees are refunded only if the return is because of our mistake or a faulty item.' }] },
      { id: 'damaged-or-wrong', heading: 'Damaged, faulty or wrong items', blocks: [{ type: 'p', text: 'If your order arrives damaged, faulty or not what you ordered, [contact us](/contact) within 48 hours of delivery with photos and your order number.' }] },
      { id: 'cancelling', heading: 'Cancelling an order', blocks: [{ type: 'p', text: 'You can cancel an order yourself from [My orders](/orders) while its status is Pending or Processing. Once an order has shipped, refuse the delivery or [contact us](/contact).' }] },
    ],
  },
  terms: {
    path: '/terms', title: 'Terms of service',
    description: 'The terms that apply when you use {{storeName}} and place orders with us.',
    intro: 'Please read these terms before you use our website or place an order.',
    updated: UPDATED, toc: true,
    sections: [
      { id: 'acceptance', heading: '1. Accepting these terms', blocks: [{ type: 'p', text: 'By using this website or placing an order, you agree to these terms and to our [privacy policy](/privacy).' }] },
      { id: 'who-we-are', heading: '2. Who we are', blocks: [{ type: 'p', text: 'This website is operated by {{storeName}}, {{address}}. You can reach us at [{{email}}](mailto:{{email}}).' }] },
      { id: 'your-account', heading: '3. Your account', blocks: [{ type: 'p', text: 'You can order as a guest or create an account. Please give accurate information, keep your password private, and tell us if you think someone else has used your account.' }] },
      { id: 'orders', heading: '4. Orders', blocks: [{ type: 'p', text: 'Placing an order sends a confirmation email. We may cancel or limit an order if an item is out of stock, information contains an obvious mistake, or we suspect fraud.' }] },
      { id: 'prices-and-payment', heading: '5. Prices and payment', blocks: [{ type: 'p', text: 'Prices are shown in Sri Lankan rupees (LKR). {{taxNote}} Delivery fees are shown at checkout. We currently accept cash on delivery.' }] },
      { id: 'delivery', heading: '6. Delivery', blocks: [{ type: 'p', text: 'Delivery areas, fees and estimates are explained on our [shipping page](/shipping). Delivery dates are estimates, not guarantees.' }] },
      { id: 'returns-and-refunds', heading: '7. Returns, refunds and cancellations', blocks: [{ type: 'p', text: 'Our [returns policy](/returns) explains how to return an item and how refunds are paid.' }] },
      { id: 'reviews', heading: '8. Reviews and content you post', blocks: [{ type: 'p', text: 'Only customers who received a product can review it. Reviews must be honest and must not contain offensive, unlawful or misleading content.' }] },
      { id: 'intellectual-property', heading: '9. Our content', blocks: [{ type: 'p', text: 'The text, images, logos and design of this site belong to {{storeName}} or its licensors.' }] },
      { id: 'liability', heading: '10. Our responsibility', blocks: [{ type: 'p', text: 'We take care to keep the site accurate and available, but cannot promise that it will always be error-free or uninterrupted. Nothing in these terms limits rights under Sri Lankan consumer law.' }] },
      { id: 'changes', heading: '11. Changes to these terms', blocks: [{ type: 'p', text: 'We may update these terms. The date at the top shows when they last changed.' }] },
      { id: 'governing-law', heading: '12. Governing law', blocks: [{ type: 'p', text: 'These terms are governed by the laws of Sri Lanka.' }] },
      { id: 'contact', heading: '13. Contact', blocks: [{ type: 'p', text: 'Questions about these terms? Email [{{email}}](mailto:{{email}}) or use our [contact form](/contact).' }] },
    ],
  },
  privacy: {
    path: '/privacy', title: 'Privacy policy',
    description: 'What personal information {{storeName}} collects, why we collect it, who we share it with and your choices.',
    intro: 'This policy explains what we do with your personal information.',
    updated: UPDATED, toc: true,
    sections: [
      { id: 'who-we-are', heading: '1. Who we are', blocks: [{ type: 'p', text: '{{storeName}}, {{address}}, is responsible for the personal information described here. Contact us at [{{email}}](mailto:{{email}}).' }] },
      { id: 'what-we-collect', heading: '2. What we collect', blocks: [{ type: 'list', items: ['**Account details:** name, email address, phone number and a scrambled password.', '**Orders:** purchased items, delivery address, phone number and payment method.', '**Messages:** what you write in our contact form.', '**Reviews:** your review, rating and photos you upload.', '**Technical data:** your IP address for security and abuse prevention.'] }] },
      { id: 'how-we-use-it', heading: '3. How we use it', blocks: [{ type: 'list', items: ['To process, deliver and support your orders.', 'To send order emails and replies to your messages.', 'To run accounts, wishlists and reviews.', 'To keep the site secure and prevent fraud and spam.', 'To meet legal, tax and accounting duties.'] }] },
      { id: 'who-we-share-with', heading: '4. Who we share it with', blocks: [{ type: 'p', text: 'We share only what is needed with couriers, email providers, hosting and database providers, and image hosting providers.' }, { type: 'p', text: 'We do not sell your personal information.' }] },
      { id: 'cookies', heading: '5. Cookies and similar technologies', blocks: [{ type: 'p', text: 'We use a login session and browser storage for your cart. Google reCAPTCHA may set cookies on pages that use it.' }] },
      { id: 'how-long', heading: '6. How long we keep it', blocks: [{ type: 'p', text: 'We keep order records {{retention}}. Contact messages and account details are kept until you ask us to delete them.' }] },
      { id: 'security', heading: '7. Keeping it safe', blocks: [{ type: 'p', text: 'We use encrypted connections and limit access to customer data. Please use a strong, unique password.' }] },
      { id: 'your-choices', heading: '8. Your choices', blocks: [{ type: 'p', text: 'You can ask us to show, correct or delete your information. Email [{{email}}](mailto:{{email}}). We may need to keep legally required order records.' }] },
      { id: 'children', heading: '9. Children', blocks: [{ type: 'p', text: 'Our shop is not meant for children under 16, and we do not knowingly collect their information.' }] },
      { id: 'changes', heading: '10. Changes to this policy', blocks: [{ type: 'p', text: 'We will update this page when our practices change. The date at the top shows the latest version.' }] },
      { id: 'contact', heading: '11. Contact', blocks: [{ type: 'p', text: 'Questions or concerns? Email [{{email}}](mailto:{{email}}) or use our [contact form](/contact).' }] },
    ],
  },
};

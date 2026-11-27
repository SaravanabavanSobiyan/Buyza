import Address from "../models/Address.js";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import ShippingMethod from "../models/ShippingMethod.js";
import { ApiError } from "../utils/ApiError.js";
import { checkoutAddressSchema } from "../validators/checkout.validators.js";
import { findSellable, MAX_QTY_PER_ITEM } from "./cart.service.js";
import { calculateShippingRate } from "./shipping.service.js";

const PRODUCT_FIELDS = "name slug images price stock isActive isDeleted variants";

async function resolveAddress(user, body, session) {
  if (body.addressId) {
    if (!user) throw new ApiError(400, "A saved address requires an authenticated account");
    const savedAddress = await Address.findOne({ _id: body.addressId, user: user._id })
      .session(session)
      .lean();
    if (!savedAddress) throw new ApiError(404, "Saved address not found");
    const parsedAddress = checkoutAddressSchema.safeParse(savedAddress);
    if (!parsedAddress.success) {
      throw new ApiError(400, "Your saved address is incomplete or invalid; update it before checkout");
    }
    return parsedAddress.data;
  }

  if (!body.address) throw new ApiError(400, "Provide a delivery address or saved address ID");
  return body.address;
}

async function getCartItems(user, body, session) {
  if (body.buyNow) {
    if (!body.items || body.items.length !== 1) {
      throw new ApiError(400, "Buy now checkout requires exactly one item");
    }
    return body.items;
  }

  if (user) {
    if (body.items) throw new ApiError(400, "Authenticated customers use their saved cart");
    const cart = await Cart.findOne({ user: user._id }).session(session).lean();
    return (cart?.items || []).map((item) => ({
      _id: item._id,
      productId: String(item.product),
      variantSku: item.variantSku || null,
      quantity: item.quantity,
    }));
  }

  if (!body.email) throw new ApiError(400, "Email is required for guest checkout");
  if (!body.items) throw new ApiError(400, "Cart items are required for guest checkout");
  return body.items;
}

async function priceCheckoutItems(items, session) {
  if (items.length === 0) {
    return { lines: [], problems: [{ type: "cart", message: "Your cart is empty" }], subtotal: 0 };
  }

  const productIds = [...new Set(items.map((item) => item.productId))];
  const products = await Product.find({ _id: { $in: productIds } })
    .select(PRODUCT_FIELDS)
    .session(session);
  const productsById = new Map(products.map((product) => [String(product._id), product]));
  const problems = [];
  let subtotal = 0;

  const mergedItems = new Map();
  for (const item of items) {
    const key = `${item.productId}__${item.variantSku || "none"}`;
    const previous = mergedItems.get(key);
    mergedItems.set(key, {
      ...item,
      _id: previous?._id || item._id,
      quantity: (previous?.quantity || 0) + item.quantity,
    });
  }

  const lines = [...mergedItems.values()].map((item) => {
    const product = productsById.get(item.productId);
    let unitPrice = product?.price ?? 0;
    let stock = 0;
    let problem = null;
    const sellable = findSellable(product, item.variantSku);

    if (item.quantity > MAX_QTY_PER_ITEM) {
      problem = `You can only buy up to ${MAX_QTY_PER_ITEM} of one item`;
    } else if (!sellable && !product) {
      problem = "Product is no longer available";
    } else if (!sellable && (!product.isActive || product.isDeleted)) {
      problem = "Product is no longer available";
    } else if (!sellable && product.variants?.length) {
      if (!item.variantSku) {
        problem = "Select a product variant";
      } else if (!product.variants.some((entry) => entry.sku === item.variantSku)) {
        problem = "Selected variant is no longer available";
      }
    } else if (!sellable && item.variantSku) {
      problem = "This product has no variants";
    }

    if (sellable) {
      stock = sellable.stock;
      unitPrice = sellable.unitPrice;
      if (stock <= 0) problem = "Out of stock";
      else if (item.quantity > stock) problem = `Only ${stock} left in stock`;
    }

    const lineTotal = unitPrice * item.quantity;
    if (problem) {
      problems.push({
        type: "line",
        lineId: item._id ? String(item._id) : undefined,
        productId: item.productId,
        variantSku: item.variantSku,
        message: problem,
      });
    } else {
      subtotal += lineTotal;
    }

    return {
      _id: item._id ? String(item._id) : `${item.productId}__${item.variantSku || "none"}`,
      productId: item.productId,
      product: product
        ? {
            _id: String(product._id),
            name: product.name,
            slug: product.slug,
            image: product.images?.[0]?.url || null,
          }
        : null,
      variantSku: item.variantSku || null,
      quantity: item.quantity,
      unitPrice,
      stock,
      lineTotal,
      isAvailable: !problem,
      problem,
    };
  });

  return { lines, problems, subtotal };
}

export async function createCheckoutQuote(user, body, now = new Date(), session = null) {
  let selectedMethod = null;
  if (body.shippingMethodId) {
    selectedMethod = await ShippingMethod.findById(body.shippingMethodId)
      .session(session)
      .lean();
    if (!selectedMethod) throw new ApiError(400, "Unknown shipping method");
    if (!selectedMethod.isActive) throw new ApiError(400, "Shipping method is inactive");
  }

  const address = await resolveAddress(user, body, session);
  const cartItems = await getCartItems(user, body, session);
  const pricedCart = await priceCheckoutItems(cartItems, session);
  const methods = await ShippingMethod.find({ isActive: true })
    .sort({ sortOrder: 1, name: 1 })
    .session(session)
    .lean();
  const shippingOptions = methods.map((method) => {
    const rate = calculateShippingRate(method, address.province, pricedCart.subtotal, now);
    const threshold = method.freeShippingThreshold;
    return {
      _id: String(method._id),
      code: method.code,
      name: method.name,
      description: method.description,
      ...rate,
      freeShippingThreshold: threshold,
      amountToFreeShipping:
        threshold == null || rate.isFree ? null : Math.max(0, threshold - pricedCart.subtotal + 1),
    };
  });

  const selectedShippingMethod = selectedMethod
    ? shippingOptions.find((option) => option._id === String(selectedMethod._id))
    : null;

  const shipping = selectedShippingMethod?.price ?? 0;
  const thresholdOption = selectedShippingMethod || shippingOptions[0];
  return {
    address,
    email: user ? undefined : body.email,
    pricedLines: pricedCart.lines,
    problems: pricedCart.problems,
    shippingOptions,
    selectedShippingMethod,
    freeShippingThreshold: thresholdOption?.freeShippingThreshold ?? null,
    amountToFreeShipping: thresholdOption?.amountToFreeShipping ?? null,
    totals: {
      subtotal: pricedCart.subtotal,
      shipping,
      total: pricedCart.subtotal + shipping,
    },
    canCheckout: pricedCart.problems.length === 0 && shippingOptions.length > 0,
  };
}

import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import { ApiError } from "../utils/ApiError.js";

export const MAX_QTY_PER_ITEM = 10;
const PRODUCT_FIELDS = "name slug images price stock isActive isDeleted variants";

const round2 = (value) => Math.round(value * 100) / 100;

export function findSellable(product, variantSku) {
  if (!product || !product.isActive || product.isDeleted) return null;

  const hasVariants = product.variants?.length > 0;
  if (hasVariants) {
    if (!variantSku) return null;
    const variant = product.variants.find((item) => item.sku === variantSku);
    if (!variant) return null;
    return { unitPrice: variant.price ?? product.price, stock: variant.stock };
  }

  if (variantSku) return null;
  return { unitPrice: product.price, stock: product.stock };
}

function resolveSellable(product, variantSku) {
  if (!product || !product.isActive || product.isDeleted) {
    throw new ApiError(404, "Product not found or unavailable");
  }
  const hasVariants = product.variants?.length > 0;
  if (hasVariants) {
    if (!variantSku) throw new ApiError(400, "Please select a variant");
    const variant = product.variants.find((item) => item.sku === variantSku);
    if (!variant) throw new ApiError(400, "Selected variant does not exist");
    return { unitPrice: variant.price ?? product.price, stock: variant.stock };
  }

  if (variantSku) throw new ApiError(400, "This product has no variants");
  return { unitPrice: product.price, stock: product.stock };
}

const sameLine = (item, productId, variantSku) =>
  item.product.toString() === productId.toString() &&
  (item.variantSku || null) === (variantSku || null);

const getOrCreateCart = (userId) =>
  Cart.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId, items: [] } },
    { upsert: true, new: true }
  );

function buildResponse(lines) {
  let subtotal = 0;
  let itemCount = 0;

  const items = lines
    .filter((item) => item.product)
    .map((item) => {
      const product = item.product;
      let unitPrice = product.price;
      let stock = product.stock;
      let isAvailable = product.isActive && !product.isDeleted;
      let canAdjustQuantity = isAvailable;
      const hasVariants = product.variants?.length > 0;

      if (hasVariants && !item.variantSku) {
        isAvailable = false;
        canAdjustQuantity = false;
      }

      if (item.variantSku) {
        const variant = product.variants?.find((entry) => entry.sku === item.variantSku);
        if (variant) {
          unitPrice = variant.price ?? product.price;
          stock = variant.stock;
        } else {
          isAvailable = false;
          canAdjustQuantity = false;
        }
      }

      if (stock <= 0) canAdjustQuantity = false;
      if (stock < item.quantity) isAvailable = false;

      const lineTotal = round2(unitPrice * item.quantity);
      if (isAvailable) {
        subtotal += lineTotal;
        itemCount += item.quantity;
      }

      return {
        _id: item._id,
        product: {
          _id: product._id,
          name: product.name,
          slug: product.slug,
          image: product.images?.[0]?.url || null,
        },
        variantSku: item.variantSku || null,
        quantity: item.quantity,
        unitPrice,
        stock,
        lineTotal,
        isAvailable,
        canAdjustQuantity,
      };
    });

  subtotal = round2(subtotal);
  const shipping = 0;
  const discount = 0;
  const total = round2(subtotal + shipping - discount);

  return { items, itemCount, subtotal, shipping, discount, total };
}

export const buildCartResponse = async (userId) => {
  const cart = await Cart.findOne({ user: userId }).populate({
    path: "items.product",
    select: PRODUCT_FIELDS,
  });

  const response = buildResponse(cart?.items || []);
  return cart ? { _id: cart._id, ...response } : response;
};

export const getCart = (userId) => buildCartResponse(userId);

export const previewCart = async (guestItems) => {
  const mergedItems = new Map();
  for (const item of guestItems) {
    const key = `${item.productId}__${item.variantSku || "none"}`;
    const previous = mergedItems.get(key);
    mergedItems.set(key, {
      ...item,
      quantity: Math.min((previous?.quantity || 0) + item.quantity, MAX_QTY_PER_ITEM),
    });
  }
  const uniqueItems = [...mergedItems.entries()];
  if (uniqueItems.length === 0) return buildResponse([]);

  const productIds = [...new Set(uniqueItems.map(([, item]) => item.productId))];
  const products = await Product.find({ _id: { $in: productIds } }).select(PRODUCT_FIELDS);
  const productsById = new Map(products.map((product) => [product._id.toString(), product]));

  return buildResponse(
    uniqueItems.map(([key, item]) => ({
      _id: key,
      product: productsById.get(item.productId) || null,
      variantSku: item.variantSku || null,
      quantity: item.quantity,
    }))
  );
};

export const mergeCart = async (userId, guestItems) => {
  const cart = await getOrCreateCart(userId);
  const notes = [];

  for (const guestItem of guestItems) {
    const product = await Product.findById(guestItem.productId);
    const sellable = findSellable(product, guestItem.variantSku);
    if (!sellable) {
      notes.push(`${product?.name || "An item"} is no longer available and was not added to your cart`);
      continue;
    }

    const { unitPrice, stock } = sellable;
    const existing = cart.items.find((item) =>
      sameLine(item, guestItem.productId, guestItem.variantSku)
    );
    const wanted = (existing?.quantity || 0) + guestItem.quantity;
    const finalQuantity = Math.min(wanted, stock, MAX_QTY_PER_ITEM);

    if (finalQuantity < 1) {
      notes.push(`${product.name} is out of stock and was not added to your cart`);
      continue;
    }
    if (finalQuantity < wanted) {
      notes.push(`${product.name}: quantity was reduced to ${finalQuantity} because of limited stock`);
    }

    if (existing) {
      existing.quantity = finalQuantity;
      existing.priceSnapshot = unitPrice;
    } else {
      cart.items.push({
        product: guestItem.productId,
        variantSku: guestItem.variantSku || null,
        quantity: finalQuantity,
        priceSnapshot: unitPrice,
      });
    }
  }

  await cart.save();
  return { cart: await buildCartResponse(userId), notes };
};

export const addItem = async (userId, { productId, variantSku = null, quantity = 1 }) => {
  const product = await Product.findById(productId);
  const { unitPrice, stock } = resolveSellable(product, variantSku);

  const cart = await getOrCreateCart(userId);
  const existing = cart.items.find((item) => sameLine(item, productId, variantSku));
  const newQuantity = (existing?.quantity || 0) + quantity;

  if (newQuantity > MAX_QTY_PER_ITEM) {
    throw new ApiError(400, `You can only buy up to ${MAX_QTY_PER_ITEM} of one item`);
  }
  if (newQuantity > stock) {
    throw new ApiError(400, stock === 0 ? "Out of stock" : `Only ${stock} left in stock`);
  }

  if (existing) {
    existing.quantity = newQuantity;
    existing.priceSnapshot = unitPrice;
  } else {
    cart.items.push({ product: productId, variantSku, quantity, priceSnapshot: unitPrice });
  }

  await cart.save();
  return buildCartResponse(userId);
};

export const updateItem = async (userId, itemId, quantity) => {
  const cart = await getOrCreateCart(userId);
  const item = cart.items.id(itemId);
  if (!item) throw new ApiError(404, "Cart item not found");

  if (quantity === 0) {
    cart.items.pull(itemId);
  } else {
    const product = await Product.findById(item.product);
    const { unitPrice, stock } = resolveSellable(product, item.variantSku);

    if (quantity > MAX_QTY_PER_ITEM) {
      throw new ApiError(400, `You can only buy up to ${MAX_QTY_PER_ITEM} of one item`);
    }
    if (quantity > stock) {
      throw new ApiError(400, stock === 0 ? "Out of stock" : `Only ${stock} left in stock`);
    }

    item.quantity = quantity;
    item.priceSnapshot = unitPrice;
  }

  await cart.save();
  return buildCartResponse(userId);
};

export const removeItem = async (userId, itemId) => {
  const cart = await getOrCreateCart(userId);
  if (!cart.items.id(itemId)) throw new ApiError(404, "Cart item not found");
  cart.items.pull(itemId);
  await cart.save();
  return buildCartResponse(userId);
};

export const clearCart = async (userId) => {
  await Cart.updateOne({ user: userId }, { $set: { items: [] } });
  return buildCartResponse(userId);
};

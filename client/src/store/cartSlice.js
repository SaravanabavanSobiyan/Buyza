import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";
import api from "../api/axios";
import { setUser } from "./authSlice";
import {
  clearGuestItems,
  lineKey,
  MAX_GUEST_ITEMS,
  MAX_QTY,
  readGuestItems,
  writeGuestItems,
} from "../utils/guestCart";

const emptyCart = { items: [], itemCount: 0, subtotal: 0, shipping: 0, discount: 0, total: 0 };
let guestMergeInFlight = null;

const errorMessage = (error) => error?.response?.data?.message || error?.message || "Something went wrong.";
const cartScope = (user) => user?.id || user?._id || "guest";

const previewGuestCart = async (items, changedLineKey) => {
  if (items.length === 0) return emptyCart;

  const { data } = await api.post("/cart/preview", { items });
  if (changedLineKey) {
    const item = data.cart.items.find((line) => line._id === changedLineKey);
    if (!item) throw new Error("Product not found or unavailable");
    if (!item.isAvailable) {
      if (item.stock === 0) throw new Error("Out of stock");
      if (item.stock < item.quantity) throw new Error(`Only ${item.stock} left in stock`);
      throw new Error("This item is unavailable");
    }
  }
  return data.cart;
};

const fetchGuestCart = async () => {
  const items = readGuestItems();
  if (items.length === 0) return emptyCart;

  const { data } = await api.post("/cart/preview", { items });
  const aliveKeys = new Set(data.cart.items.map((item) => item._id));
  const remaining = items.filter((item) => aliveKeys.has(lineKey(item.productId, item.variantSku)));
  if (remaining.length !== items.length) writeGuestItems(remaining);
  return data.cart;
};

const addGuestItem = async ({ productId, variantSku = null, quantity = 1 }) => {
  const items = readGuestItems();
  const key = lineKey(productId, variantSku);
  const existing = items.find((item) => lineKey(item.productId, item.variantSku) === key);
  const newQuantity = (existing?.quantity || 0) + quantity;

  if (newQuantity > MAX_QTY) throw new Error(`You can only buy up to ${MAX_QTY} of one item`);
  if (!existing && items.length >= MAX_GUEST_ITEMS) {
    throw new Error(`Your guest cart can contain up to ${MAX_GUEST_ITEMS} different items`);
  }

  const next = existing
    ? items.map((item) => (item === existing ? { ...item, quantity: newQuantity } : item))
    : [...items, { productId, variantSku, quantity }];
  const cart = await previewGuestCart(next, key);
  writeGuestItems(next);
  return cart;
};

const updateGuestItem = async ({ itemId, quantity }) => {
  const items = readGuestItems();
  const existing = items.find((item) => lineKey(item.productId, item.variantSku) === itemId);
  if (!existing) throw new Error("Cart item not found");
  if (quantity > MAX_QTY) throw new Error(`You can only buy up to ${MAX_QTY} of one item`);

  const next = quantity === 0
    ? items.filter((item) => item !== existing)
    : items.map((item) => (item === existing ? { ...item, quantity } : item));
  const cart = await previewGuestCart(next, quantity === 0 ? null : itemId);
  writeGuestItems(next);
  return cart;
};

const removeGuestItem = async (itemId) => {
  const items = readGuestItems();
  const next = items.filter((item) => lineKey(item.productId, item.variantSku) !== itemId);
  const cart = await previewGuestCart(next, null);
  writeGuestItems(next);
  return cart;
};

const clearGuestCart = () => {
  clearGuestItems();
  return emptyCart;
};

const makeThunk = (type, userRequest, guestRequest) =>
  createAsyncThunk(type, async (arg, { getState, rejectWithValue }) => {
    const user = getState().auth.user;
    const scope = cartScope(user);
    try {
      if (!user) return { cart: await guestRequest(arg), scope };
      const { data } = await userRequest(arg);
      return { cart: data.cart, scope };
    } catch (error) {
      return rejectWithValue(errorMessage(error), { scope });
    }
  });

export const fetchCart = makeThunk("cart/fetch", () => api.get("/cart"), fetchGuestCart);
export const addToCart = makeThunk("cart/add", (body) => api.post("/cart/items", body), addGuestItem);
export const updateCartItem = makeThunk(
  "cart/update",
  ({ itemId, quantity }) => api.patch(`/cart/items/${itemId}`, { quantity }),
  updateGuestItem
);
export const removeCartItem = makeThunk(
  "cart/remove",
  (itemId) => api.delete(`/cart/items/${itemId}`),
  removeGuestItem
);
export const clearCart = makeThunk("cart/clear", () => api.delete("/cart"), clearGuestCart);

export const mergeGuestCart = createAsyncThunk(
  "cart/merge",
  async (_, { getState, rejectWithValue }) => {
    const scope = cartScope(getState().auth.user);
    if (guestMergeInFlight?.scope === scope) {
      try {
        return await guestMergeInFlight.promise;
      } catch (error) {
        return rejectWithValue(errorMessage(error), { scope });
      }
    }

    const promise = (async () => {
      const items = readGuestItems();
      if (items.length === 0) {
        const { data } = await api.get("/cart");
        return { cart: data.cart, notes: [], scope };
      }

      clearGuestItems();
      try {
        const { data } = await api.post("/cart/merge", { items });
        return { cart: data.cart, notes: data.notes || [], scope };
      } catch (error) {
        writeGuestItems(items);
        throw error;
      }
    })();

    guestMergeInFlight = { scope, promise };
    try {
      return await promise;
    } catch (error) {
      return rejectWithValue(errorMessage(error), { scope });
    } finally {
      if (guestMergeInFlight?.promise === promise) guestMergeInFlight = null;
    }
  }
);

const cartThunks = [fetchCart, addToCart, updateCartItem, removeCartItem, clearCart];
const allThunks = [...cartThunks, mergeGuestCart];

const cartSlice = createSlice({
  name: "cart",
  initialState: {
    cart: emptyCart,
    scope: "guest",
    loaded: false,
    status: "idle",
    error: null,
    drawerOpen: false,
  },
  reducers: {
    openDrawer(state) {
      state.drawerOpen = true;
    },
    closeDrawer(state) {
      state.drawerOpen = false;
    },
    resetCart(state) {
      state.cart = emptyCart;
      state.scope = "guest";
      state.loaded = false;
      state.status = "idle";
      state.error = null;
      state.drawerOpen = false;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(setUser, (state, action) => {
        const scope = cartScope(action.payload);
        if (state.scope !== scope) {
          state.scope = scope;
          state.cart = emptyCart;
          state.loaded = false;
          state.status = "idle";
          state.error = null;
          state.drawerOpen = false;
        }
      })
      .addCase(mergeGuestCart.fulfilled, (state, action) => {
        if (action.payload.scope === state.scope) {
          state.status = "idle";
          state.loaded = true;
          state.cart = action.payload.cart;
        }
      })
      .addMatcher(isAnyOf(...allThunks.map((thunk) => thunk.pending)), (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addMatcher(isAnyOf(...cartThunks.map((thunk) => thunk.fulfilled)), (state, action) => {
        if (action.payload.scope === state.scope) {
          state.status = "idle";
          state.loaded = true;
          state.cart = action.payload.cart;
        }
      })
      .addMatcher(isAnyOf(...allThunks.map((thunk) => thunk.rejected)), (state, action) => {
        const scope = action.meta.rejectedMeta?.scope;
        if (scope === state.scope) {
          state.status = "failed";
          state.loaded = true;
          state.error = action.payload || "Something went wrong.";
        }
      });
  },
});

export const { openDrawer, closeDrawer, resetCart } = cartSlice.actions;
export default cartSlice.reducer;

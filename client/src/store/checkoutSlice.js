import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api, { getErrorMessage } from "../api/axios";
import { requestQuote } from "../api/checkout";
import { clearGuestItems, readGuestItems } from "../utils/guestCart";

const LAST_ORDER_KEY = "last_order";
const BUY_NOW_KEY = "buy_now_v1";

const readStoredOrder = () => {
  try {
    return { order: JSON.parse(sessionStorage.getItem(LAST_ORDER_KEY) || "null"), warning: null };
  } catch {
    return {
      order: null,
      warning: "The previous order could not be restored from this browser.",
    };
  }
};

const readBuyNowItem = () => {
  try {
    const item = JSON.parse(sessionStorage.getItem(BUY_NOW_KEY) || "null");
    if (
      item &&
      typeof item.productId === "string" &&
      Number.isInteger(item.quantity) &&
      item.quantity > 0
    ) {
      return item;
    }
  } catch {
    return null;
  }
  return null;
};

export const saveBuyNowItem = (item) => {
  sessionStorage.setItem(BUY_NOW_KEY, JSON.stringify(item));
};

const clearStoredBuyNowItem = () => {
  try {
    sessionStorage.removeItem(BUY_NOW_KEY);
    return true;
  } catch {
    return false;
  }
};

export const fetchQuote = createAsyncThunk(
  "checkout/quote",
  async (shippingMethodId, { getState, rejectWithValue }) => {
    try {
      const { auth, checkout } = getState();
      const request = {
        address: checkout.address,
        addressId: checkout.addressId,
        email: auth.user ? undefined : checkout.email,
        items: checkout.buyNowItem
          ? [
              {
                productId: checkout.buyNowItem.productId,
                variantSku: checkout.buyNowItem.variantSku || null,
                quantity: checkout.buyNowItem.quantity,
              },
            ]
          : auth.user
            ? undefined
            : readGuestItems(),
        buyNow: Boolean(checkout.buyNowItem),
        shippingMethodId: shippingMethodId || undefined,
      };
      let quote = await requestQuote(request);
      if (!shippingMethodId && quote.options.length > 0) {
        quote = await requestQuote({ ...request, shippingMethodId: quote.options[0].id });
      }
      return quote;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Could not get delivery options."));
    }
  }
);

export const placeOrder = createAsyncThunk(
  "checkout/placeOrder",
  async (_, { dispatch, getState, rejectWithValue }) => {
    const { auth, checkout } = getState();
    const buyNow = Boolean(checkout.buyNowItem);
    let order;
    try {
      const { data } = await api.post(
        "/orders",
        {
          address: checkout.addressId ? undefined : checkout.address,
          addressId: checkout.addressId || undefined,
          email: auth.user ? undefined : checkout.email,
          items: checkout.buyNowItem
            ? [
                {
                  productId: checkout.buyNowItem.productId,
                  variantSku: checkout.buyNowItem.variantSku || null,
                  quantity: checkout.buyNowItem.quantity,
                },
              ]
            : auth.user
              ? undefined
              : readGuestItems(),
          buyNow,
          shippingMethodId: checkout.selectedShippingId,
          paymentMethod: checkout.paymentMethod,
        },
        { headers: { "Idempotency-Key": checkout.idempotencyKey } }
      );
      order = data.order;
    } catch (error) {
      return rejectWithValue({
        message: getErrorMessage(error, "Could not place your order. Please try again."),
        status: error?.response?.status,
      });
    }

    const warnings = [];
    try {
      sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
    } catch {
      warnings.push("Your order was placed, but it may not remain visible after a page refresh.");
    }

    if (buyNow) {
      if (!clearStoredBuyNowItem()) {
        warnings.push("Your order was placed, but this browser could not clear the Buy now selection.");
      }
      dispatch(clearBuyNowItem());
    } else if (!auth.user) {
      try {
        clearGuestItems();
      } catch {
        warnings.push("Your order was placed, but this browser could not clear its saved cart.");
      }
    }

    return { order, warning: warnings.join(" ") || null };
  }
);

const storedOrder = readStoredOrder();
const initialState = {
  address: null,
  addressId: null,
  buyNowItem: readBuyNowItem(),
  email: "",
  quote: null,
  selectedShippingId: null,
  paymentMethod: "cod",
  idempotencyKey: null,
  lastOrder: storedOrder.order,
  lastOrderWarning: storedOrder.warning,
  status: "idle",
  error: null,
  activeRequestId: null,
  placing: false,
  placeError: null,
};

const checkoutSlice = createSlice({
  name: "checkout",
  initialState,
  reducers: {
    setAddress(state, action) {
      state.address = action.payload;
      state.idempotencyKey = null;
    },
    setAddressId(state, action) {
      state.addressId = action.payload;
      state.idempotencyKey = null;
    },
    setBuyNowItem(state, action) {
      state.buyNowItem = action.payload;
      state.address = null;
      state.addressId = null;
      state.quote = null;
      state.selectedShippingId = null;
      state.idempotencyKey = null;
    },
    clearBuyNowItem(state) {
      state.buyNowItem = null;
    },
    setEmail(state, action) {
      state.email = action.payload;
    },
    selectShipping(state, action) {
      state.selectedShippingId = action.payload;
      state.idempotencyKey = null;
    },
    selectPayment(state, action) {
      state.paymentMethod = action.payload;
    },
    ensureIdempotencyKey: {
      reducer(state, action) {
        if (!state.idempotencyKey) state.idempotencyKey = action.payload;
      },
      prepare() {
        return { payload: crypto.randomUUID() };
      },
    },
    clearQuote(state) {
      state.quote = null;
      state.selectedShippingId = null;
      state.idempotencyKey = null;
      state.error = null;
      state.status = "idle";
      state.activeRequestId = null;
    },
    resetCheckout(state) {
      return {
        ...initialState,
        buyNowItem: null,
        lastOrder: state.lastOrder,
        lastOrderWarning: state.lastOrderWarning,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchQuote.pending, (state, action) => {
        state.status = "loading";
        state.error = null;
        state.activeRequestId = action.meta.requestId;
      })
      .addCase(fetchQuote.fulfilled, (state, action) => {
        if (state.activeRequestId !== action.meta.requestId) return;
        const { payload } = action;
        state.status = "idle";
        state.quote = payload;
        state.activeRequestId = null;
        const ids = payload.options.map((option) => option.id);
        const selected = [payload.selectedId, state.selectedShippingId].find(
          (id) => id && ids.includes(id)
        );
        state.selectedShippingId = selected ?? ids[0] ?? null;
      })
      .addCase(fetchQuote.rejected, (state, action) => {
        if (state.activeRequestId !== action.meta.requestId) return;
        state.status = "failed";
        state.error = action.payload || "Could not get delivery options.";
        state.activeRequestId = null;
      })
      .addCase(placeOrder.pending, (state) => {
        state.placing = true;
        state.placeError = null;
      })
      .addCase(placeOrder.fulfilled, (state, { payload }) => {
        state.placing = false;
        state.lastOrder = payload.order;
        state.lastOrderWarning = payload.warning;
      })
      .addCase(placeOrder.rejected, (state, { payload }) => {
        state.placing = false;
        state.placeError = payload || { message: "Could not place your order." };
      });
  },
});

export const {
  setAddress,
  setAddressId,
  setBuyNowItem,
  clearBuyNowItem,
  setEmail,
  selectShipping,
  selectPayment,
  ensureIdempotencyKey,
  clearQuote,
  resetCheckout,
} = checkoutSlice.actions;
export default checkoutSlice.reducer;

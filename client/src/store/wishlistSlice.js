import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getErrorMessage } from "../api/axios";
import {
  addWishlistItem,
  fetchWishlistIds as requestWishlistIds,
  removeWishlistItem,
} from "../api/wishlist";
import { setUser } from "./authSlice";

const initialState = {
  ids: [],
  loaded: false,
  status: "idle",
  pendingIds: {},
  previousValues: {},
  pendingRequestIds: {},
  userId: null,
  fetchRequestId: null,
};

export const fetchWishlistIds = createAsyncThunk(
  "wishlist/fetchIds",
  async (_, { getState, rejectWithValue }) => {
    const user = getState().auth.user;
    const userId = user?.id || user?._id || null;
    try {
      return { ids: await requestWishlistIds(), userId };
    } catch (error) {
      return rejectWithValue({ message: getErrorMessage(error), userId });
    }
  }
);

export const toggleWishlist = createAsyncThunk(
  "wishlist/toggle",
  async ({ productId, saved }, { getState, rejectWithValue }) => {
    const userId = getState().wishlist.userId;
    try {
      if (saved) await removeWishlistItem(productId);
      else await addWishlistItem(productId);
      return { productId, saved: !saved, userId };
    } catch (error) {
      return rejectWithValue({ message: getErrorMessage(error), userId });
    }
  },
  {
    condition: ({ productId }, { getState }) => !getState().wishlist.pendingIds[productId],
  }
);

const wishlistSlice = createSlice({
  name: "wishlist",
  initialState,
  reducers: {
    resetWishlist() {
      return initialState;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(setUser, (state, action) => {
        if (!action.payload) return initialState;
        const nextUserId = action.payload.id || action.payload._id;
        if (state.userId && state.userId !== nextUserId) return { ...initialState, userId: nextUserId };
        state.userId = nextUserId;
      })
      .addCase(fetchWishlistIds.pending, (state, action) => {
        state.status = "loading";
        state.fetchRequestId = action.meta.requestId;
      })
      .addCase(fetchWishlistIds.fulfilled, (state, action) => {
        if (state.userId !== action.payload.userId || state.fetchRequestId !== action.meta.requestId) return;
        state.ids = action.payload.ids;
        state.loaded = true;
        state.status = "idle";
        state.fetchRequestId = null;
      })
      .addCase(fetchWishlistIds.rejected, (state, action) => {
        if (state.userId !== action.payload?.userId || state.fetchRequestId !== action.meta.requestId) return;
        state.loaded = true;
        state.status = "failed";
        state.fetchRequestId = null;
      })
      .addCase(toggleWishlist.pending, (state, action) => {
        const { productId, saved } = action.meta.arg;
        state.pendingIds[productId] = true;
        state.previousValues[productId] = saved;
        state.pendingRequestIds[productId] = action.meta.requestId;
        state.ids = saved ? state.ids.filter((id) => id !== productId) : [...state.ids, productId];
      })
      .addCase(toggleWishlist.fulfilled, (state, action) => {
        const { productId, userId } = action.payload;
        if (state.userId !== userId || state.pendingRequestIds[productId] !== action.meta.requestId) return;
        delete state.pendingIds[productId];
        delete state.previousValues[productId];
        delete state.pendingRequestIds[productId];
      })
      .addCase(toggleWishlist.rejected, (state, action) => {
        if (action.meta.condition) return;
        const { productId } = action.meta.arg;
        if (
          state.userId !== action.payload?.userId ||
          state.pendingRequestIds[productId] !== action.meta.requestId
        ) return;
        if (state.previousValues[productId]) {
          if (!state.ids.includes(productId)) state.ids.push(productId);
        } else {
          state.ids = state.ids.filter((id) => id !== productId);
        }
        delete state.pendingIds[productId];
        delete state.previousValues[productId];
        delete state.pendingRequestIds[productId];
      });
  },
});

export const { resetWishlist } = wishlistSlice.actions;
export default wishlistSlice.reducer;

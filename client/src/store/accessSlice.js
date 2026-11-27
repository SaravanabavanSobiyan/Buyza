import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../api/axios";

export const fetchAccess = createAsyncThunk(
  "access/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/admin/me");
      return { role: data.role, permissions: data.permissions };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Unable to load your access permissions.");
    }
  }
);

const initialState = { role: null, permissions: [], loaded: false, error: "" };

const accessSlice = createSlice({
  name: "access",
  initialState,
  reducers: {
    resetAccess: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAccess.pending, (state) => {
        state.loaded = false;
        state.error = "";
      })
      .addCase(fetchAccess.fulfilled, (state, { payload }) => {
        state.role = payload.role;
        state.permissions = payload.permissions;
        state.loaded = true;
      })
      .addCase(fetchAccess.rejected, (state, { payload }) => {
        state.role = null;
        state.permissions = [];
        state.loaded = true;
        state.error = payload || "Unable to load your access permissions.";
      });
  },
});

export const { resetAccess } = accessSlice.actions;
export default accessSlice.reducer;

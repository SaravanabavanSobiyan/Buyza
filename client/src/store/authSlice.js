import { createSlice } from "@reduxjs/toolkit";

// `ready` becomes true once we've checked for an existing session on page load
const authSlice = createSlice({
  name: "auth",
  initialState: { user: null, ready: false },
  reducers: {
    setUser(state, { payload }) {
      state.user = payload;
    },
    setReady(state) {
      state.ready = true;
    },
  },
});

export const { setUser, setReady } = authSlice.actions;
export default authSlice.reducer;

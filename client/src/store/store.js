import { configureStore } from '@reduxjs/toolkit';
import auth from './authSlice';
import cart from './cartSlice';
import wishlist from './wishlistSlice';

export const store = configureStore({
  reducer: { auth, cart, wishlist },
});

import { configureStore } from "@reduxjs/toolkit";
import auth from "./authSlice";
import cart from "./cartSlice";
import wishlist from "./wishlistSlice";
import checkout from "./checkoutSlice";
import access from "./accessSlice";

export const store = configureStore({ reducer: { auth, cart, wishlist, checkout, access } });

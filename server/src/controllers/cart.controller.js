import { asyncHandler } from "../utils/asyncHandler.js";
import * as cartService from "../services/cart.service.js";

export const getCart = asyncHandler(async (req, res) => {
  const cart = await cartService.getCart(req.user._id);
  res.json({ success: true, cart });
});

export const addItem = asyncHandler(async (req, res) => {
  const cart = await cartService.addItem(req.user._id, req.body);
  res.status(201).json({ success: true, cart });
});

export const updateItem = asyncHandler(async (req, res) => {
  const cart = await cartService.updateItem(req.user._id, req.params.itemId, req.body.quantity);
  res.json({ success: true, cart });
});

export const removeItem = asyncHandler(async (req, res) => {
  const cart = await cartService.removeItem(req.user._id, req.params.itemId);
  res.json({ success: true, cart });
});

export const clearCart = asyncHandler(async (req, res) => {
  const cart = await cartService.clearCart(req.user._id);
  res.json({ success: true, cart });
});

export const previewCart = asyncHandler(async (req, res) => {
  const cart = await cartService.previewCart(req.body.items);
  res.json({ success: true, cart });
});

export const mergeCart = asyncHandler(async (req, res) => {
  const { cart, notes } = await cartService.mergeCart(req.user._id, req.body.items);
  res.json({ success: true, cart, notes });
});

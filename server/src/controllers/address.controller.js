import Address from "../models/Address.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const MAX_ADDRESSES = 10;

async function findOwned(req) {
  const address = await Address.findOne({ _id: req.params.id, user: req.user._id });
  if (!address) throw new ApiError(404, "Address not found");
  return address;
}

export const listAddresses = asyncHandler(async (req, res) => {
  const addresses = await Address.find({ user: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
  res.json({ success: true, data: { addresses } });
});

export const createAddress = asyncHandler(async (req, res) => {
  const count = await Address.countDocuments({ user: req.user._id });
  if (count >= MAX_ADDRESSES) {
    throw new ApiError(400, `You can save up to ${MAX_ADDRESSES} addresses`);
  }

  const makeDefault = req.body.isDefault === true || count === 0; // first address is the default
  if (makeDefault) await Address.updateMany({ user: req.user._id }, { isDefault: false });

  const address = await Address.create({ ...req.body, isDefault: makeDefault, user: req.user._id });
  res.status(201).json({ success: true, data: { address } });
});

export const updateAddress = asyncHandler(async (req, res) => {
  const address = await findOwned(req);
  const { isDefault, ...fields } = req.body;

  if (isDefault === true && !address.isDefault) {
    await Address.updateMany({ user: req.user._id }, { isDefault: false });
    address.isDefault = true;
  }
  // The default can't be un-set here: set another address as default instead

  Object.assign(address, fields);
  await address.save();
  res.json({ success: true, data: { address } });
});

export const setDefaultAddress = asyncHandler(async (req, res) => {
  const address = await findOwned(req);
  await Address.updateMany({ user: req.user._id }, { isDefault: false });
  address.isDefault = true;
  await address.save();
  res.json({ success: true, data: { address } });
});

export const deleteAddress = asyncHandler(async (req, res) => {
  const address = await findOwned(req);
  await address.deleteOne();

  if (address.isDefault) {
    // promote the newest remaining address to default
    const next = await Address.findOne({ user: req.user._id }).sort({ createdAt: -1 });
    if (next) {
      next.isDefault = true;
      await next.save();
    }
  }
  res.json({ success: true, message: "Address deleted" });
});

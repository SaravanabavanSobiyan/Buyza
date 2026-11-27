import User from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { toSafeUser } from "../utils/serializers.js";
import { issueSession } from "../services/auth.service.js";
import { uploadImage, deleteImage } from "../services/cloudinary.service.js";

export const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: toSafeUser(req.user) } });
});

export const updateMe = asyncHandler(async (req, res) => {
  const updates = {};
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.phone !== undefined) updates.phone = req.body.phone;

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });
  res.json({ success: true, data: { user: toSafeUser(user) } });
});

export const updateAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "Choose an image to upload");

  const uploaded = await uploadImage(req.file.buffer, "ecommerce/avatars", req.file.mimetype);
  const oldPublicId = req.user.avatar?.publicId;

  const user = await User.findByIdAndUpdate(req.user._id, { avatar: uploaded }, { new: true });
  await deleteImage(oldPublicId); // remove the previous avatar

  res.json({ success: true, data: { user: toSafeUser(user) } });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select("+password");
  if (!(await user.comparePassword(currentPassword))) {
    throw new ApiError(400, "Current password is incorrect");
  }

  user.password = newPassword;
  await user.save();

  // Old refresh tokens are now invalid: start a fresh session for this device
  const accessToken = await issueSession(res, user, false);
  res.json({ success: true, message: "Password changed", data: { accessToken } });
});

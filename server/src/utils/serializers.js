export const toSafeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone || "",
  avatar: user.avatar?.url ? { url: user.avatar.url } : null,
  role: user.role,
  isVerified: user.isVerified,
});

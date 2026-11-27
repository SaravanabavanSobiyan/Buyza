// Client-side validation (the server validates again, never trust the client)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?\d[\d\s-]{6,19}$/;

export const passwordError = (pw) => {
  if (!pw) return "Enter a password";
  if (pw.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Za-z]/.test(pw)) return "Password must include a letter";
  if (!/\d/.test(pw)) return "Password must include a number";
  return null;
};

export const passwordStrength = (pw) => {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Za-z]/.test(pw) && /\d/.test(pw)) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) score++;
  return score; // 0..4
};

const clean = (errors) => Object.fromEntries(Object.entries(errors).filter(([, v]) => v));

export const validateRegister = (v) =>
  clean({
    name: v.name.trim().length < 2 ? "Name must be at least 2 characters" : null,
    email: EMAIL_RE.test(v.email.trim()) ? null : "Enter a valid email address",
    password: passwordError(v.password),
    confirmPassword: v.confirmPassword !== v.password ? "Passwords do not match" : null,
  });

export const validateLogin = (v) =>
  clean({
    email: EMAIL_RE.test(v.email.trim()) ? null : "Enter a valid email address",
    password: v.password ? null : "Enter your password",
  });

export const validateForgot = (v) =>
  clean({ email: EMAIL_RE.test(v.email.trim()) ? null : "Enter a valid email address" });

export const validateReset = (v) =>
  clean({
    password: passwordError(v.password),
    confirmPassword: v.confirmPassword !== v.password ? "Passwords do not match" : null,
  });

export const validateProfile = (v) =>
  clean({
    name: v.name.trim().length < 2 ? "Name must be at least 2 characters" : null,
    phone: v.phone.trim() && !PHONE_RE.test(v.phone.trim()) ? "Enter a valid phone number" : null,
  });

export const validateChangePassword = (v) =>
  clean({
    currentPassword: v.currentPassword ? null : "Enter your current password",
    newPassword:
      passwordError(v.newPassword) ||
      (v.newPassword === v.currentPassword ? "New password must be different" : null),
    confirmPassword: v.confirmPassword !== v.newPassword ? "Passwords do not match" : null,
  });

export const validateAddress = (v) =>
  clean({
    fullName: v.fullName.trim().length < 2 ? "Enter the recipient's name" : null,
    phone: PHONE_RE.test(v.phone.trim()) ? null : "Enter a valid phone number",
    line1: v.line1.trim().length < 3 ? "Enter the street address" : null,
    city: v.city.trim().length < 2 ? "Enter the city" : null,
    postalCode: v.postalCode.trim().length < 3 ? "Enter the postal code" : null,
  });

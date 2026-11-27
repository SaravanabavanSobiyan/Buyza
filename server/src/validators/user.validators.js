import { z } from "zod";
import { password, matchPasswords } from "./auth.validators.js";

const requiredString = (message) => z.string({ message });

const phone = z
  .string()
  .trim()
  .regex(/^(\+?\d[\d\s-]{6,19})?$/, "Enter a valid phone number");

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60).optional(),
  phone: phone.optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: requiredString("Enter your current password").min(1, "Enter your current password"),
    newPassword: password,
    confirmPassword: requiredString("Confirm password is required"),
  })
  .superRefine(matchPasswords("newPassword"))
  .refine((d) => d.currentPassword !== d.newPassword, {
    path: ["newPassword"],
    message: "New password must be different from the current one",
  });

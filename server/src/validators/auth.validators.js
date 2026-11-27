import { z } from "zod";

const requiredString = (message) => z.string({ message });

export const email = requiredString("Email is required").trim().toLowerCase().email("Enter a valid email address");

export const password = requiredString("Password is required")
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be 72 characters or fewer")
  .regex(/[A-Za-z]/, "Password must include a letter")
  .regex(/\d/, "Password must include a number");

export const matchPasswords = (field = "password") => (data, ctx) => {
  if (data[field] !== data.confirmPassword) {
    ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords do not match" });
  }
};

export const registerSchema = z
  .object({
    name: requiredString("Name is required").trim().min(2, "Name must be at least 2 characters").max(60),
    email,
    password,
    confirmPassword: requiredString("Confirm password is required"),
  })
  .superRefine(matchPasswords());

export const loginSchema = z.object({
  email,
  password: requiredString("Enter your password").min(1, "Enter your password"),
  rememberMe: z.boolean().optional(),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password, confirmPassword: requiredString("Confirm password is required") })
  .superRefine(matchPasswords());

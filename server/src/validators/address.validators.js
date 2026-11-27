import { z } from "zod";

const requiredString = (message) => z.string({ message });

const fields = {
  label: z.string().trim().max(30).optional(),
  fullName: requiredString("Enter the recipient's name").trim().min(2, "Enter the recipient's name").max(80),
  phone: requiredString("Enter a valid phone number").trim().regex(/^\+?\d[\d\s-]{6,19}$/, "Enter a valid phone number"),
  line1: requiredString("Enter the street address").trim().min(3, "Enter the street address").max(120),
  line2: z.string().trim().max(120).optional(),
  city: requiredString("Enter the city").trim().min(2, "Enter the city").max(60),
  province: z.string().trim().max(60).optional(),
  postalCode: requiredString("Enter the postal code").trim().min(3, "Enter the postal code").max(12),
  country: z.string().trim().min(2).max(60).optional(),
  isDefault: z.boolean().optional(),
};

export const createAddressSchema = z.object(fields);
export const updateAddressSchema = z.object(fields).partial();

import { z } from "zod";

// Auth validation schemas
export const signUpSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "Please enter a valid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
    .max(72, { message: "Password must be less than 72 characters" })
    .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
    .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
    .regex(/[0-9]/, { message: "Password must contain at least one number" }),
  username: z
    .string()
    .trim()
    .min(2, { message: "Username must be at least 2 characters" })
    .max(50, { message: "Username must be less than 50 characters" })
    .regex(/^[a-zA-Z0-9_\s]+$/, { message: "Username can only contain letters, numbers, spaces and underscores" }),
  phone: z
    .string()
    .trim()
    .regex(/^[+]?[0-9]{10,15}$/, { message: "Please enter a valid phone number (10-15 digits)" }),
  vehicleType: z.enum(["bike", "trolley"]).optional(),
});

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "Please enter a valid email address" }),
  password: z
    .string()
    .min(1, { message: "Password is required" }),
});

// Order validation schema
export const orderSchema = z.object({
  pickupAddress: z
    .string()
    .trim()
    .min(5, { message: "Pickup address must be at least 5 characters" })
    .max(500, { message: "Pickup address must be less than 500 characters" }),
  dropAddress: z
    .string()
    .trim()
    .min(5, { message: "Drop address must be at least 5 characters" })
    .max(500, { message: "Drop address must be less than 500 characters" }),
  packageWeight: z
    .number({ invalid_type_error: "Please enter a valid weight" })
    .min(0.1, { message: "Package weight must be at least 0.1 kg" })
    .max(500, { message: "Package weight cannot exceed 500 kg" }),
  vehicleType: z.enum(["bike", "trolley"], { 
    errorMap: () => ({ message: "Please select a vehicle type" }) 
  }),
  paymentMethod: z.enum(["cash_on_delivery", "online"], { 
    errorMap: () => ({ message: "Please select a payment method" }) 
  }),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type OrderInput = z.infer<typeof orderSchema>;

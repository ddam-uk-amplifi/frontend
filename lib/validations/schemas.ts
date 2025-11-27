import { z } from "zod";
import { UserRole } from "@/lib/types/api";

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z
  .object({
    email: z.string().email("Please enter a valid email address"),
    username: z.string().min(2, "Username must be at least 2 characters long"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number",
      ),
    confirmPassword: z.string(),
    role: z.nativeEnum(UserRole).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const passwordResetRequestSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const passwordResetSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// User schemas
export const userCreateSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  username: z.string().min(2, "Username must be at least 2 characters long"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number",
    ),
  role: z.nativeEnum(UserRole).optional(),
});

export const userUpdateSchema = z.object({
  username: z
    .string()
    .min(2, "Username must be at least 2 characters long")
    .optional(),
  email: z.string().email("Please enter a valid email address").optional(),
  role: z.nativeEnum(UserRole).optional(),
  is_active: z.boolean().optional(),
});

export const userUpdatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const createManualSchema = z.object({
  caseName: z.string().min(1, "Case name is required"),
  type: z.enum(["daily", "weekly", "monthly"]),
  team: z.enum(["team1", "team2", "team3", "team4", "team5"]),
  manager: z.string().min(1, "Manager is required"),
  videoFile: z
    .any()
    .refine(
      (file): file is File => file instanceof File,
      "Video file is required",
    ),
});

export const createDeliverySchema = z.object({
  deliveryType: z.enum(["custom", "template"]),
  creatorEmail: z.string().email("Please enter a valid email address"),
  receiverEmail: z.string().email("Please enter a valid email address"),
  deliveryLink: z.string().url("Please enter a valid URL"),
  deliveryDate: z.string().min(1, "Delivery date is required"),
});

// Type exports for forms
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type PasswordResetRequestFormData = z.infer<
  typeof passwordResetRequestSchema
>;
export type PasswordResetFormData = z.infer<typeof passwordResetSchema>;
export type UserCreateFormData = z.infer<typeof userCreateSchema>;
export type UserUpdateFormData = z.infer<typeof userUpdateSchema>;
export type UserUpdatePasswordFormData = z.infer<
  typeof userUpdatePasswordSchema
>;
export type CreateManualFormData = z.infer<typeof createManualSchema>;
export type CreateDeliveryFormData = z.infer<typeof createDeliverySchema>;

import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters long');
const usernameSchema = z.string().min(3, 'Username must be at least 3 characters long').max(20, 'Username must be less than 20 characters');
const nameSchema = z.string().min(1, 'This field is required').max(50, 'Name must be less than 50 characters');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  first_name: nameSchema,
  last_name: nameSchema,
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const profileUpdateSchema = z.object({
  first_name: nameSchema,
  last_name: nameSchema,
  username: usernameSchema,
  email: emailSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
  otp: z.string().min(6, 'OTP must be 6 digits').max(6, 'OTP must be 6 digits'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match",
  path: ["confirmPassword"],
});

export const otpSchema = z.object({
  otp: z.string().min(6, 'OTP must be 6 digits').max(6, 'OTP must be 6 digits').regex(/^\d{6}$/, 'OTP must contain only numbers'),
});

export const emailVerificationSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export const emailVerificationRequestSchema = z.object({
  email: emailSchema,
});

export const testEmailSchema = z.object({
  to: emailSchema,
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject must be less than 200 characters'),
  message: z.string().min(1, 'Message is required').max(1000, 'Message must be less than 1000 characters'),
});

export const waitlistSchema = z.object({
  email: emailSchema,
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  message: z.string().max(500, 'Message must be less than 500 characters').optional(),
});

export const systemSettingsSchema = z.object({
  registrationEnabled: z.boolean(),
  maintenanceMode: z.boolean(),
  maintenanceMessage: z.string().max(500, 'Message must be less than 500 characters').optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type OtpFormData = z.infer<typeof otpSchema>;
export type EmailVerificationFormData = z.infer<typeof emailVerificationSchema>;
export type EmailVerificationRequestFormData = z.infer<typeof emailVerificationRequestSchema>;
export type TestEmailFormData = z.infer<typeof testEmailSchema>;
export type WaitlistFormData = z.infer<typeof waitlistSchema>;
export type SystemSettingsFormData = z.infer<typeof systemSettingsSchema>;
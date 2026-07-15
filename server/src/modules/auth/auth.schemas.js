import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  email: z.string().trim().toLowerCase().email('A valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('A valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const googleSchema = z.object({
  idToken: z.string().min(10, 'idToken is required'),
});

export const forgotSchema = z.object({
  email: z.string().trim().toLowerCase().email('A valid email is required'),
});

export const resetSchema = z.object({
  token: z.string().min(10, 'token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
});

export const updateMeSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120).optional(),
  phone: z.string().trim().max(40).nullable().optional().transform((v) => (v === null ? '' : v)),
  marketingOptIn: z.boolean().optional(),
}).refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(200),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(10, 'token is required'),
});

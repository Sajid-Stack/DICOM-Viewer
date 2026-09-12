import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72), // 72 is bcrypt's limit
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

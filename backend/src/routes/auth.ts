import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { registerSchema, loginSchema } from "../schemas";
import { prisma } from "../db";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const isProd = process.env.NODE_ENV === "production"; 

const cookieOpts = {
  httpOnly: true, 
  sameSite: isProd ? ("none" as const) : ("lax" as const), 
  secure: isProd,
  maxAge: 24 * 60 * 60 * 1000, 
};

// Register a new user
router.post("/register", async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.message,
    });
  }
  const { email, password } = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email },
  });
  if (existing)
    return res.status(409).json({
      error: "user already exists",
    });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
    },
  });

  res.status(201).json({
    id: user.id,
    email: user.email,
  });
});



// Log in
router.post("/login", async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.message,
    });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
  });
  if (!user)
    return res.status(401).json({
      error: "invalid credentials",
    });

  const found = await bcrypt.compare(password, user.passwordHash);
  if (!found)
    return res.status(401).json({
      error: "invalid credentials",
    });

  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: "1d",
  });

  await prisma.auditLog.create({
    data: { userId: user.id, action: "login" },
  });

  res.cookie("token", token, cookieOpts);
  res.json({
    user: { id: user.id, email: user.email, role: user.role },
  });
});

router.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie("token", cookieOpts);
  res.json({ success: true });
});


export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: "not logged in" });

  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      role: string;
    };
    (req as any).userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: "session expired, log in again" });
  }
}

export default router;

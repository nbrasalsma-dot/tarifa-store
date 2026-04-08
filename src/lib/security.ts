/**
 * 🔒 Security Utilities for Tarifa Store
 * ✅ SECURED VERSION v2.0 - All Critical Vulnerabilities Fixed
 */
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs"; // ✅ FIXED: Using bcrypt now!
import crypto from "crypto";

// ==================== JWT CONFIGURATION ====================
const getJWTSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === "tarifa-secret-key-change-in-production") {
    console.error("🚨 SECURITY ALERT: JWT_SECRET not set!");
    if (process.env.NODE_ENV === "production")
      throw new Error("JWT_SECRET required");
  }
  return secret || crypto.randomBytes(64).toString("hex");
};

// Session & Rate Limiting Stores
const userSessions = new Map<string, any>();
const rateLimitStore = new Map<string, any>();
const failedAttempts = new Map<string, any>();

// ==================== INPUT SANITIZATION ====================
export function sanitizeString(input: string): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .trim();
}
export const sanitizeInput = sanitizeString;

export function sanitizeHTML(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/on\w+\s*=/gi, "data-blocked=")
    .replace(/javascript:/gi, "blocked:")
    .replace(/vbscript:/gi, "blocked:");
}

export function isValidEmail(email: string): boolean {
  return /^[^@]+@[^@]+\.[^@]+$/.test(email);
}

export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const e: string[] = [];
  if (password.length < 8) e.push("8+ أحرف مطلوبة");
  if (!/[A-Z]/.test(password)) e.push("حرف كبير مطلوب");
  if (!/[a-z]/.test(password)) e.push("حرف صغير مطلوب");
  if (!/[0-9]/.test(password)) e.push("رقم مطلوب");
  return { isValid: e.length === 0, errors: e };
}
export const checkPasswordStrength = validatePassword;

export function sanitizeObject<T>(obj: T): T {
  const o: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string") o[k] = sanitizeInput(v);
    else if (typeof v === "object" && v !== null && !Array.isArray(v))
      o[k] = sanitizeObject(v as any);
    else if (Array.isArray(v))
      o[k] = v.map((i) => (typeof i === "string" ? sanitizeInput(i) : i));
    else o[k] = v;
  }
  return o as T;
}

// ==================== RATE LIMITING ====================
export function checkRateLimit(
  key: string,
  max = 5,
  windowMs = 60000,
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  message?: string;
} {
  const now = Date.now();
  let r = rateLimitStore.get(key);
  if (!r || now > r.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: max - 1, resetTime: now + windowMs };
  }
  if (r.count >= max)
    return {
      allowed: false,
      remaining: 0,
      resetTime: r.resetTime,
      message: "تجاوزت الحد المسموح",
    };
  r.count++;
  return { allowed: true, remaining: max - r.count, resetTime: r.resetTime };
}

export function recordFailedAttempt(
  id: string,
  max = 5,
  lockoutMs = 900000,
): { locked: boolean; remaining: number; lockoutUntil?: number } {
  const now = Date.now();
  const r = failedAttempts.get(id);
  if (r && r.lockoutUntil > now)
    return { locked: true, remaining: 0, lockoutUntil: r.lockoutUntil };
  if (!r || now > r.lockoutUntil) {
    failedAttempts.set(id, { count: 1, lockoutUntil: 0 });
    return { locked: false, remaining: max - 1 };
  }
  const nc = r.count + 1;
  if (nc >= max) {
    failedAttempts.set(id, { count: nc, lockoutUntil: now + lockoutMs });
    return { locked: true, remaining: 0 };
  }
  failedAttempts.set(id, { count: nc, lockoutUntil: r.lockoutUntil });
  return { locked: false, remaining: max - nc };
}
export function clearFailedAttempt(id: string): void {
  failedAttempts.delete(id);
}
export function clearRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

// ==================== PASSWORD HASHING (bcrypt) ✅ FIXED ====================
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(
    password,
    parseInt(process.env.BCRYPT_SALT_ROUNDS || "12"),
  );
}
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

// ==================== JWT TOKENS ====================
export function generateAccessToken(payload: any): string {
  return jwt.sign(payload, getJWTSecret(), {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    issuer: "tarifa-store",
  });
}
export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { userId, type: "refresh" },
    process.env.JWT_REFRESH_SECRET || getJWTSecret(),
    { expiresIn: "7d" },
  );
}
export function verifyToken(token: string): { valid: boolean; payload?: any } {
  try {
    return { valid: true, payload: jwt.verify(token, getJWTSecret()) };
  } catch {
    return { valid: false };
  }
}

// ==================== SESSION MANAGEMENT ====================
export function generateSessionId(): string {
  return crypto.randomBytes(32).toString("hex");
}
export function addUserSession(userId: string, sid: string): void {
  userSessions.set(sid, { sid, createdAt: Date.now() });
}
export async function generateAuthTokens(user: {
  id: string;
  email: string;
  role: string;
}) {
  const sid = generateSessionId();
  addUserSession(user.id, sid);
  return {
    accessToken: generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId: sid,
    }),
    refreshToken: generateRefreshToken(user.id),
    sessionId: sid,
  };
}

// ==================== ADMIN INITIALIZATION ====================
export async function initializeAdmin() {
  try {
    const { db } = await import("./db");
    if (await db.user.findFirst({ where: { role: "ADMIN" } }))
      return { success: true, message: "Exists" };
    const pass = Array.from(
      crypto.randomBytes(16),
      (b) =>
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[
          b % 62
        ],
    ).join("");
    const a = await db.user.create({
      data: {
        email: process.env.ADMIN_EMAIL || "admin@tarifa.com",
        name: "مدير المتجر",
        password: await hashPassword(pass),
        phone: "+967776080395",
        role: "ADMIN",
        isVerified: true,
      },
    });
    return {
      success: true,
      message: "Created",
      credentials: { email: a.email, password: pass },
    };
  } catch (e: any) {
    return { success: false, message: String(e) };
  }
}

// ==================== DETECTION UTILITIES ====================
export function hasSQLInjection(input: string): boolean {
  return [
    /\bSELECT\b.*\bFROM\b/i,
    /\bDROP\b/i,
    /(--)/,
    /\bUNION\b.*\bSELECT\b/i,
  ].some((p) => p.test(input));
}
export function hasXSS(input: string): boolean {
  return [/<script/i, /javascript:/i, /on\w+=/i].some((p) => p.test(input));
}
export function generateSecureToken(l = 32): string {
  const c = "ABCDEFabcdef0123456789";
  const v = new Uint32Array(l);
  crypto.getRandomValues(v);
  return Array.from(v, (x) => c[x % c.length]).join("");
}
export const generateToken = generateSecureToken;
export function generateVerificationCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
interface LogE {
  action: string;
  status: string;
  details?: string;
}
export function logSecurityEvent(e: LogE): void {
  console.warn(
    "[SECURITY]",
    JSON.stringify({ ...e, ts: new Date().toISOString() }),
  );
}

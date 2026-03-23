/**
 * Security Module for Tarifa E-commerce Store
 * 
 * This module provides comprehensive security features:
 * - Password hashing with bcrypt (12 rounds)
 * - JWT session management
 * - Rate limiting for brute-force protection
 * - Input sanitization
 * - Security logging
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { db } from "./db";

// ==================== Configuration ====================

const SECURITY_CONFIG = {
  // Password hashing
  BCRYPT_ROUNDS: 12,
  MIN_PASSWORD_LENGTH: 8,
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || crypto.randomBytes(64).toString("hex"),
  JWT_EXPIRES_IN: "7d",
  JWT_REFRESH_EXPIRES_IN: "30d",
  
  // Rate limiting
  RATE_LIMIT_MAX_ATTEMPTS: 5,
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_LOCKOUT_MS: 30 * 60 * 1000, // 30 minutes lockout
  
  // Session
  MAX_SESSIONS_PER_USER: 5,
};

// ==================== Types ====================

export interface SecurityLog {
  id: string;
  action: string;
  userId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  details?: string;
  status: "SUCCESS" | "FAILURE" | "BLOCKED";
  createdAt: Date;
}

export interface RateLimitEntry {
  attempts: number;
  firstAttempt: Date;
  lockedUntil?: Date;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  sessionId: string;
  iat: number;
  exp: number;
}

// ==================== Rate Limiting Store (In-Memory) ====================

const rateLimitStore = new Map<string, RateLimitEntry>();
const sessionStore = new Map<string, Set<string>>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = new Date();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.lockedUntil && entry.lockedUntil < now) {
      rateLimitStore.delete(key);
    } else if (now.getTime() - entry.firstAttempt.getTime() > SECURITY_CONFIG.RATE_LIMIT_WINDOW_MS) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// ==================== Password Security ====================

/**
 * Hash password using bcrypt with salt rounds
 */
export async function hashPassword(password: string): Promise<string> {
  if (password.length < SECURITY_CONFIG.MIN_PASSWORD_LENGTH) {
    throw new Error(`كلمة المرور يجب أن تكون ${SECURITY_CONFIG.MIN_PASSWORD_LENGTH} أحرف على الأقل`);
  }
  
  // Additional password strength check
  const strengthResult = checkPasswordStrength(password);
  if (!strengthResult.isValid) {
    throw new Error(strengthResult.errors[0]);
  }
  
  return bcrypt.hash(password, SECURITY_CONFIG.BCRYPT_ROUNDS);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Check password strength
 */
export function checkPasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  errors: string[];
} {
  const errors: string[] = [];
  let score = 0;

  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;

  if (password.length < 8) {
    errors.push("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("يجب أن تحتوي على حرف كبير واحد على الأقل");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("يجب أن تحتوي على حرف صغير واحد على الأقل");
  }
  if (!/\d/.test(password)) {
    errors.push("يجب أن تحتوي على رقم واحد على الأقل");
  }

  return {
    isValid: errors.length === 0,
    score,
    errors,
  };
}

// ==================== Rate Limiting ====================

/**
 * Check if IP/email is rate limited
 */
export function checkRateLimit(identifier: string): {
  allowed: boolean;
  remainingAttempts: number;
  lockedUntil?: Date;
  message?: string;
} {
  const entry = rateLimitStore.get(identifier);
  const now = new Date();

  if (!entry) {
    return { allowed: true, remainingAttempts: SECURITY_CONFIG.RATE_LIMIT_MAX_ATTEMPTS };
  }

  // Check if locked out
  if (entry.lockedUntil && entry.lockedUntil > now) {
    const remainingMinutes = Math.ceil((entry.lockedUntil.getTime() - now.getTime()) / 60000);
    return {
      allowed: false,
      remainingAttempts: 0,
      lockedUntil: entry.lockedUntil,
      message: `تم حظر الحساب مؤقتاً. حاولي مرة أخرى بعد ${remainingMinutes} دقيقة`,
    };
  }

  // Reset if window expired
  if (now.getTime() - entry.firstAttempt.getTime() > SECURITY_CONFIG.RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.delete(identifier);
    return { allowed: true, remainingAttempts: SECURITY_CONFIG.RATE_LIMIT_MAX_ATTEMPTS };
  }

  const remainingAttempts = SECURITY_CONFIG.RATE_LIMIT_MAX_ATTEMPTS - entry.attempts;
  return {
    allowed: remainingAttempts > 0,
    remainingAttempts: Math.max(0, remainingAttempts),
  };
}

/**
 * Record failed attempt
 */
export function recordFailedAttempt(identifier: string): void {
  const entry = rateLimitStore.get(identifier) || {
    attempts: 0,
    firstAttempt: new Date(),
  };

  entry.attempts += 1;

  // Lock out if max attempts reached
  if (entry.attempts >= SECURITY_CONFIG.RATE_LIMIT_MAX_ATTEMPTS) {
    entry.lockedUntil = new Date(Date.now() + SECURITY_CONFIG.RATE_LIMIT_LOCKOUT_MS);
  }

  rateLimitStore.set(identifier, entry);
}

/**
 * Clear rate limit on successful login
 */
export function clearRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

// ==================== JWT Session Management ====================

/**
 * Generate access token
 */
export function generateAccessToken(payload: Omit<JWTPayload, "iat" | "exp">): string {
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      sessionId: payload.sessionId,
    },
    SECURITY_CONFIG.JWT_SECRET,
    { expiresIn: SECURITY_CONFIG.JWT_EXPIRES_IN }
  );
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { userId, type: "refresh" },
    SECURITY_CONFIG.JWT_SECRET,
    { expiresIn: SECURITY_CONFIG.JWT_REFRESH_EXPIRES_IN }
  );
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, SECURITY_CONFIG.JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Generate session ID
 */
export function generateSessionId(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Manage user sessions (prevent session hijacking)
 */
export function addUserSession(userId: string, sessionId: string): void {
  const userSessions = sessionStore.get(userId) || new Set();
  userSessions.add(sessionId);

  // Remove oldest sessions if exceeding max
  if (userSessions.size > SECURITY_CONFIG.MAX_SESSIONS_PER_USER) {
    const sessions = Array.from(userSessions);
    sessions.slice(0, sessions.length - SECURITY_CONFIG.MAX_SESSIONS_PER_USER).forEach(s => {
      userSessions.delete(s);
    });
  }

  sessionStore.set(userId, userSessions);
}

/**
 * Validate session
 */
export function validateSession(userId: string, sessionId: string): boolean {
  const userSessions = sessionStore.get(userId);
  return userSessions?.has(sessionId) ?? false;
}

/**
 * Invalidate session
 */
export function invalidateSession(userId: string, sessionId: string): void {
  const userSessions = sessionStore.get(userId);
  if (userSessions) {
    userSessions.delete(sessionId);
  }
}

// ==================== Input Sanitization ====================

const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /data:/gi,
  /vbscript:/gi,
  /expression\s*\(/gi,
];

/**
 * Sanitize string input
 */
export function sanitizeInput(input: string): string {
  let sanitized = input.trim();
  
  // Remove dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, "");
  }

  // Escape HTML entities
  sanitized = sanitized
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");

  return sanitized;
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = sanitizeInput(key);

    if (typeof value === "string") {
      sanitized[sanitizedKey] = sanitizeInput(value);
    } else if (typeof value === "object" && value !== null) {
      sanitized[sanitizedKey] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[sanitizedKey] = value;
    }
  }

  return sanitized as T;
}

// ==================== Security Logging ====================

interface LogEntry {
  action: string;
  userId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  details?: string;
  status: "SUCCESS" | "FAILURE" | "BLOCKED";
}

const securityLogs: LogEntry[] = [];

/**
 * Log security event
 */
export function logSecurityEvent(entry: LogEntry): void {
  securityLogs.push({
    ...entry,
    action: entry.action,
    userId: entry.userId,
    email: entry.email,
    ip: entry.ip,
    userAgent: entry.userAgent,
    details: entry.details,
    status: entry.status,
  });

  // Keep only last 1000 logs
  if (securityLogs.length > 1000) {
    securityLogs.shift();
  }

  // Console log for development
  console.log(`[SECURITY] ${entry.action} - ${entry.status} - ${entry.email || entry.userId || "Unknown"}`);
}

/**
 * Get security logs
 */
export function getSecurityLogs(limit = 100): LogEntry[] {
  return securityLogs.slice(-limit);
}

// ==================== Verification Code ====================

/**
 * Generate a 6-digit verification code
 */
export function generateVerificationCode(): string {
  // Use crypto.randomInt for cryptographically secure random numbers
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Generate a unique token
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// ==================== Auth Token Generation ====================

/**
 * Generate auth tokens for user session
 */
export async function generateAuthTokens(user: { id: string; email: string; role: string }): Promise<{
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}> {
  const sessionId = generateSessionId();
  
  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    sessionId,
  });

  const refreshToken = generateRefreshToken(user.id);

  // Track session
  addUserSession(user.id, sessionId);

  return {
    accessToken,
    refreshToken,
    sessionId,
  };
}

// ==================== Admin Initialization ====================

/**
 * Create admin account if none exists
 */
export async function initializeAdmin(): Promise<{ success: boolean; message: string; credentials?: { email: string; password: string } }> {
  try {
    // Check if admin exists
    const existingAdmin = await db.user.findFirst({
      where: { role: "ADMIN" },
    });

    if (existingAdmin) {
      return { success: true, message: "Admin account already exists" };
    }

    // Generate secure random password
    const randomPassword = crypto.randomBytes(16).toString("base64").slice(0, 20);
    const hashedPassword = await hashPassword(randomPassword);

    // Create admin user
    const admin = await db.user.create({
      data: {
        name: "Admin",
        email: "admin@tarifa.com",
        password: hashedPassword,
        phone: "0500000000",
        role: "ADMIN",
        isVerified: true,
        isActive: true,
      },
    });

    logSecurityEvent({
      action: "ADMIN_INITIALIZED",
      userId: admin.id,
      email: admin.email,
      status: "SUCCESS",
    });

    return {
      success: true,
      message: "Admin account created successfully",
      credentials: {
        email: admin.email,
        password: randomPassword,
      },
    };
  } catch (error) {
    console.error("Admin initialization error:", error);
    return { success: false, message: "Failed to create admin account" };
  }
}

// Export configuration for external use
export { SECURITY_CONFIG };

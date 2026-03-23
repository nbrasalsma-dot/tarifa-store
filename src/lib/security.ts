/**
 * Security Utilities for Tarifa Store
 * Input validation, sanitization, password hashing, and JWT handling
 */

import jwt from 'jsonwebtoken';

// JWT Secret - should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'tarifa-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'tarifa-refresh-secret-change-in-production';

// Session tracking
const userSessions = new Map<string, Set<string>>();

// Rate limiting tracking
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const failedAttempts = new Map<string, { count: number; lockoutUntil: number }>();

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/`/g, '&#96;')
    .replace(/=/g, '&#x3D;')
    .trim();
}

// Alias for backward compatibility
export const sanitizeInput = sanitizeString;

/**
 * Sanitize HTML content (basic)
 */
export function sanitizeHTML(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+\s*=/gi, 'data-blocked=')
    .replace(/javascript:/gi, 'blocked:')
    .replace(/vbscript:/gi, 'blocked:')
    .replace(/data:/gi, 'blocked:');
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (Yemen format)
 */
export function isValidYemenPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/[\s-]/g, '');
  const phoneRegex = /^(\+?967|0)?[1-9]\d{8}$/;
  return phoneRegex.test(cleanPhone);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('يجب أن تحتوي على حرف كبير واحد على الأقل');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('يجب أن تحتوي على حرف صغير واحد على الأقل');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('يجب أن تحتوي على رقم واحد على الأقل');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Check password strength (alias for validatePassword)
 */
export function checkPasswordStrength(password: string): { isValid: boolean; errors: string[] } {
  return validatePassword(password);
}

/**
 * Sanitize object (recursively sanitize all string values)
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'string' ? sanitizeInput(item) : item
      );
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

/**
 * Check rate limit
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    // Create new record
    const newRecord = { count: 1, resetTime: now + windowMs };
    rateLimitStore.set(key, newRecord);
    return { allowed: true, remaining: maxAttempts - 1, resetTime: newRecord.resetTime };
  }

  if (record.count >= maxAttempts) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  // Increment count
  record.count++;
  rateLimitStore.set(key, record);

  return { allowed: true, remaining: maxAttempts - record.count, resetTime: record.resetTime };
}

/**
 * Record failed attempt
 */
export function recordFailedAttempt(
  identifier: string,
  maxAttempts: number = 5,
  lockoutMs: number = 900000 // 15 minutes
): { locked: boolean; remaining: number; lockoutUntil?: number } {
  const now = Date.now();
  const record = failedAttempts.get(identifier);

  if (record && record.lockoutUntil > now) {
    return { locked: true, remaining: 0, lockoutUntil: record.lockoutUntil };
  }

  if (!record || now > record.lockoutUntil) {
    // Start fresh
    const newRecord = { count: 1, lockoutUntil: 0 };
    failedAttempts.set(identifier, newRecord);
    return { locked: false, remaining: maxAttempts - 1 };
  }

  // Increment
  const newCount = record.count + 1;

  if (newCount >= maxAttempts) {
    const lockoutUntil = now + lockoutMs;
    failedAttempts.set(identifier, { count: newCount, lockoutUntil });
    return { locked: true, remaining: 0, lockoutUntil };
  }

  failedAttempts.set(identifier, { count: newCount, lockoutUntil: record.lockoutUntil });
  return { locked: false, remaining: maxAttempts - newCount };
}

/**
 * Clear failed attempts
 */
export function clearFailedAttempts(identifier: string): void {
  failedAttempts.delete(identifier);
}

/**
 * Clear rate limit
 */
export function clearRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Generate auth tokens (access + refresh)
 */
export function generateAuthTokens(user: { id: string; email: string; role: string }): {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
} {
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

/**
 * Initialize admin user
 */
export async function initializeAdmin(): Promise<{ 
  success: boolean; 
  message: string;
  credentials?: { email: string; password: string; name: string };
}> {
  try {
    const { db } = await import('./db');

    // Check if admin exists
    const existingAdmin = await db.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (existingAdmin) {
      return { success: true, message: 'Admin already exists' };
    }

    // Generate a secure random password
    const defaultPassword = generateSecureToken(12);
    
    // Create default admin
    const hashedPassword = await hashPassword(defaultPassword);

    const admin = await db.user.create({
      data: {
        email: 'admin@tarifa.com',
        name: 'مدير المتجر',
        password: hashedPassword,
        phone: '+967776080395',
        role: 'ADMIN',
        isVerified: true,
      },
    });

    logSecurityEvent({
      action: 'ADMIN_INITIALIZED',
      userId: admin.id,
      status: 'SUCCESS',
    });

    return { 
      success: true, 
      message: 'Admin created successfully',
      credentials: {
        email: 'admin@tarifa.com',
        password: defaultPassword,
        name: 'مدير المتجر'
      }
    };
  } catch (error) {
    logSecurityEvent({
      action: 'ADMIN_INIT_FAILED',
      status: 'FAILURE',
      details: String(error),
    });
    return { success: false, message: 'Failed to create admin' };
  }
}

/**
 * Check for SQL injection patterns
 */
export function hasSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\bSELECT\b.*\bFROM\b)/i,
    /(\bINSERT\b.*\bINTO\b)/i,
    /(\bUPDATE\b.*\bSET\b)/i,
    /(\bDELETE\b.*\bFROM\b)/i,
    /(\bDROP\b.*\bTABLE\b)/i,
    /(\bUNION\b.*\bSELECT\b)/i,
    /(--)/,
    /(\/\*.*\*\/)/,
    /(\bOR\b\s+\d+\s*=\s*\d+)/i,
    /(\bAND\b\s+\d+\s*=\s*\d+)/i,
    /('|")\s*;\s*--/,
    /('|")\s*(\bOR\b|\bAND\b)/i,
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Check for XSS patterns
 */
export function hasXSS(input: string): boolean {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,
    /javascript:/i,
    /vbscript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<form/i,
    /<input/i,
    /expression\s*\(/i,
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const values = new Uint32Array(length);
    crypto.getRandomValues(values);
    for (let i = 0; i < length; i++) {
      token += chars[values[i] % chars.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }

  return token;
}

// Alias for backward compatibility
export const generateToken = generateSecureToken;

/**
 * Generate verification code (6 digits)
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Hash string using SHA-256 (for client-side use)
 */
export async function hashString(str: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  return btoa(str);
}

/**
 * Hash password using bcrypt-like approach (simplified for server-side)
 */
export async function hashPassword(password: string): Promise<string> {
  // In production, use bcrypt or argon2
  // This is a simplified version for demo
  const crypto = await import('crypto');
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .createHash('sha256')
    .update(password + salt)
    .digest('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const [salt, hash] = hashedPassword.split(':');
  if (!salt || !hash) return false;

  const crypto = await import('crypto');
  const verifyHash = crypto
    .createHash('sha256')
    .update(password + salt)
    .digest('hex');

  return hash === verifyHash;
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(payload: {
  userId: string;
  email: string;
  role: string;
  sessionId?: string;
}): string {
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      sessionId: payload.sessionId,
      type: 'access',
    },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
}

/**
 * Generate JWT refresh token
 */
export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { userId, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): {
  valid: boolean;
  payload?: {
    userId: string;
    email?: string;
    role?: string;
    sessionId?: string;
    type: string;
  };
  error?: string;
} {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email?: string;
      role?: string;
      sessionId?: string;
      type: string;
    };

    return { valid: true, payload: decoded };
  } catch {
    return { valid: false, error: 'Invalid or expired token' };
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): {
  valid: boolean;
  userId?: string;
  error?: string;
} {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as {
      userId: string;
      type: string;
    };

    return { valid: true, userId: decoded.userId };
  } catch {
    return { valid: false, error: 'Invalid or expired refresh token' };
  }
}

/**
 * Generate session ID
 */
export function generateSessionId(): string {
  return `sess_${generateSecureToken(32)}`;
}

/**
 * Add user session to tracking
 */
export function addUserSession(userId: string, sessionId: string): void {
  if (!userSessions.has(userId)) {
    userSessions.set(userId, new Set());
  }
  userSessions.get(userId)!.add(sessionId);
}

/**
 * Remove user session
 */
export function removeUserSession(userId: string, sessionId: string): void {
  const sessions = userSessions.get(userId);
  if (sessions) {
    sessions.delete(sessionId);
  }
}

/**
 * Get user sessions
 */
export function getUserSessions(userId: string): string[] {
  return Array.from(userSessions.get(userId) || []);
}

/**
 * Log security event
 */
export function logSecurityEvent(event: {
  action: string;
  userId?: string;
  ip?: string;
  status: 'SUCCESS' | 'FAILURE';
  details?: string;
}): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    ...event,
  };

  console.log('[SECURITY]', JSON.stringify(logEntry));

  // In production, send to logging service or database
}

/**
 * Validate URL
 */
export function isValidURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9\u0600-\u06FF._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+/, '')
    .substring(0, 255);
}

/**
 * Validate file type
 */
export function isAllowedFileType(mimeType: string, allowedTypes: string[]): boolean {
  return allowedTypes.includes(mimeType);
}

/**
 * Check if request is from a bot
 */
export function isBot(userAgent: string): boolean {
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java/i,
    /perl/i,
    /ruby/i,
    /node\.js/i,
  ];

  return botPatterns.some(pattern => pattern.test(userAgent));
}

/**
 * Secure compare strings (timing-safe)
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Escape regex special characters
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validate ObjectId format
 */
export function isValidObjectId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id) || /^cuid[a-z0-9]+$/.test(id);
}

/**
 * Rate limit key generator
 */
export function generateRateLimitKey(
  type: 'ip' | 'user' | 'email',
  identifier: string,
  action: string
): string {
  return `ratelimit:${type}:${identifier}:${action}`;
}

/**
 * Parse and validate JSON safely
 */
export function safeJSONParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

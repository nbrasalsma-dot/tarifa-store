/**
 * Authentication Module
 * Uses the security module for password hashing and verification
 */

import { db } from "./db";
import {
  generateVerificationCode as secureGenerateCode,
  generateToken as secureGenerateToken,
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  generateSessionId,
  addUserSession,
  logSecurityEvent,
  sanitizeInput,
} from "./security";

// Re-export for backward compatibility
export const generateVerificationCode = secureGenerateCode;
export const generateToken = secureGenerateToken;
export { hashPassword, verifyPassword };

// Create verification code for user
export async function createVerificationCode(
  userId: string,
  type: "EMAIL_VERIFICATION" | "PASSWORD_RESET"
): Promise<string> {
  const code = secureGenerateCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  // Invalidate previous codes of same type
  await db.verificationCode.updateMany({
    where: {
      userId,
      type,
      used: false,
    },
    data: { used: true },
  });

  await db.verificationCode.create({
    data: {
      userId,
      code,
      type,
      expiresAt,
    },
  });

  return code;
}

// Verify the code
export async function verifyCode(
  userId: string,
  code: string,
  type: "EMAIL_VERIFICATION" | "PASSWORD_RESET"
): Promise<boolean> {
  // Sanitize inputs
  const sanitizedUserId = sanitizeInput(userId);
  const sanitizedCode = sanitizeInput(code);

  const verificationCode = await db.verificationCode.findFirst({
    where: {
      userId: sanitizedUserId,
      code: sanitizedCode,
      type,
      used: false,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!verificationCode) {
    logSecurityEvent({
      action: "VERIFICATION_FAILED",
      userId: sanitizedUserId,
      status: "FAILURE",
      details: `Invalid ${type} code`,
    });
    return false;
  }

  // Mark as used
  await db.verificationCode.update({
    where: { id: verificationCode.id },
    data: { used: true },
  });

  // If email verification, mark user as verified
  if (type === "EMAIL_VERIFICATION") {
    await db.user.update({
      where: { id: sanitizedUserId },
      data: { isVerified: true },
    });

    logSecurityEvent({
      action: "EMAIL_VERIFIED",
      userId: sanitizedUserId,
      status: "SUCCESS",
    });
  }

  return true;
}

// Generate auth tokens for user
export async function generateAuthTokens(user: { id: string; email: string; role: string }) {
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

// Verify JWT token
export { verifyToken };

// Session management
export { generateSessionId, addUserSession };

// Security logging
export { logSecurityEvent };

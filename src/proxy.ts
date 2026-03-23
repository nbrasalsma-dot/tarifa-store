/**
 * Security Proxy for Tarifa Store (Next.js 16)
 * Provides protection against common web vulnerabilities
 */

import { NextRequest, NextResponse } from 'next/server';

// Rate limiting configuration
const rateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // max requests per window
  authMaxRequests: 10, // stricter limit for auth endpoints
};

// In-memory rate limiting store (consider Redis for production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Blocked IPs (can be populated dynamically)
const blockedIPs = new Set<string>();

// Suspicious patterns
const suspiciousPatterns = [
  // SQL Injection
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/i,
  /(--)|(\/\*)|(\*\/)/,
  /(\bOR\b|\bAND\b)\s*[\d\w]+\s*=\s*[\d\w]+/i,
  /('|")\s*(\bOR\b|\bAND\b)/i,
  
  // XSS
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/i,
  /on\w+\s*=/i,
  /<iframe/i,
  /<object/i,
  /<embed/i,
  
  // Path traversal
  /\.\.\//,
  /\.\.\\/,
  
  // Command injection
  /[;&|`$]/,
  /\b(eval|exec|system|shell|passthru|popen)\b/i,
  
  // NoSQL injection
  /\$where/i,
  /\$regex/i,
  /\$gt/i,
  /\$lt/i,
];

// Security headers
const securityHeaders = {
  'X-DNS-Prefetch-Control': 'on',
  'X-XSS-Protection': '1; mode=block',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

/**
 * Get client IP address
 */
function getClientIP(request: NextRequest): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const xRealIP = request.headers.get('x-real-ip');
  
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  
  if (xRealIP) {
    return xRealIP.trim();
  }
  
  return 'unknown';
}

/**
 * Check rate limiting
 */
function checkRateLimit(ip: string, isAuthEndpoint: boolean): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = isAuthEndpoint ? `auth:${ip}` : ip;
  const maxRequests = isAuthEndpoint ? rateLimitConfig.authMaxRequests : rateLimitConfig.maxRequests;
  
  let record = rateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    record = { count: 0, resetTime: now + rateLimitConfig.windowMs };
  }
  
  record.count++;
  rateLimitStore.set(key, record);
  
  // Clean up old entries periodically
  if (Math.random() < 0.01) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (now > v.resetTime) {
        rateLimitStore.delete(k);
      }
    }
  }
  
  return {
    allowed: record.count <= maxRequests,
    remaining: Math.max(0, maxRequests - record.count),
    resetTime: record.resetTime,
  };
}

/**
 * Check for suspicious content
 */
function hasSuspiciousContent(request: NextRequest): boolean {
  const url = request.nextUrl.search;
  const pathname = request.nextUrl.pathname;
  
  // Check URL parameters
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url) || pattern.test(pathname)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Validate request headers
 */
function validateHeaders(request: NextRequest): boolean {
  const userAgent = request.headers.get('user-agent');
  
  // Check for suspicious user agents
  const suspiciousUserAgents = [
    /sqlmap/i,
    /nikto/i,
    /nmap/i,
    /masscan/i,
    /burp/i,
    /owasp/i,
    /metasploit/i,
    /scanner/i,
  ];
  
  if (userAgent) {
    for (const pattern of suspiciousUserAgents) {
      if (pattern.test(userAgent)) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Log security event
 */
function logSecurityEvent(
  type: 'BLOCKED' | 'RATE_LIMITED' | 'SUSPICIOUS',
  ip: string,
  request: NextRequest,
  details?: string
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type,
    ip,
    method: request.method,
    url: request.nextUrl.pathname,
    userAgent: request.headers.get('user-agent'),
    details,
  };
  
  // In production, send to logging service
  console.warn('[SECURITY]', JSON.stringify(logEntry));
}

// Next.js 16 uses default export for proxy
export default function proxy(request: NextRequest) {
  const ip = getClientIP(request);
  const pathname = request.nextUrl.pathname;
  
  // Check if IP is blocked
  if (blockedIPs.has(ip)) {
    logSecurityEvent('BLOCKED', ip, request, 'Blocked IP');
    return new NextResponse('Forbidden', { status: 403 });
  }
  
  // Check for suspicious content
  if (hasSuspiciousContent(request)) {
    blockedIPs.add(ip); // Block the IP
    logSecurityEvent('SUSPICIOUS', ip, request, 'Suspicious pattern detected');
    return new NextResponse('Bad Request', { status: 400 });
  }
  
  // Validate headers
  if (!validateHeaders(request)) {
    logSecurityEvent('SUSPICIOUS', ip, request, 'Suspicious user agent');
    return new NextResponse('Forbidden', { status: 403 });
  }
  
  // Check rate limiting for API routes
  if (pathname.startsWith('/api/')) {
    const isAuthEndpoint = pathname.includes('/auth/');
    const rateLimit = checkRateLimit(ip, isAuthEndpoint);
    
    if (!rateLimit.allowed) {
      logSecurityEvent('RATE_LIMITED', ip, request, `Rate limit exceeded: ${pathname}`);
      return new NextResponse(
        JSON.stringify({ error: 'تم تجاوز حد الطلبات، يرجى المحاولة لاحقاً' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000)),
          },
        }
      );
    }
  }
  
  // Create response with security headers
  const response = NextResponse.next();
  
  // Apply security headers
  for (const [header, value] of Object.entries(securityHeaders)) {
    response.headers.set(header, value);
  }
  
  // Add HSTS in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }
  
  // Add CORS headers for API routes
  if (pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', request.headers.get('origin') || '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400');
  }
  
  // Remove server information
  response.headers.delete('X-Powered-By');
  
  return response;
}

/**
 * Configure which routes to apply proxy
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};

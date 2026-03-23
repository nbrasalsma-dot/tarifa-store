/**
 * Security API Routes for Tarifa Store
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Security event schema
const securityEventSchema = z.object({
  type: z.enum(['CSP_VIOLATION', 'XSS_ATTEMPT', 'SQL_INJECTION', 'RATE_LIMIT', 'SUSPICIOUS_ACTIVITY']),
  details: z.record(z.unknown()).optional(),
  url: z.string().optional(),
  userAgent: z.string().optional(),
});

// In-memory security events log (use database in production)
const securityEvents: Array<{
  id: string;
  timestamp: Date;
  ip: string;
  type: string;
  details?: Record<string, unknown>;
}> = [];

// Get client IP
function getClientIP(request: NextRequest): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

/**
 * POST /api/security/report
 * Report security events from the client
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const body = await request.json();
    
    // Validate input
    const validated = securityEventSchema.parse(body);
    
    // Log the event
    const event = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ip,
      type: validated.type,
      details: {
        ...validated.details,
        url: validated.url,
        userAgent: validated.userAgent,
      },
    };
    
    securityEvents.push(event);
    
    // Keep only last 1000 events in memory
    if (securityEvents.length > 1000) {
      securityEvents.shift();
    }
    
    console.warn('[SECURITY EVENT]', JSON.stringify(event));
    
    return NextResponse.json({ success: true, eventId: event.id });
  } catch (error) {
    console.error('[SECURITY API ERROR]', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}

/**
 * GET /api/security/events
 * Get recent security events (admin only)
 */
export async function GET(request: NextRequest) {
  // Simple auth check (use proper auth in production)
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Get query parameters
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const limit = parseInt(searchParams.get('limit') || '50');
  
  let filteredEvents = securityEvents;
  
  if (type) {
    filteredEvents = securityEvents.filter(e => e.type === type);
  }
  
  return NextResponse.json({
    events: filteredEvents.slice(-limit),
    total: securityEvents.length,
  });
}

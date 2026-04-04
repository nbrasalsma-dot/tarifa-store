
import { NextResponse } from "next/server";

/**
 * GET /api/auth/google
 * Initiates Google OAuth flow
 * Redirects user to Google consent screen
 */
export async function GET() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/auth/google/callback`;

    if (!clientId) {
        return NextResponse.json(
            { error: "Google OAuth غير مُعد بشكل صحيح" },
            { status: 500 }
        );
    }

    // Google OAuth 2.0 authorization URL
    const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");

    googleAuthUrl.searchParams.set("client_id", clientId);
    googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
    googleAuthUrl.searchParams.set("response_type", "code");
    googleAuthUrl.searchParams.set("scope", "openid email profile");
    googleAuthUrl.searchParams.set("access_type", "offline");
    googleAuthUrl.searchParams.set("prompt", "select_account");

    // Redirect to Google
    return NextResponse.redirect(googleAuthUrl.toString());
}
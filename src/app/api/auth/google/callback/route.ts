import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
    generateAuthTokens,
    logSecurityEvent,
} from "@/lib/security";

/**
 * GET /api/auth/google/callback
 * Handles Google OAuth callback
 * Creates or logs in user
 */
export async function GET(request: NextRequest) {
    const ip = request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    // Handle OAuth errors
    if (error) {
        console.error("Google OAuth error:", error);
        return NextResponse.redirect(
            new URL("/?auth=error&message=" + encodeURIComponent("تم رفض الوصول"), request.url)
        );
    }

    if (!code) {
        return NextResponse.redirect(
            new URL("/?auth=error&message=" + encodeURIComponent("كود التفويض مفقود"), request.url)
        );
    }

    try {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/auth/google/callback`;

        if (!clientId || !clientSecret) {
            throw new Error("Google OAuth credentials not configured");
        }

        // Exchange code for tokens
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
            }),
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.text();
            console.error("Token exchange failed:", errorData);
            throw new Error("Failed to exchange token");
        }

        const tokenData = await tokenResponse.json();
        const { access_token } = tokenData;

        // Get user info from Google
        const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${access_token}` },
        });

        if (!userResponse.ok) {
            throw new Error("Failed to fetch user info");
        }

        const googleUser = await userResponse.json();
        const { email, name, id: googleId } = googleUser;

        if (!email) {
            return NextResponse.redirect(
                new URL("/?auth=error&message=" + encodeURIComponent("لم يتم العثور على بريد إلكتروني"), request.url)
            );
        }

        // Check if user exists
        let user = await db.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (user) {
            // User exists - check if active
            if (!user.isActive) {
                logSecurityEvent({
                    action: "GOOGLE_LOGIN_FAILED_INACTIVE",
                    userId: user.id,
                    email: user.email,
                    ip,
                    userAgent,
                    status: "FAILURE",
                    details: "Account is deactivated",
                });

                return NextResponse.redirect(
                    new URL("/?auth=error&message=" + encodeURIComponent("تم تعطيل حسابك. يرجى التواصل مع الإدارة"), request.url)
                );
            }

            // Update user info if needed
            if (!user.isVerified) {
                await db.user.update({
                    where: { id: user.id },
                    data: { isVerified: true },
                });
            }

            logSecurityEvent({
                action: "GOOGLE_LOGIN_SUCCESS",
                userId: user.id,
                email: user.email,
                ip,
                userAgent,
                status: "SUCCESS",
                details: "Logged in via Google OAuth",
            });
        } else {
            // Create new user
            user = await db.user.create({
                data: {
                    email: email.toLowerCase(),
                    name: name || email.split("@")[0],
                    password: "", // No password for Google OAuth users
                    phone: "", // Will be required later
                    role: "CUSTOMER",
                    isVerified: true, // Google verified the email
                    isActive: true,
                },
            });

            logSecurityEvent({
                action: "GOOGLE_REGISTER_SUCCESS",
                userId: user.id,
                email: user.email,
                ip,
                userAgent,
                status: "SUCCESS",
                details: "New user registered via Google OAuth",
            });
        }

        // Generate tokens
        const tokens = await generateAuthTokens(user);

        // Create redirect URL with tokens
        const redirectUrl = new URL("/", request.url);
        redirectUrl.searchParams.set("auth", "success");
        redirectUrl.searchParams.set("token", tokens.accessToken);
        redirectUrl.searchParams.set("userId", user.id);
        redirectUrl.searchParams.set("userName", encodeURIComponent(user.name));
        redirectUrl.searchParams.set("userEmail", user.email);
        redirectUrl.searchParams.set("userRole", user.role);

        return NextResponse.redirect(redirectUrl.toString());
    } catch (error) {
        console.error("Google OAuth callback error:", error);

        logSecurityEvent({
            action: "GOOGLE_OAUTH_ERROR",
            ip,
            userAgent,
            status: "FAILURE",
            details: error instanceof Error ? error.message : "Unknown error",
        });

        return NextResponse.redirect(
            new URL("/?auth=error&message=" + encodeURIComponent("حدث خطأ أثناء تسجيل الدخول"), request.url)
        );
    }
}
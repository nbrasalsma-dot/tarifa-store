import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Generate ImageKit authentication signature
 * Documentation: https://docs.imagekit.io/api-reference/upload-file-api/server-side-file-upload#creating-the-signature
 * 
 * Environment variables needed:
 * - IMAGEKIT_PRIVATE_KEY: Your ImageKit private key
 * - NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY: Your ImageKit public key
 * - NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT: Your ImageKit URL endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName } = body;

    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;

    // If ImageKit is not configured, return error
    if (!privateKey || !publicKey) {
      return NextResponse.json({
        error: "ImageKit not configured",
        message: "Please add IMAGEKIT_PRIVATE_KEY and NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY to your environment variables",
      }, { status: 500 });
    }

    // Generate authentication parameters
    // ImageKit requires expire timestamp (seconds since epoch)
    const expire = Math.floor(Date.now() / 1000) + 2400; // 40 minutes from now
    
    // Generate a random token (optional but recommended)
    const token = crypto.randomBytes(16).toString("hex");
    
    // Create signature according to ImageKit documentation
    // Signature = HMAC-SHA256(privateKey, expire + token)
    // Or: Signature = SHA1(token + expire + privateKey) for simpler approach
    
    // Using the simpler SHA1 approach that ImageKit supports
    const signatureInput = token + expire + privateKey;
    const signature = crypto.createHash("sha1").update(signatureInput).digest("hex");

    return NextResponse.json({
      signature,
      expire,
      token,
      publicKey,
      fileName: fileName || `tarifa-${Date.now()}`,
    });

  } catch (error) {
    console.error("Upload auth error:", error);
    return NextResponse.json({
      error: "Failed to generate upload authentication",
    }, { status: 500 });
  }
}

// GET endpoint to check if ImageKit is configured
export async function GET() {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
  const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;

  const isConfigured = !!(privateKey && publicKey && urlEndpoint);

  return NextResponse.json({
    configured: isConfigured,
    publicKey: publicKey || null,
    urlEndpoint: urlEndpoint || null,
    message: isConfigured 
      ? "ImageKit is configured and ready to use" 
      : "ImageKit is not configured. Please add the required environment variables.",
  });
}

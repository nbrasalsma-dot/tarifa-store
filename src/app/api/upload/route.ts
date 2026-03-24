import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Server-side Image Upload to ImageKit
 * This route receives the image from client and uploads it to ImageKit from server
 * This avoids CORS issues when uploading directly from browser
 *
 * Last updated: March 2025 - Force rebuild for Vercel
 * 
 * ImageKit credentials (from Vercel Environment Variables):
 * - Public Key: public_Wksh6UwSA7ogAHZPkF8DZNaDMMA=
 * - Private Key: (secured in Vercel)
 * - URL Endpoint: https://ik.imagekit.io/tarifastore/
 */

export async function POST(request: NextRequest) {
  try {
    // ImageKit private key must be without the 'private_' prefix
    let privateKey = process.env.IMAGEKIT_PRIVATE_KEY || "";
    // Remove 'private_' prefix if present (ImageKit expects the key without prefix)
    if (privateKey.startsWith("private_")) {
      privateKey = privateKey.substring(8);
    }
    const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;

    // Check if ImageKit is configured
    if (!privateKey || !publicKey) {
      console.error("[Upload API] ImageKit not configured");
      return NextResponse.json({
        success: false,
        error: "ImageKit غير مُعد - تواصل مع الإدارة",
      }, { status: 500 });
    }

    // Get the form data from request
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({
        success: false,
        error: "لم يتم استلام الصورة",
      }, { status: 400 });
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({
        success: false,
        error: "حجم الملف كبير جداً (الحد الأقصى 5MB)",
      }, { status: 400 });
    }

    // Check file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        success: false,
        error: "نوع الملف غير مدعوم (JPEG, PNG, WebP, GIF)",
      }, { status: 400 });
    }

    console.log("[Upload API] Processing file:", file.name, "Size:", file.size);

    // Generate authentication parameters
    const expire = Math.floor(Date.now() / 1000) + 2400; // 40 minutes
    const token = crypto.randomBytes(16).toString("hex");
    const signatureInput = token + expire;
    const signature = crypto
      .createHmac("sha256", privateKey)
      .update(signatureInput)
      .digest("hex");

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64File = buffer.toString("base64");

    // Generate filename
    const fileName = `tarifa-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    // Create form data for ImageKit
    const imageKitFormData = new FormData();
    imageKitFormData.append("file", base64File);
    imageKitFormData.append("fileName", fileName);
    imageKitFormData.append("signature", signature);
    imageKitFormData.append("expire", expire.toString());
    imageKitFormData.append("token", token);
    imageKitFormData.append("publicKey", publicKey);
    imageKitFormData.append("folder", "/products");
    imageKitFormData.append("useUniqueFileName", "true");

    console.log("[Upload API] Uploading to ImageKit...");

    // Upload to ImageKit
    const uploadResponse = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      body: imageKitFormData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("[Upload API] ImageKit upload failed:", errorText);
      return NextResponse.json({
        success: false,
        error: `فشل رفع الصورة إلى السحابة: ${uploadResponse.status}`,
      }, { status: 500 });
    }

    const result = await uploadResponse.json();
    console.log("[Upload API] Upload successful:", result.url);

    return NextResponse.json({
      success: true,
      url: result.url,
      fileId: result.fileId,
      fileName: result.name,
    });

  } catch (error) {
    console.error("[Upload API] Error:", error);
    return NextResponse.json({
      success: false,
      error: "حدث خطأ أثناء رفع الصورة",
    }, { status: 500 });
  }
}

// GET endpoint to check if upload API is working
export async function GET() {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
  const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;

  return NextResponse.json({
    status: "ok",
    imageKitConfigured: !!(privateKey && publicKey && urlEndpoint),
    message: privateKey && publicKey 
      ? "Upload API is ready" 
      : "ImageKit not configured",
  });
}

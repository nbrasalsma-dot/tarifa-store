/**
 * Image Upload Service for Tarifa Store
 * Uploads images to ImageKit cloud storage
 * 
 * ImageKit credentials:
 * - Public Key: public_Wksh6UwSA7ogAHZPkF8DZNaDMMA=
 * - Private Key: private_axKYAD+8m9LUQdlR0G/RvTZM4mg= (server-side only)
 * - ImagekitID: tarifastore
 * - URL-endpoint: https://ik.imagekit.io/tarifastore
 */

// Image upload result
export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload image to ImageKit (cloud storage)
 * Uses server-side API route for authentication
 */
export async function uploadImage(file: File): Promise<UploadResult> {
  // Check file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: "حجم الملف كبير جداً (الحد الأقصى 5MB)" };
  }

  // Check file type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: "نوع الملف غير مدعوم (JPEG, PNG, WebP, GIF)" };
  }

  // Upload to ImageKit via server-side auth
  return uploadToImageKit(file);
}

/**
 * Upload to ImageKit cloud storage
 * Uses server-side API route for secure authentication
 * Documentation: https://docs.imagekit.io/api-reference/upload-file-api/server-side-file-upload
 */
async function uploadToImageKit(file: File): Promise<UploadResult> {
  try {
    console.log("[ImageKit] Starting upload for file:", file.name);
    
    // Step 1: Get authentication signature from server-side API
    const authResponse = await fetch("/api/upload/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: file.name }),
    });

    if (!authResponse.ok) {
      const errorData = await authResponse.json();
      console.error("[ImageKit] Auth failed:", errorData);
      return { 
        success: false, 
        error: errorData.message || "فشل في المصادقة على رفع الصورة" 
      };
    }

    const authData = await authResponse.json();
    console.log("[ImageKit] Auth response received:", { 
      expire: authData.expire, 
      token: authData.token,
      publicKey: authData.publicKey 
    });

    // Check if ImageKit is configured
    if (!authData.publicKey) {
      console.error("[ImageKit] Not configured - missing public key");
      return { success: false, error: "ImageKit غير مُعد بشكل صحيح" };
    }

    // Step 2: Create form data for ImageKit upload
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileName", `tarifa-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`);
    formData.append("signature", authData.signature);
    formData.append("expire", authData.expire.toString());
    formData.append("token", authData.token);
    formData.append("publicKey", authData.publicKey);
    formData.append("folder", "/products");
    formData.append("useUniqueFileName", "true");

    console.log("[ImageKit] Uploading to ImageKit...");

    // Step 3: Upload to ImageKit
    const uploadResponse = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("[ImageKit] Upload failed:", errorText);
      return { 
        success: false, 
        error: `فشل رفع الصورة: ${uploadResponse.status}` 
      };
    }

    const result = await uploadResponse.json();
    console.log("[ImageKit] Upload successful:", result.url);

    return {
      success: true,
      url: result.url,
    };
  } catch (error) {
    console.error("[ImageKit] Upload error:", error);
    return { 
      success: false, 
      error: "حدث خطأ أثناء رفع الصورة" 
    };
  }
}

/**
 * Validate image URL
 */
export function isValidImageUrl(url: string): boolean {
  try {
    new URL(url);
    return /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(url);
  } catch {
    return false;
  }
}

/**
 * Get optimized image URL with ImageKit transformations
 */
export function getOptimizedImageUrl(
  url: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
  } = {}
): string {
  const { width, height, quality = 80 } = options;
  
  // If it's an ImageKit URL, add transformations
  if (url.includes("imagekit.io")) {
    const params = [];
    if (width) params.push(`w-${width}`);
    if (height) params.push(`h-${height}`);
    params.push(`q-${quality}`);
    
    if (params.length > 0) {
      const separator = url.includes("?") ? "&" : "?";
      return `${url}${separator}tr=${params.join(",")}`;
    }
  }
  
  return url;
}

/**
 * Check if ImageKit is configured (via API)
 */
export async function checkImageKitConfig(): Promise<{
  configured: boolean;
  publicKey?: string;
  urlEndpoint?: string;
}> {
  try {
    const response = await fetch("/api/upload/auth");
    const data = await response.json();
    return {
      configured: data.configured,
      publicKey: data.publicKey,
      urlEndpoint: data.urlEndpoint,
    };
  } catch {
    return { configured: false };
  }
}

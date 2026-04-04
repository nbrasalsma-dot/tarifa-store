/**
 * Image Upload Service
 * Supports: ImageKit, Base64, and URL
 * 
 * When deploying to Vercel, add these environment variables:
 * - IMAGEKIT_PRIVATE_KEY
 * - NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY
 * - NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT
 * 
 * ImageKit credentials for Tarifa Store:
 * - Public Key: public_Wksh6UwSA7ogAHZPkF8DZNaDMMA=
 * - Private Key: private_axKYAD+8m9LUQdlR0G/RvTZM4mg=
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
 * Falls back to base64 if ImageKit is not configured
 */
export async function uploadImage(file: File, folderPath: string = "/products/general"): Promise<UploadResult> {
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        return { success: false, error: "حجم الملف كبير جداً (الحد الأقصى 5MB)" };
    }

    // Check file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
        return { success: false, error: "نوع الملف غير مدعوم (JPEG, PNG, WebP, GIF)" };
    }

    const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
    const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;

    // If ImageKit is configured, use it
    if (publicKey && urlEndpoint) {
        return uploadToImageKit(file, publicKey, urlEndpoint, folderPath); // 👈 هنا مررنا مسار المجلد
    }

    // Otherwise, convert to base64 (for development)
    return convertToBase64(file);
}
/**
 * Upload to ImageKit cloud storage
 * Documentation: https://docs.imagekit.io/api-reference/upload-file-api/server-side-file-upload
 */
async function uploadToImageKit(
  file: File,
  publicKey: string,
  urlEndpoint: string,
  folderPath: string
): Promise<UploadResult> {
  try {
    console.log("[ImageKit] Starting upload for file:", file.name);
    
    // Generate authentication signature (server-side)
    const authResponse = await fetch("/api/upload/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: file.name }),
    });

    if (!authResponse.ok) {
      const errorData = await authResponse.json();
      console.error("[ImageKit] Auth failed:", errorData);
      throw new Error(errorData.message || "Failed to get upload authentication");
    }

    const authData = await authResponse.json();
    console.log("[ImageKit] Auth response received:", { expire: authData.expire, token: authData.token });

    // Create form data for ImageKit upload
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileName", `tarifa-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`);
    formData.append("signature", authData.signature);
    formData.append("expire", authData.expire.toString());
    formData.append("token", authData.token);
    formData.append("publicKey", publicKey);
    // Optional: add folder parameter
    formData.append("folder", folderPath);
    // Optional: use unique filename
    formData.append("useUniqueFileName", "true");

    console.log("[ImageKit] Uploading to ImageKit...");

    // Upload to ImageKit
    const uploadResponse = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("[ImageKit] Upload failed:", errorText);
      throw new Error(`Upload failed: ${uploadResponse.status}`);
    }

    const result = await uploadResponse.json();
    console.log("[ImageKit] Upload successful:", result.url);

    return {
      success: true,
      url: result.url,
    };
  } catch (error) {
    console.error("[ImageKit] Upload error:", error);
    // Fall back to base64
    console.log("[ImageKit] Falling back to base64...");
    return convertToBase64(file);
  }
}

/**
 * Convert file to base64 (fallback for development)
 */
async function convertToBase64(file: File): Promise<UploadResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        success: true,
        url: reader.result as string,
      });
    };
    reader.onerror = () => {
      resolve({
        success: false,
        error: "فشل قراءة الملف",
      });
    };
    reader.readAsDataURL(file);
  });
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
 * Check if ImageKit is configured
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
/**
 * حذف صورة من ImageKit نهائياً باستخدام الرابط
 * ملاحظة: هذه الدالة يجب أن تُستدعى فقط من جهة السيرفر (API Routes)
 */
export async function deleteImageFromImageKit(imageUrl: string): Promise<boolean> {
  try {
    // 1. التحقق من أن الرابط يتبع لـ ImageKit
    if (!imageUrl || !imageUrl.includes("imagekit.io")) {
      console.log("[Delete] Not an ImageKit URL, skipping cloud deletion.");
      return false;
    }

    const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/tarifastore";
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;

    if (!privateKey) {
      console.error("[Delete] Private Key is missing. Check environment variables.");
      return false;
    }

    // 2. استخراج مسار الملف (File Path) من الرابط
    // مثال: https://ik.imagekit.io/tarifastore/products/image.jpg -> products/image.jpg
    const filePath = imageUrl.replace(urlEndpoint, "").split("?")[0];
    
    // 3. جلب بيانات الملف أولاً للحصول على معرف الملف (fileId)
    // لأن ImageKit يتطلب fileId للحذف وليس الرابط المباشر
    const authHeader = Buffer.from(`${privateKey}:`).toString("base64");
    
    const listResponse = await fetch(`https://api.imagekit.io/v1/files?path=${filePath}`, {
      headers: { Authorization: `Basic ${authHeader}` },
    });

    if (!listResponse.ok) throw new Error("Failed to find file on ImageKit");
    
    const files = await listResponse.json();
    if (!files || files.length === 0) {
      console.log("[Delete] File not found on ImageKit server.");
      return false;
    }

    const fileId = files[0].fileId;

    // 4. تنفيذ عملية الحذف النهائية
    const deleteResponse = await fetch(`https://api.imagekit.io/v1/files/${fileId}`, {
      method: "DELETE",
      headers: { Authorization: `Basic ${authHeader}` },
    });

    if (deleteResponse.ok || deleteResponse.status === 204) {
      console.log("[Delete] Image deleted successfully from ImageKit:", filePath);
      return true;
    }

    return false;
  } catch (error) {
    console.error("[ImageKit] Delete error:", error);
    return false;
  }
}
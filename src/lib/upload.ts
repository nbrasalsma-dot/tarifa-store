/**
 * Image Upload Service for Tarifa Store
 * Uploads images to ImageKit cloud storage via server-side API
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
 * Uses server-side API route to avoid CORS issues
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

  return uploadViaServerAPI(file);
}

/**
 * Upload via server-side API route
 * This avoids CORS issues by uploading from the server
 */
async function uploadViaServerAPI(file: File): Promise<UploadResult> {
  try {
    console.log("[Upload] Starting upload for file:", file.name, "Size:", file.size);

    // Create form data
    const formData = new FormData();
    formData.append("file", file);

    // Upload via our server-side API
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error("[Upload] Failed:", result.error);
      return {
        success: false,
        error: result.error || "فشل رفع الصورة",
      };
    }

    console.log("[Upload] Success:", result.url);

    return {
      success: true,
      url: result.url,
    };

  } catch (error) {
    console.error("[Upload] Error:", error);
    return {
      success: false,
      error: "حدث خطأ أثناء رفع الصورة",
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
 * Check if ImageKit is configured
 */
export async function checkImageKitConfig(): Promise<{
  configured: boolean;
  publicKey?: string;
  urlEndpoint?: string;
}> {
  try {
    const response = await fetch("/api/upload");
    const data = await response.json();
    return {
      configured: data.imageKitConfigured || false,
    };
  } catch {
    return { configured: false };
  }
}

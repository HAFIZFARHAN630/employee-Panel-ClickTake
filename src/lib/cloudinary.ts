let cloudinaryInstance: ReturnType<typeof import("cloudinary").v2> | null = null;

async function getCloudinary() {
  if (cloudinaryInstance) return cloudinaryInstance;
  const cloudinary = (await import("cloudinary")).v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  cloudinaryInstance = cloudinary;
  return cloudinary;
}

/**
 * Upload a file (base64 data URI or URL) to Cloudinary.
 * Returns the secure URL of the uploaded file, or null on failure.
 */
export async function uploadToCloudinary(
  file: string,
  options?: Record<string, unknown>,
): Promise<string | null> {
  try {
    const cloudinary = await getCloudinary();
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      cloudinary.uploader.upload(
        file,
        {
          folder: "ems",
          resource_type: "auto",
          ...options,
        },
        (error: Error | undefined, result: { secure_url: string } | undefined) => {
          if (error) reject(error);
          else if (result) resolve(result);
          else reject(new Error("No result from Cloudinary"));
        },
      );
    });
    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    return null;
  }
}

/**
 * Delete a file from Cloudinary by its public ID.
 */
export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  try {
    const cloudinary = await getCloudinary();
    await new Promise<void>((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error: Error | undefined) => {
        if (error) reject(error);
        else resolve();
      });
    });
    return true;
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    return false;
  }
}

/** Whether Cloudinary is configured (has required env vars) */
export function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}
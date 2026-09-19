// src/services/cloudinary.service.js
import cloudinary, { isCloudinaryConfigured } from "../config/cloudinary.js";
import ApiError from "../utils/ApiError.js";

const DEFAULT_FOLDER = "foundry/barbers";

/**
 * Upload a file buffer to Cloudinary safely using stream.
 *
 * @param {Buffer} fileBuffer
 * @param {Object} options
 * @returns {Promise<{ url: string, publicId: string }>}
 */
export const uploadImageBuffer = (fileBuffer, options = {}) => {
  return new Promise((resolve, reject) => {
    if (!isCloudinaryConfigured()) {
      return reject(
        new ApiError(
          500,
          "Cloudinary credentials missing. Please check server environment configuration."
        )
      );
    }

    const folder = options.folder || DEFAULT_FOLDER;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        transformation: [
          { width: 1000, height: 1000, crop: "limit" },
          { quality: "auto", fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          return reject(new ApiError(500, "Image upload to Cloudinary failed"));
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    uploadStream.end(fileBuffer);
  });
};

/**
 * Delete an asset from Cloudinary by publicId.
 *
 * @param {string} publicId
 * @returns {Promise<boolean>}
 */
export const deleteImageByPublicId = async (publicId) => {
  if (!publicId || typeof publicId !== "string") return false;
  if (!isCloudinaryConfigured()) return false;

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
      invalidate: true,
    });
    return result.result === "ok";
  } catch (error) {
    console.error(`Failed to delete Cloudinary asset ${publicId}:`, error.message);
    return false;
  }
};

/**
 * Safe Image Replacement Pattern:
 * 1. Upload new image.
 * 2. Run DB update with new photo metadata ({ url, publicId }).
 * 3. On DB success: if oldPublicId exists, delete old image from Cloudinary.
 * 4. On DB failure: cleanup newly uploaded image to prevent orphaned assets.
 *
 * @param {Buffer} fileBuffer
 * @param {string|null} oldPublicId
 * @param {Function} dbUpdateCallback async (photoData) => doc
 * @returns {Promise<any>} DB update result
 */
export const replaceImageSafely = async (fileBuffer, oldPublicId, dbUpdateCallback) => {
  // Step 1: Upload new image
  const newPhoto = await uploadImageBuffer(fileBuffer);

  try {
    // Step 2: Execute database update
    const result = await dbUpdateCallback(newPhoto);

    // Step 3: Delete old Cloudinary asset if update succeeded
    if (oldPublicId && oldPublicId !== newPhoto.publicId) {
      deleteImageByPublicId(oldPublicId).catch((err) =>
        console.error("Non-blocking old image deletion error:", err)
      );
    }

    return result;
  } catch (dbError) {
    // Step 4: Cleanup newly uploaded asset on DB failure
    console.error(
      "DB update failed after Cloudinary upload. Cleaning up new asset:",
      newPhoto.publicId
    );
    deleteImageByPublicId(newPhoto.publicId).catch((err) =>
      console.error("Cleanup error for orphaned image:", err)
    );

    throw dbError;
  }
};

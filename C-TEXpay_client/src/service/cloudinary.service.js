/**
 * Cloudinary upload helper.
 *
 * Uses unsigned uploads so no secret is ever exposed to the browser.
 * Configure the upload preset as "unsigned" in your Cloudinary dashboard:
 *   Settings → Upload → Add upload preset → Signing Mode: Unsigned
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export class CloudinaryError extends Error {
  constructor(message, code = "UPLOAD_FAILED") {
    super(message);
    this.code = code;
  }
}

function assertConfigured() {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new CloudinaryError(
      "Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.",
      "NOT_CONFIGURED"
    );
  }
}

export function validateImage(file) {
  if (!file) {
    throw new CloudinaryError("No file selected.", "NO_FILE");
  }
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new CloudinaryError(
      "Only JPG, PNG, WEBP, or GIF images are allowed.",
      "INVALID_TYPE"
    );
  }
  if (file.size > MAX_BYTES) {
    throw new CloudinaryError(
      `Image must be under ${(MAX_BYTES / 1024 / 1024).toFixed(0)} MB.`,
      "TOO_LARGE"
    );
  }
}

/**
 * Upload a file to Cloudinary (unsigned).
 * @param {File} file
 * @param {string} [folder="ctexpay/business-logos"]
 * @returns {Promise<{ url: string, publicId: string, width: number, height: number, format: string }>}
 */
export async function uploadImage(file, folder = "ctexpay/business-logos") {
  assertConfigured();
  validateImage(file);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", folder);

  let response;
  try {
    response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );
  } catch {
    throw new CloudinaryError(
      "Could not reach the image service. Check your connection.",
      "NETWORK"
    );
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    /* fall through */
  }

  if (!response.ok) {
    throw new CloudinaryError(
      data?.error?.message || "Image upload failed. Please try again.",
      "UPLOAD_FAILED"
    );
  }

  if (!data?.secure_url) {
    throw new CloudinaryError(
      "Upload succeeded but no image URL was returned.",
      "NO_URL"
    );
  }

  return {
    url: data.secure_url,
    publicId: data.public_id,
    width: data.width,
    height: data.height,
    format: data.format,
  };
}
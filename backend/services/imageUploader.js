/**
 * Image Upload Service
 * Uploads images to Cloudinary for public hosting
 * Required for Ayrshare which needs externally accessible URLs
 */

const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload a base64 image to Cloudinary
 * @param {string} base64Data - Base64 encoded image data (with or without data URL prefix)
 * @param {string} folder - Optional folder name in Cloudinary
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
async function uploadBase64Image(base64Data, folder = 'nebula-campaigns') {
  try {
    // Ensure the base64 string has the proper data URL prefix
    let uploadData = base64Data;
    if (!base64Data.startsWith('data:')) {
      // Assume it's a JPEG if no prefix
      uploadData = `data:image/jpeg;base64,${base64Data}`;
    }

    const result = await cloudinary.uploader.upload(uploadData, {
      folder: folder,
      resource_type: 'image',
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ]
    });

    console.log('✅ Image uploaded to Cloudinary:', result.secure_url);

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id
    };
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Upload multiple base64 images
 * @param {string[]} base64Images - Array of base64 encoded images
 * @param {string} folder - Optional folder name
 * @returns {Promise<string[]>} - Array of uploaded URLs
 */
async function uploadMultipleImages(base64Images, folder = 'nebula-campaigns') {
  const uploadPromises = base64Images.map(img => uploadBase64Image(img, folder));
  const results = await Promise.all(uploadPromises);
  
  // Return only successful uploads
  return results
    .filter(r => r.success)
    .map(r => r.url);
}

/**
 * Check if a URL is a base64 data URL
 * @param {string} url - The URL to check
 * @returns {boolean}
 */
function isBase64DataUrl(url) {
  return url && (url.startsWith('data:image') || url.startsWith('data:application'));
}

/**
 * Convert image URL to Cloudinary URL if needed
 * If it's already a hosted URL, return as-is
 * If it's a base64 data URL, upload to Cloudinary first
 * @param {string} imageUrl - The image URL to process
 * @returns {Promise<string|null>} - Publicly accessible URL
 */
async function ensurePublicUrl(imageUrl) {
  if (!imageUrl) return null;
  
  // If it's already a hosted URL, return as-is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // If it's a base64 data URL, upload to Cloudinary
  if (isBase64DataUrl(imageUrl)) {
    const result = await uploadBase64Image(imageUrl);
    return result.success ? result.url : null;
  }
  
  // Unknown format
  console.warn('Unknown image format:', imageUrl.substring(0, 50));
  return null;
}

module.exports = {
  uploadBase64Image,
  uploadMultipleImages,
  isBase64DataUrl,
  ensurePublicUrl
};

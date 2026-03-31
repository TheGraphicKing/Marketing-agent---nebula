const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');

const { uploadVideoFile } = require('./imageUploader');

let ffmpegPath = null;
try {
  ffmpegPath = require('ffmpeg-static');
} catch (_) {
  ffmpegPath = null;
}

async function safeUnlink(filePath) {
  try {
    await fs.promises.unlink(filePath);
  } catch (_) {}
}

async function downloadToFile(url, filePath) {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to download ${url} (${res.status}): ${text.substring(0, 200)}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  await fs.promises.writeFile(filePath, Buffer.from(arrayBuffer));
}

async function runFfmpeg(args) {
  if (!ffmpegPath) {
    throw new Error('ffmpeg-static is not installed (cannot compose video with audio)');
  }

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { windowsHide: true });

    let stderr = '';
    proc.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) return resolve();
      reject(new Error(`ffmpeg exited with code ${code}: ${stderr.substring(0, 4000)}`));
    });
  });
}

/**
 * Convert a still image + audio into an MP4 video and upload to Cloudinary.
 * Intended for Instagram posts that require a video format when audio is attached.
 * @param {object} params
 * @param {string} params.imageUrl - Public URL to the image
 * @param {string} params.audioUrl - Public URL to the audio
 * @param {string} [params.cloudinaryFolder] - Cloudinary folder for the generated videos
 */
async function composeImageToVideoWithAudio({ imageUrl, audioUrl, cloudinaryFolder = 'nebula-instagram-audio-posts' }) {
  if (!imageUrl || !audioUrl) {
    return { success: false, error: 'imageUrl and audioUrl are required' };
  }

  const id = crypto.randomBytes(8).toString('hex');
  const tmpDir = os.tmpdir();

  const imagePath = path.join(tmpDir, `nebula_ig_img_${id}.bin`);
  const audioPath = path.join(tmpDir, `nebula_ig_audio_${id}.bin`);
  const outPath = path.join(tmpDir, `nebula_ig_out_${id}.mp4`);

  try {
    await downloadToFile(imageUrl, imagePath);
    await downloadToFile(audioUrl, audioPath);

    const args = [
      '-y',
      '-loop', '1',
      '-i', imagePath,
      '-i', audioPath,
      '-c:v', 'libx264',
      '-tune', 'stillimage',
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-shortest',
      '-movflags', '+faststart',
      outPath
    ];

    await runFfmpeg(args);

    const upload = await uploadVideoFile(outPath, cloudinaryFolder);
    if (!upload.success || !upload.url) {
      return { success: false, error: upload.error || 'Failed to upload composed video' };
    }

    return {
      success: true,
      videoUrl: upload.url,
      publicId: upload.publicId || null,
      duration: upload.duration || null,
      bytes: upload.bytes || null
    };
  } catch (error) {
    return { success: false, error: error.message || 'Failed to compose video' };
  } finally {
    await Promise.all([safeUnlink(imagePath), safeUnlink(audioPath), safeUnlink(outPath)]);
  }
}

module.exports = {
  composeImageToVideoWithAudio
};


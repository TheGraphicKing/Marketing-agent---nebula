const User = require('../models/User');
const { publishSocialPostWithSafetyWrapper } = require('./instagram-fix');
const { composeImageToVideoWithAudio } = require('./mediaComposer');
const { ensurePublicAudioUrl } = require('./imageUploader');

const INSTAGRAM_UPLOAD_SETTLE_DELAY_MS = (() => {
  const raw = Number.parseInt(String(process.env.INSTAGRAM_POST_UPLOAD_SETTLE_DELAY_MS || '7000'), 10);
  if (!Number.isFinite(raw)) return 7000;
  return Math.min(Math.max(raw, 5000), 10000);
})();

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeHashtag(tag) {
  const t = String(tag || '').trim();
  if (!t) return null;
  return t.startsWith('#') ? t : `#${t}`;
}

function extractHashtagsFromText(text) {
  return String(text || '')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.startsWith('#'));
}

function getCampaignPostContent(campaign) {
  return (
    campaign?.creative?.textContent ||
    campaign?.creative?.captions ||
    campaign?.name ||
    'New post'
  );
}

function getCampaignHashtags(campaign) {
  const explicit = campaign?.creative?.hashtags;
  if (Array.isArray(explicit) && explicit.length > 0) {
    return explicit.map(normalizeHashtag).filter(Boolean);
  }

  return extractHashtagsFromText(campaign?.creative?.captions).map(normalizeHashtag).filter(Boolean);
}

function getCampaignMediaUrls(campaign) {
  const creativeType = String(campaign?.creative?.type || '').toLowerCase();
  if ((creativeType === 'video' || creativeType === 'reel') && campaign?.creative?.videoUrl) {
    return [campaign.creative.videoUrl];
  }
  if (Array.isArray(campaign?.creative?.imageUrls) && campaign.creative.imageUrls.length > 0) {
    return campaign.creative.imageUrls;
  }
  return undefined;
}

function buildCampaignPostPayload(campaign) {
  const platforms = Array.isArray(campaign?.platforms) && campaign.platforms.length > 0
    ? campaign.platforms
    : ['instagram'];

  const postContent = getCampaignPostContent(campaign);
  const hashtags = getCampaignHashtags(campaign);
  const mediaUrls = getCampaignMediaUrls(campaign);

  const fullPost = hashtags.length > 0
    ? `${postContent}\n\n${hashtags.join(' ')}`
    : postContent;

  return { platforms, fullPost, mediaUrls };
}

function getPrimaryCampaignImageUrl(campaign) {
  return Array.isArray(campaign?.creative?.imageUrls)
    ? campaign.creative.imageUrls.map((url) => String(url || '').trim()).find(Boolean) || null
    : null;
}

function hasInstagramAudioAttachment(campaign, platforms = []) {
  const normalizedPlatforms = Array.isArray(platforms)
    ? platforms.map((platform) => String(platform || '').trim().toLowerCase()).filter(Boolean)
    : [];

  return normalizedPlatforms.includes('instagram') &&
    typeof campaign?.creative?.instagramAudio?.url === 'string' &&
    campaign.creative.instagramAudio.url.trim().length > 0;
}

function extractAyrsharePostId(result) {
  return result?.data?.posts?.[0]?.id ||
    result?.data?.id ||
    result?.data?.postIds?.[0] ||
    result?.postId ||
    null;
}

function hasCloudinaryTransformations(url = '') {
  const value = String(url || '').trim();
  if (!value) return false;

  const marker = '/upload/';
  const markerIndex = value.indexOf(marker);
  if (markerIndex === -1) return false;

  const afterUpload = value.slice(markerIndex + marker.length);
  const firstSegment = afterUpload.split('/')[0] || '';
  if (!firstSegment) return false;

  return !/^v\d+$/i.test(firstSegment);
}

function summarizeComposedResult(composed = null) {
  if (!composed || typeof composed !== 'object') return null;

  return {
    success: composed?.success === true,
    videoUrl: composed?.videoUrl || null,
    error: composed?.error || null,
    metadata: composed?.metadata ? {
      format: composed?.metadata?.format || null,
      durationSeconds: composed?.metadata?.durationSeconds ?? null,
      resolution: composed?.metadata?.video?.resolution || null,
      videoCodec: composed?.metadata?.video?.codec || null,
      videoBitrateKbps: composed?.metadata?.video?.bitrateKbps ?? null,
      audioCodec: composed?.metadata?.audio?.codec || null,
      audioBitrateKbps: composed?.metadata?.audio?.bitrateKbps ?? null
    } : null
  };
}

function validateComposedInstagramVideo(composed = null) {
  if (!composed || typeof composed !== 'object') {
    return {
      valid: false,
      error: 'Composition returned null or invalid result',
      videoUrl: null
    };
  }

  if (composed.success !== true) {
    return {
      valid: false,
      error: composed?.error || 'Instagram video composition failed',
      videoUrl: null
    };
  }

  const videoUrl = String(composed?.videoUrl || '').trim();
  if (!videoUrl) {
    return {
      valid: false,
      error: 'Composition returned null or invalid result',
      videoUrl: null
    };
  }

  const metadata = composed?.metadata;
  if (!metadata || typeof metadata !== 'object') {
    return {
      valid: false,
      error: 'Composed video metadata is missing',
      videoUrl
    };
  }

  const duration = Number.parseInt(metadata?.durationSeconds, 10);
  if (!Number.isFinite(duration) || duration < 3 || duration > 90) {
    return {
      valid: false,
      error: `Composed video duration is invalid (${metadata?.durationSeconds || 'unknown'}s)`,
      videoUrl
    };
  }

  if (!metadata?.audio || metadata?.audio?.error) {
    return {
      valid: false,
      error: 'Composed video is missing a usable audio track',
      videoUrl
    };
  }

  const videoCodec = String(metadata?.video?.codec || '').toLowerCase();
  if (!videoCodec.includes('h264')) {
    return {
      valid: false,
      error: `Composed video codec is not H.264 (${metadata?.video?.codec || 'unknown'})`,
      videoUrl
    };
  }

  const audioCodec = String(metadata?.audio?.codec || '').toLowerCase();
  if (!audioCodec.includes('aac')) {
    return {
      valid: false,
      error: `Composed audio codec is not AAC (${metadata?.audio?.codec || 'unknown'})`,
      videoUrl
    };
  }

  // Strict Reel requirements (match the ffmpeg command target)
  const resolution = String(metadata?.video?.resolution || '').toLowerCase();
  if (!resolution || resolution !== '1080x1920') {
    return {
      valid: false,
      error: `Composed resolution must be 1080x1920 (got: ${metadata?.video?.resolution || 'unknown'})`,
      videoUrl
    };
  }

  const fps = typeof metadata?.video?.fps === 'number'
    ? metadata.video.fps
    : parseFloat(metadata?.video?.fps);
  if (!Number.isFinite(fps) || Math.abs(fps - 30) > 0.1) {
    return {
      valid: false,
      error: `Composed fps must be 30 (got: ${metadata?.video?.fps || 'unknown'})`,
      videoUrl
    };
  }

  const sampleRate = parseInt(metadata?.audio?.sampleRate, 10);
  if (!Number.isFinite(sampleRate) || sampleRate !== 44100) {
    return {
      valid: false,
      error: `Composed audio sample rate must be 44100 (got: ${metadata?.audio?.sampleRate || 'unknown'})`,
      videoUrl
    };
  }

  const channels = parseInt(metadata?.audio?.channels, 10);
  if (!Number.isFinite(channels) || channels !== 2) {
    return {
      valid: false,
      error: `Composed audio channels must be 2 (got: ${metadata?.audio?.channels || 'unknown'})`,
      videoUrl
    };
  }

  return {
    valid: true,
    error: '',
    videoUrl
  };
}

async function publishCampaignToSocial(campaign) {
  const { platforms, fullPost, mediaUrls } = buildCampaignPostPayload(campaign);
  const user = campaign?.userId ? await User.findById(campaign.userId) : null;
  const normalizedPlatforms = Array.isArray(platforms)
    ? platforms.map((platform) => String(platform || '').trim().toLowerCase()).filter(Boolean)
    : [];
  const profileKey = user?.ayrshare?.profileKey || undefined;

  if (hasInstagramAudioAttachment(campaign, normalizedPlatforms)) {
    const primaryImageUrl = getPrimaryCampaignImageUrl(campaign);
    const rawAudioUrl = campaign?.creative?.instagramAudio?.url || '';
    const requestedDurationSeconds = campaign?.creative?.instagramAudio?.durationSeconds || null;
    const otherPlatforms = normalizedPlatforms.filter((platform) => platform !== 'instagram');

    let instagramResult = {
      success: false,
      error: 'Instagram audio path did not run',
      data: null
    };
    let otherPlatformsResult = null;
    let composed = null;

    console.log('[Campaign Scheduler] Instagram composition input:', {
      campaignId: campaign?._id?.toString?.() || campaign?._id || null,
      imageUrl: primaryImageUrl || null,
      audioUrl: rawAudioUrl || null,
      requestedDurationSeconds: requestedDurationSeconds || null
    });

    if (!primaryImageUrl) {
      instagramResult = {
        success: false,
        skipped: true,
        error: 'Instagram audio composition failed: missing primary image URL',
        data: null
      };
      console.error('[Campaign Scheduler] Instagram audio composition failed: missing primary image URL');
      // Continue to other platforms if any exist
    } else {
      let publicAudioUrl = null;
      try {
        publicAudioUrl = await ensurePublicAudioUrl(rawAudioUrl);
      } catch (audioUrlError) {
        console.error('[Campaign Scheduler] Failed to normalize audio URL:', audioUrlError);
      }

      if (!publicAudioUrl) {
        instagramResult = {
          success: false,
          skipped: true,
          error: 'Instagram audio composition failed: invalid public audio URL',
          data: null
        };
        console.error('[Campaign Scheduler] Instagram audio composition failed: invalid public audio URL');
      } else {
        // Compose video safely
        console.log('[Campaign Scheduler] Composing Instagram Reel for scheduled audio campaign:', campaign?._id?.toString?.() || campaign?._id);
        try {
          composed = await composeImageToVideoWithAudio({
            imageUrl: primaryImageUrl,
            audioUrl: publicAudioUrl,
            requestedDurationSeconds
          });
          console.log('[Campaign Scheduler] Compose result:', summarizeComposedResult(composed));

          // Safety check: ensure we got a valid result object
          if (!composed || typeof composed !== 'object') {
            throw new Error('Compose function returned null or invalid result');
          }
        } catch (compositionError) {
          composed = null;
          console.error('[Campaign Scheduler] Video composition threw an error:', compositionError);
        }
      }
    }

    const compositionValidation = validateComposedInstagramVideo(composed);
    if (compositionValidation.valid) {
      try {
        console.log('[Campaign Scheduler] Final Instagram video URL sent to Ayrshare:', compositionValidation.videoUrl);
        console.log('[Campaign Scheduler] Cloudinary transformations applied:', hasCloudinaryTransformations(compositionValidation.videoUrl));
        console.log(`[Campaign Scheduler] Waiting ${INSTAGRAM_UPLOAD_SETTLE_DELAY_MS}ms before posting Instagram video`);
        await delay(INSTAGRAM_UPLOAD_SETTLE_DELAY_MS);

        instagramResult = await publishSocialPostWithSafetyWrapper({
          user,
          campaign,
          platforms: ['instagram'],
          content: fullPost,
          options: {
            mediaUrls: [compositionValidation.videoUrl],
            shortenLinks: true,
            profileKey,
            type: 'reel',
            isVideo: true,
            mediaType: 'video',
            instagramVideoPrepared: true
          },
          context: 'campaign_scheduler_instagram_audio'
        });
        console.log('[Campaign Scheduler] Instagram post result:', instagramResult);
      } catch (instagramPostError) {
        instagramResult = { success: false, error: String(instagramPostError), data: null };
        console.error('[Campaign Scheduler] Instagram post failed (audio path):', instagramPostError);
      }
    } else {
      instagramResult = {
        success: false,
        skipped: true,
        error: compositionValidation.error || 'Instagram audio composition failed or missing video URL',
        data: null
      };
      console.warn('[Campaign Scheduler] Skipping Instagram publish due to invalid composition output:', compositionValidation.error);
    }

    // Continue with other platforms regardless of Instagram result
    if (otherPlatforms.length > 0) {
      try {
        otherPlatformsResult = await publishSocialPostWithSafetyWrapper({
          user,
          campaign,
          platforms: otherPlatforms,
          content: fullPost,
          options: {
            mediaUrls: primaryImageUrl ? [primaryImageUrl] : mediaUrls,
            shortenLinks: true,
            profileKey
          },
          context: 'campaign_scheduler_other_platforms'
        });
        console.log('[Campaign Scheduler] Other platform post result:', otherPlatformsResult);
      } catch (otherPostError) {
        otherPlatformsResult = { success: false, error: String(otherPostError), data: null };
        console.error('[Campaign Scheduler] Other platforms post failed:', otherPostError);
      }
    }

    const otherPlatformsSucceeded = otherPlatforms.length === 0 || otherPlatformsResult?.success === true;
    const instagramSkipped = instagramResult?.skipped === true;
    const overallSuccess = otherPlatforms.length > 0
      ? otherPlatformsSucceeded && (instagramResult?.success === true || instagramSkipped)
      : instagramResult?.success === true;

    const postId = extractAyrsharePostId(instagramResult) || extractAyrsharePostId(otherPlatformsResult);
    const warning = instagramSkipped ? instagramResult?.error || 'Instagram was skipped.' : null;

    return {
      success: overallSuccess,
      error: overallSuccess
        ? (warning || '')
        : (instagramResult?.error || otherPlatformsResult?.error || 'Failed to publish scheduled campaign'),
      data: {
        instagram: instagramResult?.data || null,
        other: otherPlatformsResult?.data || null,
        instagramSkipped
      },
      postId,
      instagramFix: instagramResult?.instagramFix || otherPlatformsResult?.instagramFix || null
    };
  }

  const result = await publishSocialPostWithSafetyWrapper({
    user,
    campaign,
    platforms: normalizedPlatforms,
    content: fullPost,
    options: {
      mediaUrls,
      shortenLinks: true,
      profileKey
    },
    context: 'campaign_scheduler'
  });

  const postId = extractAyrsharePostId(result);
  return { ...result, postId };
}

module.exports = {
  buildCampaignPostPayload,
  publishCampaignToSocial,
};

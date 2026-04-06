function clamp01(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function normalizeHexColor(color) {
  const raw = String(color || '').trim();
  if (!raw) return '';
  const withHash = raw.startsWith('#') ? raw : `#${raw}`;
  const short = /^#([0-9a-fA-F]{3})$/.exec(withHash);
  if (short) {
    const triplet = short[1];
    return `#${triplet[0]}${triplet[0]}${triplet[1]}${triplet[1]}${triplet[2]}${triplet[2]}`.toUpperCase();
  }
  const full = /^#([0-9a-fA-F]{6})$/.exec(withHash);
  if (!full) return '';
  return `#${full[1].toUpperCase()}`;
}

function normalizeToneValue(value) {
  const t = String(value || '').trim().toLowerCase();
  if (!t) return '';
  if (['fun', 'playful', 'casual', 'humorous'].includes(t)) return 'fun';
  if (['professional', 'formal', 'corporate', 'serious'].includes(t)) return 'professional';
  if (['luxury', 'luxurious', 'premium', 'elegant'].includes(t)) return 'luxury';
  if (['minimal', 'simple'].includes(t)) return 'simple';
  if (['normal', 'balanced', 'neutral'].includes(t)) return 'normal';
  return t;
}

function toText(value) {
  return String(value || '').trim();
}

function normalizePastPost(post = {}) {
  return {
    source: ['uploaded', 'campaign_history'].includes(String(post.source || '')) ? post.source : 'uploaded',
    platform: String(post.platform || 'instagram').trim().toLowerCase() || 'instagram',
    caption: toText(post.caption),
    imageUrl: toText(post.imageUrl),
    cloudinaryPublicId: toText(post.cloudinaryPublicId),
    campaignId: post.campaignId || null,
    postedAt: post.postedAt || null
  };
}

function pickTopEntries(counter, max = 5) {
  return Object.entries(counter)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([value, count]) => ({ value, count }));
}

function extractHashtags(text = '') {
  const tags = String(text).match(/#[A-Za-z0-9_]+/g);
  return Array.isArray(tags) ? tags.map((t) => t.toLowerCase()) : [];
}

function detectWritingStyle(captions = []) {
  if (!captions.length) {
    return { value: 'formal', confidence: 0.35 };
  }

  const totalChars = captions.reduce((acc, c) => acc + c.length, 0);
  const avgChars = totalChars / captions.length;
  const avgLineBreaks =
    captions.reduce((acc, c) => acc + (String(c).match(/\n/g)?.length || 0), 0) / captions.length;
  const questionRatio =
    captions.filter((c) => String(c).includes('?')).length / captions.length;

  let value = 'formal';
  let confidence = 0.55;

  if (avgChars < 120 && avgLineBreaks <= 1.2) {
    value = 'short';
    confidence = 0.72;
  } else if (avgChars >= 220 || avgLineBreaks >= 3) {
    value = 'storytelling';
    confidence = 0.76;
  } else if (questionRatio > 0.4) {
    value = 'casual';
    confidence = 0.66;
  } else {
    value = 'formal';
    confidence = 0.64;
  }

  return { value, confidence };
}

function detectCtaStyle(captions = []) {
  if (!captions.length) {
    return { value: 'balanced', confidence: 0.35 };
  }

  const text = captions.join('\n').toLowerCase();
  const score = {
    direct: 0,
    soft: 0,
    community: 0,
    value_first: 0
  };

  ['buy now', 'shop now', 'book now', 'sign up', 'order now', 'get started'].forEach((k) => {
    if (text.includes(k)) score.direct += 2;
  });
  ['learn more', 'discover', 'read more', 'explore', 'see details'].forEach((k) => {
    if (text.includes(k)) score.soft += 2;
  });
  ['comment', 'dm us', 'tag a friend', 'share this', 'tell us'].forEach((k) => {
    if (text.includes(k)) score.community += 2;
  });
  ['tips', 'guide', 'how to', 'save this', 'insight'].forEach((k) => {
    if (text.includes(k)) score.value_first += 2;
  });

  const ranked = Object.entries(score).sort((a, b) => b[1] - a[1]);
  const winner = ranked[0]?.[0] || 'balanced';
  const winnerScore = ranked[0]?.[1] || 0;
  const runnerUp = ranked[1]?.[1] || 0;
  const confidence = clamp01(0.45 + (winnerScore - runnerUp) * 0.08 + Math.min(captions.length, 8) * 0.03);

  return {
    value: winnerScore > 0 ? winner : 'balanced',
    confidence
  };
}

function detectTone({
  brandDescription = '',
  captions = [],
  brandVoiceHint = ''
} = {}) {
  const corpus = `${brandDescription}\n${captions.join('\n')}\n${brandVoiceHint}`.toLowerCase();
  const score = {
    fun: 0,
    professional: 0,
    luxury: 0,
    normal: 0,
    simple: 0
  };

  const dictionary = {
    fun: ['fun', 'playful', 'excited', 'lol', 'haha', 'vibe', 'awesome', 'amazing', 'party'],
    professional: ['professional', 'strategy', 'business', 'analysis', 'executive', 'official', 'results'],
    luxury: ['luxury', 'premium', 'exclusive', 'elegant', 'sophisticated', 'high-end', 'elite'],
    normal: ['balanced', 'everyday', 'practical', 'clear', 'friendly'],
    simple: ['simple', 'minimal', 'clean', 'easy', 'straightforward', 'minimalist']
  };

  Object.entries(dictionary).forEach(([tone, keywords]) => {
    keywords.forEach((k) => {
      if (corpus.includes(k)) score[tone] += 2;
    });
  });

  const toneHint = normalizeToneValue(brandVoiceHint);
  if (toneHint && score[toneHint] !== undefined) {
    score[toneHint] += 4;
  }

  const ranked = Object.entries(score).sort((a, b) => b[1] - a[1]);
  const winner = ranked[0]?.[0] || 'professional';
  const winnerScore = ranked[0]?.[1] || 0;
  const runnerUp = ranked[1]?.[1] || 0;

  const sampleBoost = Math.min(captions.length, 10) * 0.025;
  const confidence = clamp01(0.45 + (winnerScore - runnerUp) * 0.06 + sampleBoost);
  return { value: winner, confidence };
}

function detectVisualStyle({
  primaryColor = '',
  secondaryColor = '',
  fontType = '',
  captions = []
} = {}) {
  const p = normalizeHexColor(primaryColor);
  const s = normalizeHexColor(secondaryColor);
  const font = String(fontType || '').toLowerCase();
  const textBlob = captions.join(' ').toLowerCase();

  let value = 'clean-minimal';
  let confidence = 0.5;

  if ((p === '#000000' || p === '#111111' || p === '#1A1A1A') && (s === '#D4AF37' || s === '#C9A227')) {
    value = 'premium-luxury';
    confidence = 0.82;
  } else if (font.includes('serif') || font.includes('playfair') || font.includes('garamond')) {
    value = 'premium-luxury';
    confidence = 0.73;
  } else if (
    ['#FF4D4F', '#FF6B6B', '#FFCC29', '#00C2FF', '#7C3AED'].includes(p) ||
    textBlob.includes('bold') ||
    textBlob.includes('vibrant')
  ) {
    value = 'vibrant-playful';
    confidence = 0.72;
  } else if (font.includes('mono') || font.includes('inter') || font.includes('sans')) {
    value = 'clean-minimal';
    confidence = 0.67;
  }

  return { value, confidence };
}

function computePatternSummary(pastPosts = []) {
  const posts = Array.isArray(pastPosts) ? pastPosts.map(normalizePastPost) : [];
  const captions = posts.map((p) => p.caption).filter(Boolean);

  const hashtagCounter = {};
  const openerCounter = {};
  const ctaExamples = [];
  let totalChars = 0;
  let totalLineBreaks = 0;

  captions.forEach((caption) => {
    const c = String(caption);
    totalChars += c.length;
    totalLineBreaks += c.match(/\n/g)?.length || 0;

    extractHashtags(c).forEach((tag) => {
      hashtagCounter[tag] = (hashtagCounter[tag] || 0) + 1;
    });

    const opener = c.split('\n')[0].split(' ').slice(0, 4).join(' ').trim().toLowerCase();
    if (opener) openerCounter[opener] = (openerCounter[opener] || 0) + 1;

    if (/(learn more|shop now|sign up|book now|comment|dm|read more|discover)/i.test(c)) {
      const line = c
        .split('\n')
        .find((l) => /(learn more|shop now|sign up|book now|comment|dm|read more|discover)/i.test(l));
      if (line) ctaExamples.push(line.trim());
    }
  });

  const avgCaptionLength = captions.length ? Math.round(totalChars / captions.length) : 0;
  const avgLineBreaks = captions.length ? Number((totalLineBreaks / captions.length).toFixed(2)) : 0;

  const formatSignals = [];
  if (captions.some((c) => /\n[-*•]\s/.test(c))) formatSignals.push('bullet-points');
  if (captions.some((c) => c.includes('?'))) formatSignals.push('question-hook');
  if (avgLineBreaks >= 2) formatSignals.push('multi-line');
  if (avgCaptionLength <= 120) formatSignals.push('short-form');
  if (avgCaptionLength >= 220) formatSignals.push('long-form');

  return {
    totals: {
      posts: posts.length,
      withCaption: captions.length,
      withImage: posts.filter((p) => p.imageUrl).length
    },
    captionMetrics: {
      avgCaptionLength,
      avgLineBreaks
    },
    topHashtags: pickTopEntries(hashtagCounter, 8),
    commonOpeners: pickTopEntries(openerCounter, 6),
    ctaExamples: Array.from(new Set(ctaExamples)).slice(0, 6),
    formatSignals
  };
}

function analyzeBrandInputs({
  brandName = '',
  brandDescription = '',
  primaryColor = '',
  secondaryColor = '',
  fontType = '',
  pastPosts = [],
  businessProfile = {}
} = {}) {
  const normalizedPosts = Array.isArray(pastPosts) ? pastPosts.map(normalizePastPost) : [];
  const captions = normalizedPosts.map((p) => p.caption).filter(Boolean);
  const voiceHint = Array.isArray(businessProfile?.brandVoice)
    ? businessProfile.brandVoice.join(' ')
    : String(businessProfile?.brandVoice || '');

  const tone = detectTone({ brandDescription, captions, brandVoiceHint: voiceHint });
  const writingStyle = detectWritingStyle(captions);
  const ctaStyle = detectCtaStyle(captions);
  const visualStyle = detectVisualStyle({ primaryColor, secondaryColor, fontType, captions });
  const patterns = computePatternSummary(normalizedPosts);

  const hasBrandAssets = Boolean(
    toText(brandName) ||
      toText(brandDescription) ||
      normalizeHexColor(primaryColor) ||
      normalizeHexColor(secondaryColor) ||
      toText(fontType)
  );
  const hasPastPosts = normalizedPosts.length > 0;

  const completenessParts = [
    toText(brandName) ? 1 : 0,
    toText(brandDescription) ? 1 : 0,
    normalizeHexColor(primaryColor) ? 1 : 0,
    normalizeHexColor(secondaryColor) ? 1 : 0,
    toText(fontType) ? 1 : 0,
    hasPastPosts ? 1 : 0
  ];
  const completeness = completenessParts.reduce((a, b) => a + b, 0) / completenessParts.length;

  const overall = clamp01(
    tone.confidence * 0.27 +
      writingStyle.confidence * 0.25 +
      ctaStyle.confidence * 0.2 +
      visualStyle.confidence * 0.2 +
      completeness * 0.08
  );

  return {
    detectedProfile: {
      tone: tone.value,
      writingStyle: writingStyle.value,
      ctaStyle: ctaStyle.value,
      visualStyle: visualStyle.value
    },
    confidence: {
      tone: clamp01(tone.confidence),
      writingStyle: clamp01(writingStyle.confidence),
      ctaStyle: clamp01(ctaStyle.confidence),
      visualStyle: clamp01(visualStyle.confidence),
      overall
    },
    patterns,
    flags: {
      hasBrandAssets,
      hasPastPosts
    }
  };
}

function getEffectiveProfile(profile = {}) {
  const detected = profile?.detectedProfile || {};
  const custom = profile?.customProfile || {};
  return {
    tone: normalizeToneValue(custom.tone) || normalizeToneValue(detected.tone) || 'professional',
    writingStyle: String(custom.writingStyle || detected.writingStyle || 'formal').toLowerCase(),
    ctaStyle: String(custom.ctaStyle || detected.ctaStyle || 'balanced').toLowerCase(),
    visualStyle: String(custom.visualStyle || detected.visualStyle || 'clean-minimal').toLowerCase()
  };
}

function buildGenerationGuidelines(profile = {}) {
  const effective = getEffectiveProfile(profile);
  const confidenceOverall = clamp01(profile?.confidence?.overall || 0.2);
  const patterns = profile?.patterns || {};
  const topHashtags = Array.isArray(patterns?.topHashtags)
    ? patterns.topHashtags.map((h) => h.value).filter(Boolean).slice(0, 5)
    : [];
  const commonOpeners = Array.isArray(patterns?.commonOpeners)
    ? patterns.commonOpeners.map((o) => o.value).filter(Boolean).slice(0, 4)
    : [];
  const formatSignals = Array.isArray(patterns?.formatSignals) ? patterns.formatSignals : [];
  const ctaExamples = Array.isArray(patterns?.ctaExamples) ? patterns.ctaExamples.slice(0, 3) : [];

  const hasBrandAssets = Boolean(profile?.hasBrandAssets);
  const hasPastPosts = Boolean(profile?.hasPastPosts);
  const mode = String(profile?.enforcementMode || 'strict');
  const strictMode = hasBrandAssets && mode !== 'off';

  let instructions = '';
  if (strictMode) {
    instructions += `\nBRAND ENFORCEMENT (STRICT): You MUST keep all output aligned to this brand profile.`;
  } else if (hasBrandAssets) {
    instructions += `\nBRAND ENFORCEMENT (ADAPTIVE): Follow the brand profile unless platform constraints require slight adaptation.`;
  } else {
    instructions += `\nBRAND ENFORCEMENT: No strong brand profile available. Use default best-practice style.`;
  }

  instructions += `\n- Effective Tone: ${effective.tone}`;
  instructions += `\n- Writing Style: ${effective.writingStyle}`;
  instructions += `\n- CTA Style: ${effective.ctaStyle}`;
  instructions += `\n- Visual Style: ${effective.visualStyle}`;
  instructions += `\n- Brand Match Confidence: ${Math.round(confidenceOverall * 100)}%`;

  if (profile?.assets?.primaryColor || profile?.assets?.secondaryColor || profile?.assets?.fontType) {
    instructions += `\n- Visual Tokens: primary=${profile.assets.primaryColor || 'not-set'}, secondary=${profile.assets.secondaryColor || 'not-set'}, font=${profile.assets.fontType || 'not-set'}`;
  }

  if (hasPastPosts) {
    instructions += `\nPAST POST PATTERNS (MIMIC THESE):`;
    if (commonOpeners.length) instructions += `\n- Common opening styles: ${commonOpeners.join(' | ')}`;
    if (formatSignals.length) instructions += `\n- Format signals: ${formatSignals.join(', ')}`;
    if (ctaExamples.length) instructions += `\n- CTA examples: ${ctaExamples.join(' | ')}`;
    if (topHashtags.length) instructions += `\n- Recurring hashtags: ${topHashtags.join(' ')}`;
  }

  return {
    strictMode,
    hasBrandAssets,
    hasPastPosts,
    effectiveProfile: effective,
    confidenceOverall,
    instructions
  };
}

module.exports = {
  normalizeHexColor,
  normalizeToneValue,
  normalizePastPost,
  analyzeBrandInputs,
  getEffectiveProfile,
  buildGenerationGuidelines
};

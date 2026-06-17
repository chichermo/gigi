/**
 * Análisis visual local — outfit, cabello y maquillaje (sin APIs externas).
 */
const ImageAnalysis = (() => {
  const NEUTRAL = new Set(['black', 'white', 'gray', 'beige']);
  const MIN_COLOR_SHARE = 0.12;

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        default: h = ((r - g) / d + 4) / 6;
      }
    }
    return [h * 360, s, l];
  }

  function isSkinTone(r, g, b) {
    const [h, s, l] = rgbToHsl(r, g, b);
    if (l < 0.18 || l > 0.93) return false;
    return h <= 55 && s >= 0.08 && s <= 0.72 && l >= 0.22 && l <= 0.88;
  }

  function classifyColor(r, g, b) {
    const [h, s, l] = rgbToHsl(r, g, b);
    if (l < 0.1) return 'black';
    if (l > 0.9 && s < 0.12) return 'white';
    if (s < 0.1) return 'gray';
    if (l > 0.72 && s < 0.22) return 'beige';
    if (h < 15 || h >= 345) return s > 0.35 ? 'red' : 'pink';
    if (h < 42) return 'orange';
    if (h < 68) return s > 0.25 ? 'yellow' : 'beige';
    if (h < 165) return 'green';
    if (h < 200) return 'teal';
    if (h < 250) return 'blue';
    if (h < 295) return 'purple';
    if (h < 345) return s > 0.28 ? 'pink' : 'purple';
    return 'gray';
  }

  function sampleRegion(pixels, w, h, roi, options = {}) {
    const { skipSkin = false, skipLowSat = false, step = 3 } = options;
    const colorCounts = {};
    let sampled = 0;
    let satSum = 0;
    let lightSum = 0;
    let pinkRed = 0;

    const x0 = Math.floor(w * roi.x);
    const y0 = Math.floor(h * roi.y);
    const x1 = Math.floor(w * (roi.x + roi.w));
    const y1 = Math.floor(h * (roi.y + roi.h));

    for (let y = y0; y < y1; y += step) {
      for (let x = x0; x < x1; x += step) {
        const i = (y * w + x) * 4;
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
        const [hue, s, l] = rgbToHsl(r, g, b);

        if (skipSkin && isSkinTone(r, g, b)) continue;
        if (skipLowSat && s < 0.14 && l > 0.15 && l < 0.85) continue;

        const color = classifyColor(r, g, b);
        colorCounts[color] = (colorCounts[color] || 0) + 1;
        sampled++;
        satSum += s;
        lightSum += l;
        if ((hue < 20 || hue > 340) && s > 0.28) pinkRed++;
      }
    }

    const shares = Object.entries(colorCounts)
      .map(([color, count]) => ({ color, share: count / Math.max(sampled, 1) }))
      .sort((a, b) => b.share - a.share);

    return {
      sampled,
      shares,
      avgSat: sampled ? satSum / sampled : 0,
      avgLight: sampled ? lightSum / sampled : 0,
      pinkRedShare: sampled ? pinkRed / sampled : 0,
      dominant: shares[0]?.color || null,
    };
  }

  function analyzeOutfit(pixels, w, h) {
    const region = sampleRegion(pixels, w, h, { x: 0.22, y: 0.32, w: 0.56, h: 0.42 }, {
      skipSkin: true,
      skipLowSat: true,
    });

    const outfitColors = region.shares.filter(
      (c) => !NEUTRAL.has(c.color) && c.share >= MIN_COLOR_SHARE
    );

    const neutralDominant = region.shares.filter((c) => NEUTRAL.has(c.color));
    const hasNeutralLook = neutralDominant.length > 0
      && neutralDominant[0].share > 0.35
      && outfitColors.length === 0;

    let dominantColors;
    let confidence = 'low';

    if (outfitColors.length >= 1 && outfitColors[0].share >= 0.15) {
      dominantColors = outfitColors.map((c) => c.color).slice(0, 2);
      confidence = outfitColors[0].share >= 0.22 ? 'high' : 'medium';
    } else if (hasNeutralLook) {
      dominantColors = [neutralDominant[0].color];
      confidence = 'medium';
    } else if (region.shares.length > 0) {
      dominantColors = [region.shares[0].color];
      confidence = 'low';
    } else {
      dominantColors = [];
    }

    return {
      dominantColors,
      colorShares: Object.fromEntries(region.shares.map((c) => [c.color, c.share])),
      confidence,
      hasNeutralLook,
      sampled: region.sampled,
    };
  }

  function analyzeHair(pixels, w, h) {
    const region = sampleRegion(pixels, w, h, { x: 0.2, y: 0.04, w: 0.6, h: 0.22 }, {
      skipSkin: true,
      step: 2,
    });

    if (region.sampled < 25) {
      return { tone: 'unknown', confidence: 'low', sampled: region.sampled };
    }

    const { avgLight, avgSat, dominant } = region;
    let tone = 'brown';
    let confidence = 'medium';

    if (avgLight < 0.28 || dominant === 'black') {
      tone = 'dark';
    } else if (avgLight > 0.58 && (dominant === 'yellow' || dominant === 'beige' || dominant === 'orange')) {
      tone = 'light';
    } else if (dominant === 'gray' || avgSat < 0.12) {
      tone = 'gray';
    } else if (avgSat > 0.32 && avgLight < 0.5) {
      tone = 'warm';
    } else if (dominant === 'brown' || avgLight < 0.48) {
      tone = 'brown';
    }

    if (region.sampled < 50) confidence = 'low';

    return { tone, confidence, sampled: region.sampled, dominant };
  }

  function analyzeMakeup(pixels, w, h) {
    const region = sampleRegion(pixels, w, h, { x: 0.28, y: 0.18, w: 0.44, h: 0.24 }, {
      skipSkin: false,
      step: 2,
    });

    if (region.sampled < 30) {
      return { level: 'unknown', confidence: 'low', sampled: region.sampled };
    }

    const { avgSat, pinkRedShare } = region;
    let level = 'natural';
    let confidence = 'medium';

    if (pinkRedShare > 0.18 || avgSat > 0.42) {
      level = 'bold';
    } else if (pinkRedShare > 0.08 || avgSat > 0.28) {
      level = 'light';
    } else {
      level = 'natural';
    }

    if (region.sampled < 55) confidence = 'low';

    return {
      level,
      confidence,
      sampled: region.sampled,
      accent: region.dominant === 'red' || region.dominant === 'pink' ? region.dominant : null,
    };
  }

  function computeBrightness(pixels, w, h, roiX, roiY, roiW, roiH) {
    let total = 0; let count = 0;
    for (let y = roiY; y < roiY + roiH; y += 4) {
      for (let x = roiX; x < roiX + roiW; x += 4) {
        const i = (y * w + x) * 4;
        total += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
        count++;
      }
    }
    return count > 0 ? total / count : 0;
  }

  function analyzeFrame(video, canvas) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const w = Math.min(video.videoWidth, 400);
    const h = Math.min(video.videoHeight, 300);
    canvas.width = w;
    canvas.height = h;

    ctx.drawImage(video, 0, 0, w, h);
    const pixels = ctx.getImageData(0, 0, w, h).data;

    const outfit = analyzeOutfit(pixels, w, h);
    const hair = analyzeHair(pixels, w, h);
    const makeup = analyzeMakeup(pixels, w, h);

    const roiX = Math.floor(w * 0.22);
    const roiY = Math.floor(h * 0.32);
    const roiW = Math.floor(w * 0.56);
    const roiH = Math.floor(h * 0.42);
    const brightness = computeBrightness(pixels, w, h, roiX, roiY, roiW, roiH);

    return {
      ...outfit,
      hair,
      makeup,
      brightness,
      isWellLit: brightness > 75,
    };
  }

  return { analyzeFrame };
})();

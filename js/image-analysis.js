/**
 * Análisis de colores del outfit desde la cámara (sin APIs externas).
 * Muestrea la zona central (torso) y excluye piel/fondo neutro.
 */
const ImageAnalysis = (() => {
  const NEUTRAL = new Set(['black', 'white', 'gray', 'beige']);
  const MIN_COLOR_SHARE = 0.12;
  const MIN_SECONDARY_SHARE = 0.18;

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

  function analyzeFrame(video, canvas) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const w = Math.min(video.videoWidth, 400);
    const h = Math.min(video.videoHeight, 300);
    canvas.width = w;
    canvas.height = h;

    ctx.drawImage(video, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const pixels = imageData.data;

    const roiX = Math.floor(w * 0.22);
    const roiY = Math.floor(h * 0.32);
    const roiW = Math.floor(w * 0.56);
    const roiH = Math.floor(h * 0.42);

    const colorCounts = {};
    let sampled = 0;

    for (let y = roiY; y < roiY + roiH; y += 3) {
      for (let x = roiX; x < roiX + roiW; x += 3) {
        const i = (y * w + x) * 4;
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];

        if (isSkinTone(r, g, b)) continue;

        const [_, s, l] = rgbToHsl(r, g, b);
        if (s < 0.14 && l > 0.15 && l < 0.85) continue;

        const color = classifyColor(r, g, b);
        colorCounts[color] = (colorCounts[color] || 0) + 1;
        sampled++;
      }
    }

    const shares = Object.entries(colorCounts)
      .map(([color, count]) => ({ color, share: count / Math.max(sampled, 1) }))
      .sort((a, b) => b.share - a.share);

    const outfitColors = shares.filter(
      (c) => !NEUTRAL.has(c.color) && c.share >= MIN_COLOR_SHARE
    );

    const neutralDominant = shares.filter((c) => NEUTRAL.has(c.color));
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
    } else if (shares.length > 0) {
      dominantColors = [shares[0].color];
      confidence = 'low';
    } else {
      dominantColors = [];
      confidence = 'low';
    }

    const brightness = computeBrightness(pixels, w, h, roiX, roiY, roiW, roiH);

    return {
      dominantColors,
      colorShares: Object.fromEntries(shares.map((c) => [c.color, c.share])),
      confidence,
      hasNeutralLook,
      brightness,
      isWellLit: brightness > 75,
      sampled,
    };
  }

  function computeBrightness(pixels, w, h, roiX, roiY, roiW, roiH) {
    let total = 0, count = 0;
    for (let y = roiY; y < roiY + roiH; y += 4) {
      for (let x = roiX; x < roiX + roiW; x += 4) {
        const i = (y * w + x) * 4;
        total += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
        count++;
      }
    }
    return count > 0 ? total / count : 0;
  }

  return { analyzeFrame };
})();

/**
 * Public compose layout preset: authoring JSON to validated layout geometry.
 * Native recording size, fps, and codec stay fixed this round.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_LAYOUT_PATH = fileURLToPath(
  new URL('./presets/prime-393x852.json', import.meta.url),
);

const LAYOUT_SCHEMA_VERSION = 1;
const STILL_OVERSAMPLE = 2;
const NATIVE_LOGICAL = { width: 393, height: 852, scale: 3 };
// simctl H.264 rounds the odd 1179px screen width down to an even width.
const EXPECTED_RAW = { width: 1178, height: 2556 };
const STROKE_COLOR = { r: 0, g: 0, b: 0 };

function configError(message) {
  const error = new Error(message);
  error.code = 'LAYOUT_CONFIG';
  return error;
}

function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw configError(`${label} must be an object`);
  }
  return value;
}

function requireFinite(value, label, { min, max } = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw configError(
      `${label} must be a finite number, got ${JSON.stringify(value)}`,
    );
  }
  if (min !== undefined && value < min) {
    throw configError(`${label} must be >= ${min}, got ${value}`);
  }
  if (max !== undefined && value > max) {
    throw configError(`${label} must be <= ${max}, got ${value}`);
  }
  return value;
}

function requireInteger(value, label, bounds) {
  const n = requireFinite(value, label, bounds);
  if (!Number.isInteger(n)) {
    throw configError(`${label} must be an integer, got ${value}`);
  }
  return n;
}

function requireEvenOutput(value, label) {
  if (!Number.isInteger(value) || value < 2 || value % 2 !== 0) {
    throw configError(`${label} must be an even integer >= 2, got ${value}`);
  }
  return value;
}

function parseHexColor(value, label) {
  if (
    typeof value !== 'string' ||
    !/^#[0-9A-Fa-f]{3}$|^#[0-9A-Fa-f]{6}$/.test(value)
  ) {
    throw configError(
      `${label} must be a 3- or 6-digit hex color, got ${JSON.stringify(value)}`,
    );
  }
  let hex = value.slice(1);
  if (hex.length === 3) {
    hex = `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
  }
  return {
    hex: `#${hex.toUpperCase()}`,
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function validateLayoutConfig(raw) {
  requireObject(raw, 'layout');
  const schemaVersion = requireInteger(raw.schemaVersion, 'schemaVersion', {
    min: 1,
  });
  if (schemaVersion !== LAYOUT_SCHEMA_VERSION) {
    throw configError(
      `schemaVersion must be ${LAYOUT_SCHEMA_VERSION}, got ${schemaVersion}`,
    );
  }
  const outputScale = requireInteger(raw.outputScale, 'outputScale', {
    min: 1,
  });
  const canvasIn = requireObject(raw.canvas, 'canvas');
  const canvas = {
    width: requireInteger(canvasIn.width, 'canvas.width', { min: 2 }),
    height: requireInteger(canvasIn.height, 'canvas.height', { min: 2 }),
  };
  const phoneIn = requireObject(raw.phone, 'phone');
  const strokeIn = requireObject(phoneIn.outerStroke, 'phone.outerStroke');
  const phone = {
    x: requireInteger(phoneIn.x, 'phone.x'),
    y: requireInteger(phoneIn.y, 'phone.y'),
    width: requireInteger(phoneIn.width, 'phone.width', { min: 1 }),
    bezel: requireInteger(phoneIn.bezel, 'phone.bezel', { min: 0 }),
    radius: requireInteger(phoneIn.radius, 'phone.radius', { min: 1 }),
    outerStroke: {
      width: requireInteger(strokeIn.width, 'phone.outerStroke.width', {
        min: 1,
      }),
      opacity: requireFinite(strokeIn.opacity, 'phone.outerStroke.opacity', {
        min: 0,
        max: 1,
      }),
    },
  };
  const gradientIn = requireObject(raw.gradient, 'gradient');
  const top = parseHexColor(gradientIn.top, 'gradient.top');
  const bottom = parseHexColor(gradientIn.bottom, 'gradient.bottom');

  const screenWidth = phone.width - phone.bezel * 2;
  const screenRadius = phone.radius - phone.bezel;
  if (screenWidth < 1) {
    throw configError(
      `derived screen width must be >= 1, got ${screenWidth} (phone.width - 2*bezel)`,
    );
  }
  if (screenRadius < 1) {
    throw configError(
      `derived screen radius must be >= 1, got ${screenRadius} (phone.radius - bezel)`,
    );
  }

  const screenX = phone.x + phone.bezel;
  const screenY = phone.y + phone.bezel;
  const apertureH = canvas.height - screenY;
  if (screenX < 0 || screenY < 0) {
    throw configError(
      `derived screen origin must be >= 0, got ${screenX},${screenY}`,
    );
  }
  if (screenX + screenWidth > canvas.width) {
    throw configError(
      `derived screen ${screenX}+${screenWidth} exceeds canvas.width ${canvas.width}`,
    );
  }
  if (apertureH < 1) {
    throw configError(
      `derived visible screen height must be >= 1, got ${apertureH} (canvas.height - phone.y - bezel)`,
    );
  }
  const displayHeight = Math.round(
    (screenWidth * NATIVE_LOGICAL.height) / NATIVE_LOGICAL.width,
  );
  if (apertureH > displayHeight) {
    throw configError(
      `visible screen height ${apertureH} exceeds full device display height ${displayHeight}; increase phone.width or phone.y`,
    );
  }

  const strokeThickness = phone.outerStroke.width;
  const canvasW = canvas.width * outputScale;
  const canvasH = canvas.height * outputScale;
  const displayW = screenWidth * outputScale;
  const visibleApertureH = apertureH * outputScale;
  requireEvenOutput(
    canvasW,
    'output canvas width (canvas.width * outputScale)',
  );
  requireEvenOutput(
    canvasH,
    'output canvas height (canvas.height * outputScale)',
  );
  requireEvenOutput(
    displayW,
    'output screen width (derived screen * outputScale)',
  );
  requireEvenOutput(
    visibleApertureH,
    'output visible screen height (aperture * outputScale)',
  );

  return {
    outputScale,
    design: {
      canvas,
      body: {
        x: phone.x,
        y: phone.y,
        width: phone.width,
        bezel: phone.bezel,
        radius: phone.radius,
      },
      screen: {
        width: screenWidth,
        radius: screenRadius,
      },
      outerStroke: {
        x: phone.x - strokeThickness,
        y: phone.y - strokeThickness,
        width: phone.width + strokeThickness * 2,
        thickness: strokeThickness,
        radius: phone.radius + strokeThickness,
        opacity: phone.outerStroke.opacity,
        color: { ...STROKE_COLOR },
      },
    },
    nativeLogical: { ...NATIVE_LOGICAL },
    expectedRaw: { ...EXPECTED_RAW },
    gradient: {
      direction: 'vertical',
      topHex: top.hex,
      bottomHex: bottom.hex,
      top: { r: top.r, g: top.g, b: top.b },
      bottom: { r: bottom.r, g: bottom.g, b: bottom.b },
    },
    stillOversample: STILL_OVERSAMPLE,
  };
}

export function loadLayoutConfig(filePath) {
  if (typeof filePath !== 'string' || !filePath) {
    throw configError('layout file path must be a non-empty string');
  }
  const resolved = path.resolve(filePath);
  let stat;
  try {
    stat = fs.statSync(resolved);
  } catch {
    throw configError(`layout file not found: ${resolved}`);
  }
  if (!stat.isFile()) {
    throw configError(`layout file not found: ${resolved}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  } catch (error) {
    if (error && error.code === 'LAYOUT_CONFIG') throw error;
    throw configError(
      `layout is not valid JSON: ${error instanceof Error ? error.message : error}`,
    );
  }
  return validateLayoutConfig(parsed);
}

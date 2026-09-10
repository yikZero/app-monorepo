/**
 * Tap-guide config, marker timing, and logical→source mapping for compose.mjs.
 * Overlay sprites are drawn in native recording pixels before scale/pan/mask.
 */

import fs from 'node:fs';

export const DEFAULT_TAP_STYLE = {
  radius: 14,
  color: '#FFFFFF',
  opacity: 0.46,
  ringColor: '#A8B3AE',
  ringOpacity: 0.28,
};

export const DEFAULT_TAP_DURATION = 0.85;

export const TAP_ANIM = {
  fadeInSec: 0.07,
  pressEndSec: 0.18,
  shrink: 0.08,
  ringStartSec: 0.1,
  ringGrow: 1.15,
  fadeOutSec: 0.24,
};

export const NATIVE_LOGICAL = { width: 393, height: 852 };

function configError(message) {
  const error = new Error(message);
  error.code = 'TAP_CONFIG';
  return error;
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

function optionalBoolean(value, label, defaultValue) {
  if (value === undefined) return defaultValue;
  if (typeof value !== 'boolean') {
    throw configError(
      `${label} must be a boolean, got ${JSON.stringify(value)}`,
    );
  }
  return value;
}

export function parseHexColor(value, label) {
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

function parseStyle(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const radius = requireFinite(
    src.radius === undefined ? DEFAULT_TAP_STYLE.radius : src.radius,
    'style.radius',
    { min: Number.MIN_VALUE },
  );
  const opacity = requireFinite(
    src.opacity === undefined ? DEFAULT_TAP_STYLE.opacity : src.opacity,
    'style.opacity',
    { min: 0, max: 1 },
  );
  const ringOpacity = requireFinite(
    src.ringOpacity === undefined
      ? DEFAULT_TAP_STYLE.ringOpacity
      : src.ringOpacity,
    'style.ringOpacity',
    { min: 0, max: 1 },
  );
  const fill = parseHexColor(
    src.color ?? DEFAULT_TAP_STYLE.color,
    'style.color',
  );
  const ring = parseHexColor(
    src.ringColor ?? DEFAULT_TAP_STYLE.ringColor,
    'style.ringColor',
  );
  return {
    radius,
    opacity,
    ringOpacity,
    color: fill.hex,
    ringColor: ring.hex,
    fill,
    ring,
  };
}

export function logicalToSourcePoint(
  x,
  y,
  srcW,
  srcH,
  logicalW = NATIVE_LOGICAL.width,
  logicalH = NATIVE_LOGICAL.height,
) {
  return {
    x: (x * srcW) / logicalW,
    y: (y * srcH) / logicalH,
  };
}

export function logicalRadiusToSource(
  radius,
  srcW,
  logicalW = NATIVE_LOGICAL.width,
) {
  return (radius * srcW) / logicalW;
}

export function sourceYToDisplayY(sourceY, srcH, displayH) {
  return (sourceY * displayH) / srcH;
}

export function isSourceYVisible(sourceY, cropY, apertureH, srcH, displayH) {
  const displayY = sourceYToDisplayY(sourceY, srcH, displayH);
  return displayY >= cropY && displayY < cropY + apertureH;
}

export function markerOutputTime(marker, take, composeStart, offset) {
  const started = take?.host?.recordingStartedMs;
  if (typeof started !== 'number' || !Number.isFinite(started)) {
    throw configError('--take host.recordingStartedMs must be a finite number');
  }
  const received = marker.receivedAtMs;
  if (typeof received !== 'number' || !Number.isFinite(received)) {
    throw configError('marker.receivedAtMs must be a finite number');
  }
  return (received - started) / 1000 - composeStart + offset;
}

export function findSceneMarker(take, name) {
  const sceneKey = take.matchedSceneKey;
  if (typeof sceneKey !== 'string' || !sceneKey) {
    throw configError('--take is missing matchedSceneKey');
  }
  const matches = (take.markers || []).filter(
    (marker) => marker.name === name && marker.sceneKey === sceneKey,
  );
  if (matches.length === 0) {
    throw configError(
      `No marker "${name}" in scene ${JSON.stringify(sceneKey)}`,
    );
  }
  if (matches.length > 1) {
    throw configError(
      `Ambiguous marker "${name}" in scene ${JSON.stringify(sceneKey)} (${matches.length} matches)`,
    );
  }
  return matches[0];
}

export function takeRawHash(take) {
  if (typeof take.rawHash === 'string' && take.rawHash) return take.rawHash;
  if (typeof take.source?.rawHash === 'string' && take.source.rawHash) {
    return take.source.rawHash;
  }
  return null;
}

function pointFromMarker(marker) {
  const point = marker.extra?.point;
  if (!point || typeof point !== 'object') return null;
  if (
    typeof point.x !== 'number' ||
    typeof point.y !== 'number' ||
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y)
  ) {
    throw configError('marker.extra.point x/y must be finite numbers');
  }
  return { x: point.x, y: point.y };
}

export function validateTapsConfig(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw configError('--taps JSON must be an object');
  }
  const enabled = optionalBoolean(raw.enabled, 'enabled', true);
  if (raw.coordinateSpace !== undefined && raw.coordinateSpace !== 'device') {
    throw configError('--taps coordinateSpace must be "device"');
  }
  const style = parseStyle(raw.style);
  if (!Array.isArray(raw.events)) {
    throw configError('--taps events must be an array');
  }
  if (!enabled) {
    return {
      enabled: false,
      coordinateSpace: 'device',
      style,
      events: raw.events,
    };
  }
  const events = raw.events.map((event, index) => {
    if (!event || typeof event !== 'object') {
      throw configError(`events[${index}] must be an object`);
    }
    const id = event.id;
    if (typeof id !== 'string' || !id) {
      throw configError(`events[${index}].id must be a non-empty string`);
    }
    const eventEnabled = optionalBoolean(
      event.enabled,
      `events[${index}].enabled`,
      true,
    );
    const hasAt = Object.prototype.hasOwnProperty.call(event, 'at');
    const hasMarker = Object.prototype.hasOwnProperty.call(event, 'marker');
    if (eventEnabled && hasAt && hasMarker) {
      throw configError(`events[${index}] must not set both at and marker`);
    }
    if (eventEnabled && !hasAt && !hasMarker) {
      throw configError(`events[${index}] requires at or marker`);
    }
    let at;
    let marker;
    let offset = 0;
    if (hasAt) {
      at = requireFinite(event.at, `events[${index}].at`);
    }
    if (hasMarker) {
      if (typeof event.marker !== 'string' || !event.marker) {
        throw configError(`events[${index}].marker must be a non-empty string`);
      }
      marker = event.marker;
      if (event.offset !== undefined) {
        offset = requireFinite(event.offset, `events[${index}].offset`);
      }
    }
    const duration = requireFinite(
      event.duration === undefined ? DEFAULT_TAP_DURATION : event.duration,
      `events[${index}].duration`,
      { min: Number.MIN_VALUE },
    );
    let x;
    let y;
    const hasX = Object.prototype.hasOwnProperty.call(event, 'x');
    const hasY = Object.prototype.hasOwnProperty.call(event, 'y');
    if (hasX !== hasY) {
      throw configError(`events[${index}] must set both x and y, or neither`);
    }
    if (hasX) {
      x = requireFinite(event.x, `events[${index}].x`);
      y = requireFinite(event.y, `events[${index}].y`);
    }
    return {
      id,
      enabled: eventEnabled,
      at,
      marker,
      offset,
      duration,
      x,
      y,
      hasExplicitPoint: hasX,
    };
  });
  return {
    enabled,
    coordinateSpace: 'device',
    style,
    events,
  };
}

export function isTapOverlayActive(config) {
  if (!config || !config.enabled) return false;
  return (config.events || []).some((event) => event.enabled);
}

export function tapVisibleOnTimeline(event) {
  return event.at + event.duration > 0;
}

export function resolveTapPlan(config, context) {
  const {
    take = null,
    composeStart,
    srcW,
    srcH,
    inputSha256,
    logicalW = NATIVE_LOGICAL.width,
    logicalH = NATIVE_LOGICAL.height,
  } = context;
  if (!isTapOverlayActive(config)) {
    return {
      active: false,
      config,
      events: [],
      requestedEvents: config.events,
    };
  }

  const enabledEvents = config.events.filter((event) => event.enabled);
  const needsTake = enabledEvents.some((event) => event.marker);
  if (needsTake) {
    if (!take || typeof take !== 'object') {
      throw configError('--take is required when a tap event uses marker');
    }
    const hash = takeRawHash(take);
    if (!hash) {
      throw configError('--take is missing rawHash');
    }
    if (hash !== inputSha256) {
      throw configError('--take rawHash does not match --input');
    }
  }

  const radiusSrc = logicalRadiusToSource(config.style.radius, srcW, logicalW);
  const events = enabledEvents.map((event) => {
    let at = event.at;
    let markerRecord = null;
    if (event.marker) {
      markerRecord = findSceneMarker(take, event.marker);
      at = markerOutputTime(markerRecord, take, composeStart, event.offset);
    }
    let logicalX = event.x;
    let logicalY = event.y;
    let pointSource = 'explicit';
    if (!event.hasExplicitPoint) {
      const measured = markerRecord ? pointFromMarker(markerRecord) : null;
      if (!measured) {
        throw configError(
          `events id ${JSON.stringify(event.id)} needs x/y or marker.extra.point`,
        );
      }
      logicalX = measured.x;
      logicalY = measured.y;
      pointSource = 'marker.extra.point';
    }
    if (
      logicalX < 0 ||
      logicalX > logicalW ||
      logicalY < 0 ||
      logicalY > logicalH
    ) {
      throw configError(
        `events id ${JSON.stringify(event.id)} logical x/y must be within 0..${logicalW} / 0..${logicalH}, got ${logicalX},${logicalY}`,
      );
    }
    const source = logicalToSourcePoint(
      logicalX,
      logicalY,
      srcW,
      srcH,
      logicalW,
      logicalH,
    );
    return {
      id: event.id,
      at,
      duration: event.duration,
      logicalX,
      logicalY,
      sourceX: source.x,
      sourceY: source.y,
      radiusSrc,
      pointSource,
      marker: event.marker || null,
      offset: event.offset,
    };
  });
  const visible = events.filter((event) => tapVisibleOnTimeline(event));

  return {
    active: visible.length > 0,
    config,
    events: visible,
    requestedEvents: config.events,
    radiusSrc,
  };
}

export function tapSpriteSize(radiusSrc) {
  const feather = Math.max(1.35, radiusSrc * 0.16);
  const maxR =
    radiusSrc * (1 + TAP_ANIM.ringGrow) +
    feather +
    Math.max(2, radiusSrc * 0.16) +
    3;
  const size = Math.ceil(maxR * 2 + 4);
  return size % 2 === 0 ? size : size + 1;
}

function fmtNum(n) {
  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * 1e6) / 1e6);
}

function hermiteClip(inner) {
  const c = `clip(${inner}\\,0\\,1)`;
  return `((${c})*(${c})*(3-2*(${c})))`;
}

export function tapSpriteGeq({ radiusSrc, duration, fill, ring, size }) {
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const r0 = radiusSrc;
  const feather = Math.max(1.15, r0 * 0.14);
  const ringHalf = Math.max(1.35, r0 * 0.16);
  const fadeOutStart = Math.max(0, duration - TAP_ANIM.fadeOutSec);
  const fadeOutDen = Math.max(duration - fadeOutStart, 0.001);
  const ringDen = Math.max(duration - TAP_ANIM.ringStartSec, 0.001);
  const appear = hermiteClip(`T/${fmtNum(TAP_ANIM.fadeInSec)}`);
  const fadeOut = hermiteClip(
    `(T-${fmtNum(fadeOutStart)})/${fmtNum(fadeOutDen)}`,
  );
  const env = `((${appear})*(1-(${fadeOut})))`;
  const press = hermiteClip(`T/${fmtNum(TAP_ANIM.pressEndSec)}`);
  const coreR = `(${fmtNum(r0)}*(1-${fmtNum(TAP_ANIM.shrink)}*(${press})))`;
  const ringU = `clip((T-${fmtNum(TAP_ANIM.ringStartSec)})/${fmtNum(ringDen)}\\,0\\,1)`;
  const ringEase = `(1-(1-(${ringU}))*(1-(${ringU})))`;
  const ringR = `((${coreR})+${fmtNum(r0 * TAP_ANIM.ringGrow)}*(${ringEase}))`;
  const fillA0 = `(${fmtNum(fill.opacity)}*(${env})*(1-0.45*(${ringEase})))`;
  const ringA0 = `(${fmtNum(ring.opacity)}*(${env})*(1-(${ringEase})))`;
  const rd = `hypot(X-${fmtNum(cx)}\\,Y-${fmtNum(cy)})`;
  const fillLin = `clip((${coreR}-(${rd}))/${fmtNum(feather)}+0.5\\,0\\,1)`;
  const fillCov = `((${fillLin})*(${fillLin})*(3-2*(${fillLin})))`;
  const ringLin = `clip(1-abs((${rd})-(${ringR}))/${fmtNum(ringHalf)}\\,0\\,1)`;
  const ringCov = `((${ringLin})*(${ringLin})*(3-2*(${ringLin})))`;
  const fA = `((${fillA0})*(${fillCov}))`;
  const rA = `((${ringA0})*(${ringCov}))`;
  const outA = `((${fA})+(${rA})*(1-(${fA})))`;
  const den = `max(${outA}\\,0.001)`;
  const a = `clip(${outA}\\,0\\,1)*255`;
  const r = `(${fill.r}*(${fA})+${ring.r}*(${rA})*(1-(${fA})))/(${den})`;
  const g = `(${fill.g}*(${fA})+${ring.g}*(${rA})*(1-(${fA})))/(${den})`;
  const b = `(${fill.b}*(${fA})+${ring.b}*(${rA})*(1-(${fA})))/(${den})`;
  return `geq=r=${r}:g=${g}:b=${b}:a=${a}`;
}

export function loadTapsConfig(filePath) {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    if (error && error.code === 'TAP_CONFIG') throw error;
    throw configError(
      `--taps is not valid JSON: ${error instanceof Error ? error.message : error}`,
    );
  }
  return validateTapsConfig(parsed);
}

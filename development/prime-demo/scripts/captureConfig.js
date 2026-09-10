const fs = require('fs');

const { canonicalCaptureStep, parseCaptureSteps } = require('./captureSteps');

const ACCEPTED_INTERACTION = 'risk-checkbox';
const DEFAULT_START_OFFSET_SECONDS = -0.1;
const DEFAULT_WAIT_AFTER_ANIMATIONS_MS = 2200;
const DEFAULT_WAIT_AFTER_READY_MS = DEFAULT_WAIT_AFTER_ANIMATIONS_MS;
const DEFAULT_INTERACTION_END_CUSHION_SECONDS = 0.5;
const DEFAULT_END_CUSHION_SECONDS = 0.2;
const DEFAULT_READY_MARKER = 'animationsComplete';
const LEGACY_REQUIRED_MARKERS = [
  'sheetVisible',
  'cardMounted',
  'laserComplete',
  'shimmerComplete',
];
const CAPTURE_CONFIG_KEYS = new Set([
  'interaction',
  'readyMarker',
  'requiredMarkers',
  'waitAfterReadyMs',
  'waitAfterAnimationsMs',
  'startOffsetSeconds',
  'endCushionSeconds',
  'startMarker',
  'endMarker',
  'steps',
]);

function requireFinite(name, value, { min } = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(
      `${name} must be a finite number, got ${JSON.stringify(value)}`,
    );
  }
  if (min !== undefined && value < min) {
    throw new Error(`${name} must be >= ${min}, got ${value}`);
  }
  return value;
}

function normalizeInteraction(value, label) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (value !== ACCEPTED_INTERACTION) {
    throw new Error(
      `${label} must be ${ACCEPTED_INTERACTION} (omit for none), got ${JSON.stringify(
        value,
      )}`,
    );
  }
  return value;
}

function requireMarkerName(value, label) {
  if (typeof value !== 'string' || !value) {
    throw new Error(`${label} must be a nonempty string`);
  }
  return value;
}

function parseRequiredMarkers(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array of nonempty strings`);
  }
  return value.map((item, index) =>
    requireMarkerName(item, `${label}[${index}]`),
  );
}

function parseCaptureConfigObject(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('capture config must be a JSON object');
  }
  const unknown = Object.keys(raw).filter(
    (key) => !CAPTURE_CONFIG_KEYS.has(key),
  );
  if (unknown.length) {
    throw new Error(`capture config unknown keys: ${unknown.join(', ')}`);
  }
  const config = {};
  if (Object.hasOwn(raw, 'interaction')) {
    config.interaction = normalizeInteraction(raw.interaction, 'interaction');
  }
  if (Object.hasOwn(raw, 'readyMarker')) {
    config.readyMarker = requireMarkerName(raw.readyMarker, 'readyMarker');
  }
  if (Object.hasOwn(raw, 'requiredMarkers')) {
    config.requiredMarkers = parseRequiredMarkers(
      raw.requiredMarkers,
      'requiredMarkers',
    );
  }
  if (Object.hasOwn(raw, 'waitAfterReadyMs')) {
    config.waitAfterReadyMs = requireFinite(
      'waitAfterReadyMs',
      raw.waitAfterReadyMs,
      { min: 0 },
    );
  }
  if (Object.hasOwn(raw, 'waitAfterAnimationsMs')) {
    config.waitAfterAnimationsMs = requireFinite(
      'waitAfterAnimationsMs',
      raw.waitAfterAnimationsMs,
      { min: 0 },
    );
  }
  if (Object.hasOwn(raw, 'startOffsetSeconds')) {
    config.startOffsetSeconds = requireFinite(
      'startOffsetSeconds',
      raw.startOffsetSeconds,
    );
  }
  if (Object.hasOwn(raw, 'endCushionSeconds')) {
    config.endCushionSeconds = requireFinite(
      'endCushionSeconds',
      raw.endCushionSeconds,
      { min: 0 },
    );
  }
  if (Object.hasOwn(raw, 'startMarker')) {
    config.startMarker =
      raw.startMarker === undefined || raw.startMarker === null
        ? null
        : requireMarkerName(raw.startMarker, 'startMarker');
  }
  if (Object.hasOwn(raw, 'endMarker')) {
    config.endMarker =
      raw.endMarker === undefined || raw.endMarker === null
        ? null
        : requireMarkerName(raw.endMarker, 'endMarker');
  }
  if (Object.hasOwn(raw, 'steps')) {
    if (raw.steps === undefined || raw.steps === null) {
      config.steps = null;
    } else {
      config.steps = parseCaptureSteps(raw.steps).map(canonicalCaptureStep);
    }
  }
  if (config.steps && config.interaction) {
    throw new Error('capture cannot set both steps and interaction');
  }
  return config;
}

function loadCaptureConfigFile(filePath) {
  if (!filePath) {
    return {};
  }
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(
      `--capture-config is not valid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error },
    );
  }
  return parseCaptureConfigObject(raw);
}

function resolveCaptureReadiness(fileConfig = {}) {
  if (
    fileConfig.waitAfterReadyMs !== undefined &&
    fileConfig.waitAfterAnimationsMs !== undefined
  ) {
    throw new Error(
      'capture cannot set both waitAfterReadyMs and waitAfterAnimationsMs',
    );
  }

  const readyMarker =
    fileConfig.readyMarker !== undefined
      ? fileConfig.readyMarker
      : DEFAULT_READY_MARKER;

  let requiredMarkers;
  if (fileConfig.requiredMarkers !== undefined) {
    requiredMarkers = [...fileConfig.requiredMarkers];
  } else if (fileConfig.readyMarker !== undefined) {
    requiredMarkers = [];
  } else {
    requiredMarkers = [...LEGACY_REQUIRED_MARKERS];
  }

  return { readyMarker, requiredMarkers };
}

function resolveCaptureTiming(cli = {}, fileConfig = {}) {
  const interaction =
    fileConfig.interaction !== undefined
      ? fileConfig.interaction
      : normalizeInteraction(cli.interaction, '--interaction');

  const { readyMarker, requiredMarkers } = resolveCaptureReadiness(fileConfig);

  let waitAfterReadyMs;
  if (fileConfig.waitAfterReadyMs !== undefined) {
    waitAfterReadyMs = fileConfig.waitAfterReadyMs;
  } else if (fileConfig.waitAfterAnimationsMs !== undefined) {
    waitAfterReadyMs = fileConfig.waitAfterAnimationsMs;
  } else if (interaction === ACCEPTED_INTERACTION) {
    waitAfterReadyMs = DEFAULT_WAIT_AFTER_READY_MS;
  } else {
    waitAfterReadyMs = 0;
  }

  const startOffsetSeconds =
    fileConfig.startOffsetSeconds !== undefined
      ? fileConfig.startOffsetSeconds
      : DEFAULT_START_OFFSET_SECONDS;

  let endCushionSeconds;
  if (fileConfig.endCushionSeconds !== undefined) {
    endCushionSeconds = fileConfig.endCushionSeconds;
  } else if (interaction === ACCEPTED_INTERACTION) {
    endCushionSeconds = DEFAULT_INTERACTION_END_CUSHION_SECONDS;
  } else {
    endCushionSeconds = DEFAULT_END_CUSHION_SECONDS;
  }

  const startMarker =
    fileConfig.startMarker !== undefined ? fileConfig.startMarker : null;
  const endMarker =
    fileConfig.endMarker !== undefined ? fileConfig.endMarker : null;
  const steps = fileConfig.steps !== undefined ? fileConfig.steps : null;

  if (steps && interaction) {
    throw new Error('capture cannot set both steps and interaction');
  }

  return {
    interaction,
    readyMarker,
    requiredMarkers,
    waitAfterReadyMs,
    waitAfterAnimationsMs: waitAfterReadyMs,
    startOffsetSeconds,
    endCushionSeconds,
    startMarker,
    endMarker,
    steps,
    leadInSec: startOffsetSeconds < 0 ? -startOffsetSeconds : 0,
  };
}

function hasCaptureTour(timing) {
  return Boolean(
    timing.interaction === ACCEPTED_INTERACTION ||
    (timing.steps && timing.steps.length),
  );
}

function resolveRequestedEndOffsetSeconds(timing) {
  if (hasCaptureTour(timing) || timing.endMarker) {
    return timing.endCushionSeconds;
  }
  return timing.endCushionSeconds + timing.waitAfterReadyMs / 1000;
}

const ANIMATION_READY_MARKERS = new Set([
  'animationsComplete',
  'laserComplete',
  'shimmerComplete',
]);

function requiresAnimations({ readyMarker, requiredMarkers = [] } = {}) {
  if (ANIMATION_READY_MARKERS.has(readyMarker)) {
    return true;
  }
  return requiredMarkers.some((name) => ANIMATION_READY_MARKERS.has(name));
}

function markerInScene(marker, sceneKey) {
  if (sceneKey === undefined) {
    return true;
  }
  return marker.sceneKey === sceneKey;
}

function findMarkersByName(markers, name, sceneKey) {
  return (markers || []).filter(
    (marker) =>
      marker && marker.name === name && markerInScene(marker, sceneKey),
  );
}

function latestByReceivedAt(markers) {
  return markers.reduce((current, marker) => {
    if (!current) {
      return marker;
    }
    const currentMs = current.receivedAtMs;
    const nextMs = marker.receivedAtMs;
    if (typeof nextMs !== 'number') {
      return current;
    }
    if (typeof currentMs !== 'number' || nextMs >= currentMs) {
      return marker;
    }
    return current;
  }, null);
}

function selectReadyCapture(markers, { readyMarker, requiredMarkers = [] }) {
  if (!Array.isArray(markers)) {
    throw new Error('markers must be an array');
  }
  const readyName = requireMarkerName(readyMarker, 'readyMarker');
  const required = parseRequiredMarkers(requiredMarkers, 'requiredMarkers');
  const readyCandidates = findMarkersByName(markers, readyName);
  if (readyCandidates.length === 0) {
    throw new Error(`Missing ready marker "${readyName}"`);
  }
  const ready = latestByReceivedAt(readyCandidates);
  const sceneKey = Object.hasOwn(ready, 'sceneKey') ? ready.sceneKey : null;
  const missing = required.filter(
    (name) => findMarkersByName(markers, name, sceneKey).length === 0,
  );
  if (missing.length) {
    throw new Error(
      `ready marker "${readyName}" scene ${JSON.stringify(
        sceneKey,
      )} missing required markers: ${missing.join(', ')}`,
    );
  }
  return {
    marker: ready,
    sceneKey,
    requiredMarkers: required,
  };
}

function selectSceneMarker(markers, name, sceneKey) {
  const matches = findMarkersByName(markers, name, sceneKey);
  return latestByReceivedAt(matches);
}

module.exports = {
  ACCEPTED_INTERACTION,
  DEFAULT_END_CUSHION_SECONDS,
  DEFAULT_INTERACTION_END_CUSHION_SECONDS,
  DEFAULT_READY_MARKER,
  DEFAULT_START_OFFSET_SECONDS,
  DEFAULT_WAIT_AFTER_ANIMATIONS_MS,
  DEFAULT_WAIT_AFTER_READY_MS,
  LEGACY_REQUIRED_MARKERS,
  hasCaptureTour,
  loadCaptureConfigFile,
  normalizeInteraction,
  parseCaptureConfigObject,
  resolveCaptureReadiness,
  resolveCaptureTiming,
  requiresAnimations,
  resolveRequestedEndOffsetSeconds,
  selectReadyCapture,
  selectSceneMarker,
};

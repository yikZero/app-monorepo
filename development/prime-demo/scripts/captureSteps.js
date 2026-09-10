const {
  readDetoxScreenFrame,
  screenPointFromFrame,
} = require('./riskCheckboxPoint');

const STEP_KEYS = new Set([
  'id',
  'testID',
  'point',
  'pointMarker',
  'waitForMarker',
  'waitForTestID',
  'waitForGoneTestID',
  'holdMs',
]);
const WAIT_KEYS = ['waitForMarker', 'waitForTestID', 'waitForGoneTestID'];
const HOST_TAP_POINT_SOURCE = 'host-tap';
const HOST_TAP_CLOCK = 'host-dispatched';
const DEFAULT_STEP_TARGET_TIMEOUT_MS = 15_000;
const DEFAULT_STEP_WAIT_TIMEOUT_MS = 25_000;

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

function requireName(value, label) {
  if (typeof value !== 'string' || !value) {
    throw new Error(`${label} must be a nonempty string`);
  }
  return value;
}

function parsePoint(raw, label) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`${label} must be an object`);
  }
  const unknown = Object.keys(raw).filter((key) => key !== 'x' && key !== 'y');
  if (unknown.length) {
    throw new Error(`${label} unknown keys: ${unknown.join(', ')}`);
  }
  return {
    x: requireFinite(`${label}.x`, raw.x, { min: 0 }),
    y: requireFinite(`${label}.y`, raw.y, { min: 0 }),
  };
}

function optionalName(raw, key) {
  if (!Object.hasOwn(raw, key) || raw[key] === undefined || raw[key] === null) {
    return null;
  }
  return requireName(raw[key], key);
}

function parseCaptureStep(raw, index) {
  const label = `steps[${index}]`;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`${label} must be an object`);
  }
  const unknown = Object.keys(raw).filter((key) => !STEP_KEYS.has(key));
  if (unknown.length) {
    throw new Error(`${label} unknown keys: ${unknown.join(', ')}`);
  }
  const id = requireName(raw.id, `${label}.id`);
  const testID = requireName(raw.testID, `${label}.testID`);
  const hasPoint =
    Object.hasOwn(raw, 'point') &&
    raw.point !== undefined &&
    raw.point !== null;
  const hasPointMarker =
    Object.hasOwn(raw, 'pointMarker') &&
    raw.pointMarker !== undefined &&
    raw.pointMarker !== null;
  if (hasPoint && hasPointMarker) {
    throw new Error(`${label} must not set both point and pointMarker`);
  }
  const point = hasPoint ? parsePoint(raw.point, `${label}.point`) : null;
  const pointMarker = hasPointMarker
    ? requireName(raw.pointMarker, `${label}.pointMarker`)
    : null;

  const waitForMarker = optionalName(raw, 'waitForMarker');
  const waitForTestID = optionalName(raw, 'waitForTestID');
  const waitForGoneTestID = optionalName(raw, 'waitForGoneTestID');
  const waitCount = WAIT_KEYS.filter((key) => optionalName(raw, key)).length;
  if (waitCount !== 1) {
    throw new Error(`${label} must set exactly one of ${WAIT_KEYS.join(', ')}`);
  }

  let holdMs = 0;
  if (
    Object.hasOwn(raw, 'holdMs') &&
    raw.holdMs !== undefined &&
    raw.holdMs !== null
  ) {
    holdMs = requireFinite(`${label}.holdMs`, raw.holdMs, { min: 0 });
  }

  return {
    id,
    testID,
    point,
    pointMarker,
    waitForMarker,
    waitForTestID,
    waitForGoneTestID,
    holdMs,
  };
}

function parseCaptureSteps(value, label = 'steps') {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be a non-empty array`);
  }
  if (value.length === 0) {
    throw new Error(`${label} must be a non-empty array`);
  }
  const steps = value.map((item, index) => parseCaptureStep(item, index));
  const seen = new Set();
  for (const step of steps) {
    if (seen.has(step.id)) {
      throw new Error(`${label} duplicate id ${JSON.stringify(step.id)}`);
    }
    seen.add(step.id);
  }
  return steps;
}

function canonicalCaptureStep(step) {
  return {
    id: step.id,
    testID: step.testID,
    point: step.point,
    pointMarker: step.pointMarker,
    waitForMarker: step.waitForMarker,
    waitForTestID: step.waitForTestID,
    waitForGoneTestID: step.waitForGoneTestID,
    holdMs: step.holdMs,
  };
}

function stepWaitCondition(step) {
  if (step.waitForMarker) {
    return { kind: 'marker', value: step.waitForMarker };
  }
  if (step.waitForTestID) {
    return { kind: 'testID', value: step.waitForTestID };
  }
  if (step.waitForGoneTestID) {
    return { kind: 'gone', value: step.waitForGoneTestID };
  }
  throw new Error(
    `step ${JSON.stringify(step.id)} is missing a wait condition`,
  );
}

function frameCenterLocalPoint(frame) {
  return {
    x: frame.width / 2,
    y: frame.height / 2,
  };
}

function isDetoxRecordVisible(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return false;
  }
  if (record.visible === false || record.visible === 0) {
    return false;
  }
  if (record.hittable === false || record.hittable === 0) {
    return false;
  }
  return true;
}

function pickVisibleDetoxRecord(attrs) {
  if (attrs === null || typeof attrs !== 'object' || Array.isArray(attrs)) {
    let kind = typeof attrs;
    if (attrs === null) {
      kind = 'null';
    } else if (Array.isArray(attrs)) {
      kind = 'array';
    }
    throw new Error(`getAttributes must return an object, got ${kind}`);
  }
  if (Object.prototype.hasOwnProperty.call(attrs, 'elements')) {
    if (!Array.isArray(attrs.elements)) {
      throw new Error('getAttributes.elements must be an array when present');
    }
    const visible = attrs.elements.filter((item) => isDetoxRecordVisible(item));
    if (visible.length !== 1) {
      throw new Error(
        `expected 1 visible getAttributes match, found ${visible.length} (avoid stale hidden dialog elements)`,
      );
    }
    return visible[0];
  }
  if (!isDetoxRecordVisible(attrs)) {
    throw new Error('getAttributes target is not visible');
  }
  return attrs;
}

function readVisibleDetoxFrame(attrs) {
  return readDetoxScreenFrame(pickVisibleDetoxRecord(attrs));
}

function requireLocalPoint(value, label) {
  const point = parsePoint(value, label);
  return point;
}

function resolveStepTapPoint(
  step,
  { frame, markers, sceneKey, selectSceneMarker },
) {
  if (step.point) {
    return {
      localPoint: { ...step.point },
      localPointSource: 'step-point',
    };
  }
  if (step.pointMarker) {
    if (typeof selectSceneMarker !== 'function') {
      throw new Error('selectSceneMarker is required for pointMarker');
    }
    const marker = selectSceneMarker(markers, step.pointMarker, sceneKey);
    if (!marker) {
      throw new Error(
        `step ${JSON.stringify(step.id)} missing pointMarker ${JSON.stringify(
          step.pointMarker,
        )} in scene ${JSON.stringify(sceneKey)}`,
      );
    }
    const localPoint = requireLocalPoint(
      marker.extra?.localPoint,
      `marker ${JSON.stringify(step.pointMarker)} extra.localPoint`,
    );
    return {
      localPoint,
      localPointSource: 'pointMarker',
    };
  }
  return {
    localPoint: frameCenterLocalPoint(frame),
    localPointSource: 'frame-center',
  };
}

function buildHostTapMarker({
  step,
  sceneKey,
  screenPoint,
  localPoint,
  localPointSource,
  hostTapMs,
}) {
  return {
    name: step.id,
    tMs: 0,
    sceneKey,
    extra: {
      point: {
        x: screenPoint.x,
        y: screenPoint.y,
      },
      pointSource: HOST_TAP_POINT_SOURCE,
      coordinateSpace: 'device',
      localPoint: { ...localPoint },
      localPointSource,
      testID: step.testID,
      clock: HOST_TAP_CLOCK,
      hostTapMs,
    },
  };
}

function isRiskAckStep(step) {
  return (
    step.testID === 'sig-confirm-msg-risk-checkbox' ||
    step.waitForMarker === 'riskAcknowledged'
  );
}

function applyHostDispatchTimes(markers) {
  if (!Array.isArray(markers)) {
    throw new Error('markers must be an array');
  }
  return markers.map((marker) => {
    if (!marker || marker.extra?.clock !== HOST_TAP_CLOCK) {
      return marker;
    }
    const hostTapMs = marker.extra.hostTapMs;
    if (typeof hostTapMs !== 'number' || !Number.isFinite(hostTapMs)) {
      return marker;
    }
    return {
      ...marker,
      receivedAtMs: hostTapMs,
    };
  });
}

async function runCaptureSteps(steps, { sceneKey, driver, timeouts = {} }) {
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new Error('steps must be a non-empty array');
  }
  if (!driver) {
    throw new Error('capture steps require a driver');
  }
  const targetMs = timeouts.targetMs ?? DEFAULT_STEP_TARGET_TIMEOUT_MS;
  const waitMs = timeouts.waitMs ?? DEFAULT_STEP_WAIT_TIMEOUT_MS;
  const taps = [];
  let riskAck = null;
  let riskAckTap = null;

  for (const step of steps) {
    try {
      await driver.waitVisible(step.testID, targetMs);
      const attrs = await driver.getAttributes(step.testID);
      const frame = readVisibleDetoxFrame(attrs);
      const markerPayload = await driver.fetchMarkers();
      const markers = markerPayload.markers || [];
      const { localPoint, localPointSource } = resolveStepTapPoint(step, {
        frame,
        markers,
        sceneKey,
        selectSceneMarker: driver.selectSceneMarker,
      });
      const screenPoint = screenPointFromFrame(frame, localPoint);
      if (typeof driver.log === 'function') {
        driver.log(
          `step ${step.id}: getAttributes.frame ${JSON.stringify(
            frame,
          )} local ${JSON.stringify(localPoint)} screenPoint ${JSON.stringify(
            screenPoint,
          )} localPointSource=${localPointSource} (host-dispatched click, not a native state clock)`,
        );
      }
      const hostTapMs =
        typeof driver.now === 'function' ? driver.now() : Date.now();
      // POST before .tap so fixture-server receivedAtMs is the host
      // dispatch clock. Compose reads receivedAtMs, not extra.hostTapMs.
      await driver.postMarker(
        buildHostTapMarker({
          step,
          sceneKey,
          screenPoint,
          localPoint,
          localPointSource,
          hostTapMs,
        }),
      );
      await driver.tap(step.testID, localPoint);
      const wait = stepWaitCondition(step);
      if (wait.kind === 'marker') {
        const result = await driver.waitMarker(wait.value, waitMs, {
          sceneKey,
        });
        if (wait.value === 'riskAcknowledged') {
          riskAck = result;
        }
      } else if (wait.kind === 'testID') {
        await driver.waitVisibleTestID(wait.value, waitMs);
      } else if (wait.kind === 'gone') {
        await driver.waitGoneTestID(wait.value, waitMs);
      }
      if (step.holdMs) {
        await driver.sleep(step.holdMs);
      }
      const tap = {
        id: step.id,
        testID: step.testID,
        localPoint,
        frame,
        screenPoint,
        pointSource: HOST_TAP_POINT_SOURCE,
        localPointSource,
        coordinateSpace: 'device',
        hostTapMs,
        wait,
      };
      taps.push(tap);
      if (isRiskAckStep(step)) {
        riskAckTap = tap;
      }
    } catch (error) {
      throw new Error(
        `capture step ${JSON.stringify(step.id)} failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { cause: error },
      );
    }
  }

  return { taps, riskAck, riskAckTap };
}

module.exports = {
  DEFAULT_STEP_TARGET_TIMEOUT_MS,
  DEFAULT_STEP_WAIT_TIMEOUT_MS,
  HOST_TAP_CLOCK,
  HOST_TAP_POINT_SOURCE,
  STEP_KEYS,
  WAIT_KEYS,
  applyHostDispatchTimes,
  buildHostTapMarker,
  canonicalCaptureStep,
  isRiskAckStep,
  parseCaptureStep,
  parseCaptureSteps,
  pickVisibleDetoxRecord,
  readVisibleDetoxFrame,
  resolveStepTapPoint,
  runCaptureSteps,
  stepWaitCondition,
};

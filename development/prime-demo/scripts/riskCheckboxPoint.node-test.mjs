import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  applyScreenPointToRiskAckMarkers,
  overlayRiskAcknowledgedPoint,
  readDetoxScreenFrame,
  screenPointFromFrame,
} = require('./riskCheckboxPoint.js');

const LOCAL = { x: 10, y: 20 };

test('screenPoint is frame origin plus local glyph tap', () => {
  const frame = { x: 20, y: 722, width: 353, height: 40 };
  assert.deepEqual(screenPointFromFrame(frame, LOCAL), { x: 30, y: 742 });
});

test('readDetoxScreenFrame accepts a single iOS attributes.frame', () => {
  const frame = readDetoxScreenFrame({
    frame: { x: 20, y: 722, width: 353, height: 40 },
  });
  assert.deepEqual(frame, { x: 20, y: 722, width: 353, height: 40 });
});

test('readDetoxScreenFrame unwraps a unique elements[] match', () => {
  const frame = readDetoxScreenFrame({
    elements: [{ frame: { x: 8, y: 100, width: 40, height: 40 } }],
  });
  assert.deepEqual(frame, { x: 8, y: 100, width: 40, height: 40 });
});

test('readDetoxScreenFrame rejects missing or non-finite frame', () => {
  assert.throws(() => readDetoxScreenFrame({}), /frame is missing/);
  assert.throws(
    () =>
      readDetoxScreenFrame({
        frame: { x: 1, y: Number.NaN, width: 2, height: 2 },
      }),
    /frame.y must be a finite number/,
  );
  assert.throws(
    () => readDetoxScreenFrame({ frame: { x: 1, y: 2, width: 0, height: 10 } }),
    /dimensions must be > 0/,
  );
  assert.throws(
    () => readDetoxScreenFrame({ elements: [] }),
    /elements length 0/,
  );
});

test('overlay keeps times and checked, replaces point with screen coords', () => {
  const marker = {
    name: 'riskAcknowledged',
    tMs: 4123,
    sceneKey: 'permit2',
    receivedAtMs: 1_700_000_123,
    clientNowMs: 1_700_000_100,
    extra: {
      checked: true,
      reactRootPoint: { x: 30, y: 683 },
    },
  };
  const next = overlayRiskAcknowledgedPoint(marker, {
    screenPoint: { x: 30, y: 742 },
  });
  assert.equal(next.receivedAtMs, marker.receivedAtMs);
  assert.equal(next.tMs, marker.tMs);
  assert.equal(next.clientNowMs, marker.clientNowMs);
  assert.equal(next.sceneKey, marker.sceneKey);
  assert.equal(next.extra.checked, true);
  assert.deepEqual(next.extra.reactRootPoint, { x: 30, y: 683 });
  assert.deepEqual(next.extra.point, { x: 30, y: 742 });
  assert.equal(next.extra.coordinateSpace, 'device');
  assert.equal(next.extra.pointSource, 'detox-frame');
  assert.deepEqual(marker.extra.point, undefined);
});

test('overlay moves legacy extra.point onto reactRootPoint', () => {
  const next = overlayRiskAcknowledgedPoint(
    {
      name: 'riskAcknowledged',
      extra: { checked: true, point: { x: 30, y: 683 } },
    },
    { screenPoint: { x: 30, y: 742 } },
  );
  assert.deepEqual(next.extra.reactRootPoint, { x: 30, y: 683 });
  assert.deepEqual(next.extra.point, { x: 30, y: 742 });
});

test('applyScreenPointToRiskAckMarkers overlays the scene match only', () => {
  const markers = [
    { name: 'animationsComplete', sceneKey: 'permit2' },
    {
      name: 'riskAcknowledged',
      sceneKey: 'permit2',
      receivedAtMs: 9,
      extra: { checked: true, reactRootPoint: { x: 1, y: 2 } },
    },
    {
      name: 'riskAcknowledged',
      sceneKey: 'other',
      extra: { checked: true },
    },
  ];
  const next = applyScreenPointToRiskAckMarkers(
    markers,
    { screenPoint: { x: 30, y: 742 } },
    'permit2',
  );
  assert.equal(next[0], markers[0]);
  assert.deepEqual(next[1].extra.point, { x: 30, y: 742 });
  assert.equal(next[1].receivedAtMs, 9);
  assert.equal(next[2], markers[2]);
});

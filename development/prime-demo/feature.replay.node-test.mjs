import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseDemoArgs } from './demo.mjs';
import {
  assertRawMatchesSnapshot,
  loadFeature,
  loadSnapshotDir,
  posixRelative,
  sha256File,
  writeSnapshotDir,
} from './feature.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function seedFeature(featuresDir) {
  const dir = path.join(featuresDir, 'signguard-permit2');
  fs.mkdirSync(dir, { recursive: true });
  writeJson(path.join(dir, 'fixture.json'), { title: 'Permit2' });
  writeJson(path.join(dir, 'camera.json'), {
    offsetUnits: 'designPx',
    keyframes: [
      { at: 0, y: 0 },
      { at: 1, y: 10 },
    ],
  });
  writeJson(path.join(dir, 'taps.json'), {
    enabled: true,
    coordinateSpace: 'device',
    style: {
      radius: 14,
      color: '#FFFFFF',
      opacity: 0.46,
      ringColor: '#A8B3AE',
      ringOpacity: 0.28,
    },
    events: [
      {
        id: 'risk-checkbox',
        enabled: true,
        marker: 'riskAcknowledged',
        offset: 0,
        duration: 0.85,
      },
    ],
  });
  fs.copyFileSync(
    path.join(ROOT, 'presets/prime-393x852.json'),
    path.join(dir, 'layout.json'),
  );
  writeJson(path.join(dir, 'feature.json'), {
    schemaVersion: 1,
    id: 'signguard-permit2',
    title: 'Test feature',
    scene: 'signguard-permit2',
    fixture: 'fixture.json',
    camera: 'camera.json',
    taps: 'taps.json',
    layout: 'layout.json',
    capture: {
      interaction: 'risk-checkbox',
      readyMarker: 'animationsComplete',
      requiredMarkers: [
        'sheetVisible',
        'cardMounted',
        'laserComplete',
        'shimmerComplete',
      ],
      waitAfterReadyMs: 2200,
      startOffsetSeconds: -0.1,
      endCushionSeconds: 0.5,
    },
    compose: { holdSeconds: 2 },
  });
  return loadFeature('signguard-permit2', { featuresDir });
}

function writeTake(takeDir, bytes = 'raw-bytes') {
  fs.mkdirSync(takeDir, { recursive: true });
  const rawPath = path.join(takeDir, 'raw.mp4');
  fs.writeFileSync(rawPath, bytes);
  const rawHash = sha256File(rawPath);
  const takePath = path.join(takeDir, 'take.json');
  writeJson(takePath, {
    rawHash,
    video: { startSeconds: 1, actualEndSeconds: 2, holdSeconds: 2 },
  });
  return {
    takePath,
    takeDir,
    rawPath,
    rawHash,
    take: JSON.parse(fs.readFileSync(takePath, 'utf8')),
  };
}

test('new snapshots store relative raw and still keep absolute path', (t) => {
  const featuresDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prime-feat-'));
  const snapRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'prime-snap-'));
  t.after(() => {
    fs.rmSync(featuresDir, { recursive: true, force: true });
    fs.rmSync(snapRoot, { recursive: true, force: true });
  });
  const feature = seedFeature(featuresDir);
  const takeRecord = writeTake(path.join(snapRoot, 'take'));
  const snapshotDir = path.join(snapRoot, 'snapshot');
  const meta = writeSnapshotDir(snapshotDir, {
    kind: 'take',
    feature,
    takeRecord,
    compose: { start: 1, end: 2, hold: 2, tapsEnabled: true },
  });
  assert.equal(meta.raw.path, takeRecord.rawPath);
  assert.equal(meta.raw.sha256, takeRecord.rawHash);
  assert.equal(
    meta.raw.relativePath,
    posixRelative(snapshotDir, takeRecord.rawPath),
  );
  const matched = assertRawMatchesSnapshot(loadSnapshotDir(snapshotDir));
  assert.equal(matched.source, 'relative');
  assert.equal(matched.rawHash, takeRecord.rawHash);
});

test('moved take dir uses relative raw when original absolute path is gone', (t) => {
  const featuresDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prime-feat-'));
  const originalRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'prime-orig-'));
  t.after(() => {
    fs.rmSync(featuresDir, { recursive: true, force: true });
    fs.rmSync(originalRoot, { recursive: true, force: true });
  });
  const feature = seedFeature(featuresDir);
  const takeRecord = writeTake(path.join(originalRoot, 'take'));
  const snapshotDir = path.join(originalRoot, 'take', 'snapshot');
  writeSnapshotDir(snapshotDir, {
    kind: 'take',
    feature,
    takeRecord,
    compose: { start: 1, end: 2, hold: 2 },
  });
  const movedRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'prime-moved-'));
  t.after(() => fs.rmSync(movedRoot, { recursive: true, force: true }));
  fs.cpSync(path.join(originalRoot, 'take'), path.join(movedRoot, 'take'), {
    recursive: true,
  });
  fs.rmSync(originalRoot, { recursive: true, force: true });
  const movedSnap = loadSnapshotDir(path.join(movedRoot, 'take', 'snapshot'));
  assert.equal(fs.existsSync(movedSnap.meta.raw.path), false);
  const matched = assertRawMatchesSnapshot(movedSnap);
  assert.equal(matched.source, 'relative');
  assert.equal(matched.rawPath, path.join(movedRoot, 'take', 'raw.mp4'));
});

test('moved feature output tree relocates render snapshot via relative raw', (t) => {
  const featuresDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prime-feat-'));
  const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'prime-out-'));
  t.after(() => {
    fs.rmSync(featuresDir, { recursive: true, force: true });
    fs.rmSync(outRoot, { recursive: true, force: true });
  });
  const feature = seedFeature(featuresDir);
  const takeRecord = writeTake(path.join(outRoot, 'takes', 'T1'));
  const snapshotDir = path.join(outRoot, 'renders', 'R1', 'snapshot');
  writeSnapshotDir(snapshotDir, {
    kind: 'render',
    feature,
    takeRecord,
    compose: { start: 1, end: 2, hold: 2, tapsEnabled: true },
  });
  const moved = fs.mkdtempSync(path.join(os.tmpdir(), 'prime-out2-'));
  t.after(() => fs.rmSync(moved, { recursive: true, force: true }));
  fs.cpSync(outRoot, moved, { recursive: true });
  fs.rmSync(outRoot, { recursive: true, force: true });
  const movedSnap = loadSnapshotDir(
    path.join(moved, 'renders', 'R1', 'snapshot'),
  );
  assert.equal(fs.existsSync(movedSnap.meta.raw.path), false);
  const matched = assertRawMatchesSnapshot(movedSnap);
  assert.equal(matched.source, 'relative');
  assert.equal(matched.rawPath, path.join(moved, 'takes', 'T1', 'raw.mp4'));
});

test('legacy snapshot relocates with explicit --take and refuses a wrong hash', (t) => {
  const featuresDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prime-feat-'));
  const originalRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'prime-legacy-'));
  t.after(() => {
    fs.rmSync(featuresDir, { recursive: true, force: true });
    fs.rmSync(originalRoot, { recursive: true, force: true });
  });
  const feature = seedFeature(featuresDir);
  const takeRecord = writeTake(path.join(originalRoot, 'take'));
  const snapshotDir = path.join(originalRoot, 'render', 'snapshot');
  const meta = writeSnapshotDir(snapshotDir, {
    kind: 'render',
    feature,
    takeRecord,
    compose: { start: 1, end: 2, hold: 2 },
  });
  delete meta.raw.relativePath;
  fs.writeFileSync(
    path.join(snapshotDir, 'snapshot.json'),
    `${JSON.stringify(meta, null, 2)}\n`,
  );
  const relocated = writeTake(
    fs.mkdtempSync(path.join(os.tmpdir(), 'prime-reloc-')),
    'raw-bytes',
  );
  t.after(() => fs.rmSync(relocated.takeDir, { recursive: true, force: true }));
  fs.rmSync(takeRecord.rawPath);
  const snapshot = loadSnapshotDir(snapshotDir);
  const matched = assertRawMatchesSnapshot(snapshot, {
    relocateRaw: relocated.takeDir,
  });
  assert.equal(matched.source, 'relocated');
  assert.equal(matched.rawHash, takeRecord.rawHash);

  const wrong = writeTake(
    fs.mkdtempSync(path.join(os.tmpdir(), 'prime-wrong-')),
    'other-bytes',
  );
  t.after(() => fs.rmSync(wrong.takeDir, { recursive: true, force: true }));
  assert.throws(
    () => assertRawMatchesSnapshot(snapshot, { relocateRaw: wrong.takeDir }),
    /sha256 mismatch \(relocated\)/,
  );
});

test('relative candidate with the wrong hash does not fall back to the original path', (t) => {
  const featuresDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prime-feat-'));
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'prime-mix-'));
  t.after(() => {
    fs.rmSync(featuresDir, { recursive: true, force: true });
    fs.rmSync(root, { recursive: true, force: true });
  });
  const feature = seedFeature(featuresDir);
  const original = writeTake(path.join(root, 'original'));
  const snapshotDir = path.join(root, 'snapshot');
  writeSnapshotDir(snapshotDir, {
    kind: 'render',
    feature,
    takeRecord: original,
    compose: { start: 1, end: 2, hold: 2 },
  });
  const snapshot = loadSnapshotDir(snapshotDir);
  const relativePath = path.resolve(
    snapshot.dir,
    snapshot.meta.raw.relativePath.split('/').join(path.sep),
  );
  fs.mkdirSync(path.dirname(relativePath), { recursive: true });
  if (relativePath !== original.rawPath) {
    fs.writeFileSync(relativePath, 'tampered');
    assert.throws(
      () => assertRawMatchesSnapshot(snapshot),
      /sha256 mismatch \(relative\)/,
    );
    assert.equal(fs.existsSync(original.rawPath), true);
  } else {
    const movedOriginal = path.join(root, 'kept', 'raw.mp4');
    fs.mkdirSync(path.dirname(movedOriginal), { recursive: true });
    fs.copyFileSync(original.rawPath, movedOriginal);
    fs.writeFileSync(original.rawPath, 'tampered');
    const meta = JSON.parse(
      fs.readFileSync(path.join(snapshotDir, 'snapshot.json'), 'utf8'),
    );
    meta.raw.path = movedOriginal;
    meta.raw.relativePath = posixRelative(snapshotDir, original.rawPath);
    fs.writeFileSync(
      path.join(snapshotDir, 'snapshot.json'),
      `${JSON.stringify(meta, null, 2)}\n`,
    );
    assert.throws(
      () => assertRawMatchesSnapshot(loadSnapshotDir(snapshotDir)),
      /sha256 mismatch \(relative\)/,
    );
  }
});

test('replay CLI accepts relocation --take and rejects latest', () => {
  const options = parseDemoArgs([
    'replay',
    'renders/one',
    '--take',
    'takes/two',
  ]);
  assert.equal(options.command, 'replay');
  assert.equal(options.target, 'renders/one');
  assert.equal(options.take, 'takes/two');
  assert.throws(() => parseDemoArgs(['setup', '--take', 'x']), /--take/);
});

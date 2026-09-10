/* cspell:ignore pix */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { buildLayout, generateBackground } from './compose.mjs';
import { DEFAULT_LAYOUT_PATH, loadLayoutConfig } from './layout.mjs';

function authoring(overrides = {}) {
  const base = {
    schemaVersion: 1,
    outputScale: 3,
    canvas: { width: 640, height: 400 },
    phone: {
      x: 176,
      y: 48,
      width: 288,
      bezel: 8,
      radius: 43,
      outerStroke: { width: 4, opacity: 0.2 },
    },
    gradient: { top: '#39DB00', bottom: '#00C9A5' },
  };
  return {
    ...base,
    ...overrides,
    canvas: { ...base.canvas, ...overrides.canvas },
    phone: {
      ...base.phone,
      ...overrides.phone,
      outerStroke: {
        ...base.phone.outerStroke,
        ...overrides.phone?.outerStroke,
      },
    },
    gradient: { ...base.gradient, ...overrides.gradient },
  };
}

function writePreset(obj) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prime-layout-'));
  const file = path.join(dir, 'layout.json');
  fs.writeFileSync(file, `${JSON.stringify(obj)}\n`);
  return { dir, file };
}

function assertLayoutError(fn, pattern) {
  assert.throws(fn, (error) => {
    assert.equal(error.code, 'LAYOUT_CONFIG');
    assert.match(String(error.message), pattern);
    return true;
  });
}

function hexRgb(hex) {
  const h = hex.slice(1);
  return {
    r: Number.parseInt(h.slice(0, 2), 16),
    g: Number.parseInt(h.slice(2, 4), 16),
    b: Number.parseInt(h.slice(4, 6), 16),
  };
}

test('default preset derives screen, stroke, and output size independently', () => {
  const outputScale = 3;
  const canvas = { width: 640, height: 400 };
  const phone = {
    x: 176,
    y: 48,
    width: 288,
    bezel: 8,
    radius: 43,
    stroke: 4,
  };
  const screenWidth = phone.width - phone.bezel * 2;
  const screenRadius = phone.radius - phone.bezel;
  const preset = loadLayoutConfig(DEFAULT_LAYOUT_PATH);
  assert.equal(preset.outputScale, outputScale);
  assert.deepEqual(preset.design.canvas, canvas);
  assert.equal(preset.design.body.x, phone.x);
  assert.equal(preset.design.body.width, phone.width);
  assert.equal(preset.design.body.bezel, phone.bezel);
  assert.equal(preset.design.body.radius, phone.radius);
  assert.equal(preset.design.screen.width, screenWidth);
  assert.equal(preset.design.screen.radius, screenRadius);
  assert.equal(preset.design.outerStroke.x, phone.x - phone.stroke);
  assert.equal(preset.design.outerStroke.y, phone.y - phone.stroke);
  assert.equal(preset.design.outerStroke.width, phone.width + phone.stroke * 2);
  assert.equal(preset.design.outerStroke.thickness, phone.stroke);
  assert.equal(preset.design.outerStroke.radius, phone.radius + phone.stroke);
  assert.equal(preset.design.outerStroke.opacity, 0.2);
  assert.deepEqual(preset.design.outerStroke.color, { r: 0, g: 0, b: 0 });
  assert.equal(canvas.width * outputScale, 1920);
  assert.equal(canvas.height * outputScale, 1200);
  assert.equal(screenWidth * outputScale, 816);
  assert.equal(preset.nativeLogical.width, 393);
  assert.equal(preset.nativeLogical.height, 852);
  assert.equal(preset.expectedRaw.width, 1178);
  assert.equal(preset.stillOversample, 2);
  assert.equal(preset.gradient.topHex, '#39DB00');
  assert.equal(preset.gradient.bottomHex, '#00C9A5');
  assert.deepEqual(preset.gradient.top, hexRgb('#39DB00'));
  assert.deepEqual(preset.gradient.bottom, hexRgb('#00C9A5'));
});

test('buildLayout uses one preset for output pixels and camera travel', () => {
  const preset = loadLayoutConfig(DEFAULT_LAYOUT_PATH);
  const layout = buildLayout(preset, 1178, 2556);
  const screenWidth = 288 - 8 * 2;
  const displayH = Math.round((screenWidth * 852) / 393) * 3;
  const apertureH = (400 - 48 - 8) * 3;
  assert.equal(layout.canvasW, 1920);
  assert.equal(layout.canvasH, 1200);
  assert.equal(layout.displayW, screenWidth * 3);
  assert.equal(layout.displayH, displayH);
  assert.equal(layout.visibleApertureH, apertureH);
  assert.equal(layout.phoneX, 176 * 3);
  assert.equal(layout.innerRadius, (43 - 8) * 3);
  assert.equal(layout.stroke.radius, (43 + 4) * 3);
  assert.equal(
    (layout.displayH - layout.visibleApertureH) / layout.outputScale,
    246,
  );
  assert.equal(layout.stillOversample, 2);
  assert.equal(layout.gradient.top.r, 57);
});

test('illegal layout configs fail clearly', () => {
  const { dir, file } = writePreset(authoring({ schemaVersion: 2 }));
  try {
    assertLayoutError(() => loadLayoutConfig(file), /schemaVersion must be 1/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }

  const cases = [
    [
      authoring({ phone: { width: 150 } }),
      /exceeds full device display height/,
    ],
    [authoring({ outputScale: 0 }), /outputScale must be >= 1/],
    [authoring({ canvas: { width: 641 } }), /output canvas width/],
    [
      authoring({
        phone: { outerStroke: { opacity: 1.5 } },
      }),
      /phone.outerStroke.opacity must be <= 1/,
    ],
    [authoring({ phone: { bezel: 200 } }), /derived screen width must be >= 1/],
    [
      authoring({ phone: { radius: 8, bezel: 8 } }),
      /derived screen radius must be >= 1/,
    ],
    [
      authoring({ phone: { y: 400 } }),
      /derived visible screen height must be >= 1/,
    ],
    [authoring({ phone: { x: 400, width: 288 } }), /exceeds canvas.width/],
    [
      authoring({ gradient: { top: 'green' } }),
      /gradient.top must be a 3- or 6-digit hex color/,
    ],
  ];
  for (const [obj, pattern] of cases) {
    const tmp = writePreset(obj);
    try {
      assertLayoutError(() => loadLayoutConfig(tmp.file), pattern);
    } finally {
      fs.rmSync(tmp.dir, { recursive: true, force: true });
    }
  }

  assertLayoutError(
    () => loadLayoutConfig(path.join(os.tmpdir(), 'prime-layout-missing.json')),
    /layout file not found/,
  );
  const bad = writePreset(null);
  fs.writeFileSync(bad.file, '{');
  try {
    assertLayoutError(() => loadLayoutConfig(bad.file), /not valid JSON/);
  } finally {
    fs.rmSync(bad.dir, { recursive: true, force: true });
  }
});

test('custom phone width drives derived screen and stroke', () => {
  const tmp = writePreset(
    authoring({
      phone: { width: 300, bezel: 10, radius: 50, outerStroke: { width: 6 } },
    }),
  );
  try {
    const preset = loadLayoutConfig(tmp.file);
    assert.equal(preset.design.screen.width, 300 - 20);
    assert.equal(preset.design.screen.radius, 50 - 10);
    assert.equal(preset.design.outerStroke.x, 176 - 6);
    assert.equal(preset.design.outerStroke.width, 300 + 12);
    assert.equal(preset.design.outerStroke.radius, 50 + 6);
    assert.equal(preset.design.outerStroke.thickness, 6);
    const layout = buildLayout(preset, 1178, 2556);
    assert.equal(layout.displayW, 280 * 3);
    assert.equal(layout.phoneW, 300 * 3);
    assert.equal(layout.stroke.thickness, 6 * 3);
  } finally {
    fs.rmSync(tmp.dir, { recursive: true, force: true });
  }
});

test('custom gradient and phone participate in background render', async () => {
  const tmp = writePreset(
    authoring({
      outputScale: 1,
      canvas: { width: 16, height: 16 },
      phone: {
        x: 6,
        y: 6,
        width: 8,
        bezel: 2,
        radius: 3,
        outerStroke: { width: 2, opacity: 0.2 },
      },
      gradient: { top: '#FF0000', bottom: '#0000FF' },
    }),
  );
  try {
    const preset = loadLayoutConfig(tmp.file);
    assert.deepEqual(preset.gradient.top, { r: 255, g: 0, b: 0 });
    assert.deepEqual(preset.gradient.bottom, { r: 0, g: 0, b: 255 });
    const layout = buildLayout(preset, 1178, 2556);
    assert.equal(layout.canvasW, 16);
    assert.equal(layout.phoneX, 6);
    assert.equal(layout.phoneY, 6);
    const png = path.join(tmp.dir, 'bg.png');
    await generateBackground(layout, png);
    const result = spawnSync(
      process.env.FFMPEG || 'ffmpeg',
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-nostdin',
        '-i',
        png,
        '-f',
        'rawvideo',
        '-pix_fmt',
        'rgb24',
        'pipe:1',
      ],
      { encoding: 'buffer' },
    );
    assert.equal(result.status, 0, result.stderr.toString());
    const width = 16;
    const height = 16;
    assert.equal(result.stdout.length, width * height * 3);
    const at = (x, y) => {
      const i = (y * width + x) * 3;
      return [result.stdout[i], result.stdout[i + 1], result.stdout[i + 2]];
    };
    const topLeft = at(0, 0);
    const bottomLeft = at(0, height - 1);
    const body = at(layout.phoneX + 3, layout.phoneY + 3);
    assert.ok(
      topLeft[0] > 240 && topLeft[1] < 20 && topLeft[2] < 20,
      `custom top-left should be red, got ${topLeft}`,
    );
    assert.ok(
      bottomLeft[2] > 240 && bottomLeft[0] < 20 && bottomLeft[1] < 20,
      `custom bottom-left should be blue, got ${bottomLeft}`,
    );
    assert.equal(body[0] + body[1] + body[2], 0, `phone body ${body}`);
  } finally {
    fs.rmSync(tmp.dir, { recursive: true, force: true });
  }
});

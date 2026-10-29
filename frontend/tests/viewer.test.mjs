import assert from 'node:assert/strict';
import test from 'node:test';
import {
  angleMeasurement,
  lengthMeasurement,
  measurementLabel,
  roiMeasurement,
} from '../src/utils/viewer.js';

test('length measurement returns pixels and converts to millimetres when DICOM spacing exists', () => {
  const points = [{ x: 0.1, y: 0.1 }, { x: 0.6, y: 0.1 }];
  assert.equal(lengthMeasurement(points, { width: 400, height: 400 }), '200 px');
  assert.equal(
    lengthMeasurement(points, { width: 400, height: 400, pixelSpacing: [0.5, 0.5], naturalWidth: 800 }),
    '200.0 mm'
  );
});

test('angle measurement uses the middle point as the vertex', () => {
  const points = [{ x: 0.2, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 0.5, y: 0.2 }];
  assert.equal(angleMeasurement(points, { width: 400, height: 400 }), '90.0°');
});

test('ROI measurement returns the rectangular area', () => {
  const points = [{ x: 0.1, y: 0.1 }, { x: 0.4, y: 0.6 }];
  assert.equal(roiMeasurement(points, { width: 400, height: 400 }), 'ROI 24000 px²');
});

test('measurement label dispatches by mode', () => {
  const points = [{ x: 0, y: 0 }, { x: 0.5, y: 0 }];
  assert.equal(measurementLabel('length', points, { width: 400, height: 400 }), '200 px');
  assert.equal(measurementLabel('none', points), '');
});

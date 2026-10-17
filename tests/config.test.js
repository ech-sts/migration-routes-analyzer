import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONFIG, parseUrlParams, getConfig } from "../src/config.js";

test("DEFAULT_CONFIG has required non-static properties", () => {
  assert.equal(typeof DEFAULT_CONFIG.webmapId, "string");
  assert.equal(typeof DEFAULT_CONFIG.bufferDistance, "number");
  assert.equal(typeof DEFAULT_CONFIG.bufferUnit, "string");
  assert.equal(typeof DEFAULT_CONFIG.obstacleLayerTitle, "string");
  assert.equal(DEFAULT_CONFIG.obstacleLayerTitle, "Routenschwierigkeiten");
  assert.equal(DEFAULT_CONFIG.bufferDistance > 0, true);
  assert.equal(typeof DEFAULT_CONFIG.weightField, "string");
  assert.equal(typeof DEFAULT_CONFIG.descriptionField, "string");
});

test("parseUrlParams parses valid query parameters", () => {
  const query = "?webmap=custom-webmap-123&buffer=50&unit=miles&layer=my-obstacles&weightField=severity&descField=info";
  const parsed = parseUrlParams(query);

  assert.equal(parsed.webmapId, "custom-webmap-123");
  assert.equal(parsed.bufferDistance, 50);
  assert.equal(parsed.bufferUnit, "miles");
  assert.equal(parsed.obstacleLayerTitle, "my-obstacles");
  assert.equal(parsed.weightField, "severity");
  assert.equal(parsed.descriptionField, "info");
});

test("parseUrlParams ignores invalid buffer distances or units", () => {
  const query = "?buffer=-10&unit=lightyears";
  const parsed = parseUrlParams(query);

  assert.equal(parsed.bufferDistance, undefined);
  assert.equal(parsed.bufferUnit, undefined);
});

test("getConfig merges defaults with query parameters", () => {
  const query = "?buffer=45&unit=kilometers&webmap=abc987";
  const config = getConfig(query);

  assert.equal(config.webmapId, "abc987");
  assert.equal(config.bufferDistance, 45);
  assert.equal(config.bufferUnit, "kilometers");
  assert.equal(config.obstacleLayerTitle, "Routenschwierigkeiten");
});

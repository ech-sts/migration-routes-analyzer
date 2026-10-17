import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function getTranslationKeys(value, prefix = "") {
  return Object.entries(value).flatMap(([key, entry]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof entry === "object" && entry !== null
      ? getTranslationKeys(entry, path)
      : [path];
  });
}

function loadLocale(locale) {
  return JSON.parse(
    readFileSync(new URL(`../src/locales/${locale}/translation.json`, import.meta.url), "utf8")
  );
}

test("English and German translation resources define matching keys", () => {
  const englishKeys = getTranslationKeys(loadLocale("en")).sort();
  const germanKeys = getTranslationKeys(loadLocale("de")).sort();

  assert.deepEqual(germanKeys, englishKeys);
});
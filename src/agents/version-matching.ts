import type { AffectedVersionRange, RadarAlert } from "@/agents/types";

interface ExactVersion {
  core: number[];
  prerelease: string[];
}

function parseVersion(value: string): ExactVersion | null {
  const match = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*))?(?:\+[\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*)?$/.exec(value);
  if (!match) return null;
  const core = match.slice(1, 4).map(Number);
  const prerelease = match[4]?.split(".") ?? [];
  if (core.some((part) => !Number.isSafeInteger(part)) ||
      prerelease.some((part) => /^\d+$/.test(part) && part.length > 1 && part.startsWith("0"))) return null;
  return { core, prerelease };
}

function compare(left: ExactVersion, right: ExactVersion): number {
  for (let index = 0; index < 3; index++) {
    const difference = left.core[index] - right.core[index];
    if (difference) return difference;
  }
  if (!left.prerelease.length && !right.prerelease.length) return 0;
  if (!left.prerelease.length) return 1;
  if (!right.prerelease.length) return -1;
  for (let index = 0; index < Math.max(left.prerelease.length, right.prerelease.length); index++) {
    const a = left.prerelease[index];
    const b = right.prerelease[index];
    if (a === undefined) return -1;
    if (b === undefined) return 1;
    if (a === b) continue;
    const aNumeric = /^\d+$/.test(a);
    const bNumeric = /^\d+$/.test(b);
    if (aNumeric && bNumeric) return a.length - b.length || (a < b ? -1 : 1);
    if (aNumeric !== bNumeric) return aNumeric ? -1 : 1;
    return a < b ? -1 : 1;
  }
  return 0;
}

function inRange(version: ExactVersion, range: AffectedVersionRange): boolean | null {
  const lower = range.lower ? parseVersion(range.lower.version) : null;
  const upper = range.upper ? parseVersion(range.upper.version) : null;
  if ((!range.lower && !range.upper) || (range.lower && !lower) || (range.upper && !upper)) return null;
  if (lower && upper) {
    const order = compare(lower, upper);
    if (order > 0 || (order === 0 && (!range.lower?.inclusive || !range.upper?.inclusive))) return null;
  }
  if (lower && range.lower) {
    const order = compare(version, lower);
    if (order < 0 || (order === 0 && !range.lower.inclusive)) return false;
  }
  if (upper && range.upper) {
    const order = compare(version, upper);
    if (order > 0 || (order === 0 && !range.upper.inclusive)) return false;
  }
  return true;
}

// Only the sanitized query enters this deterministic browser-only comparison.
export function matchCveVersions(alert: RadarAlert, query: readonly string[]): RadarAlert | null {
  const name = alert.technology.toLowerCase();
  const entries = query.filter((entry) => entry.toLowerCase() === name || entry.toLowerCase().startsWith(`${name} `));
  if (!entries.length) return null;
  const matchedVersions = new Set<string>();
  let unverified = false;
  for (const entry of entries) {
    const rawVersion = entry.slice(name.length).trim().split(/\s+/)[0] ?? "";
    const version = parseVersion(rawVersion);
    if (!version || !alert.affectedRanges?.length) {
      unverified = true;
      continue;
    }
    const matches = alert.affectedRanges.map((range) => inRange(version, range));
    if (matches.includes(true)) matchedVersions.add(rawVersion);
    else if (matches.includes(null)) unverified = true;
  }
  if (matchedVersions.size) return { ...alert, verification: "affected", matchedVersions: [...matchedVersions] };
  if (unverified) return { ...alert, verification: "unverified", matchedVersions: [] };
  return null;
}

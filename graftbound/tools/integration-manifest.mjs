/**
 * Read-only GRAFTBOUND verifier source inventory for a future main-site integration.
 * Usage: node tools/integration-manifest.mjs [--source-sha=40-hex-commit]
 * Never starts a session, sends scores, touches D1, or copies files to production.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, normalize, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GAME } from '../src/config.js';
import {
  ACTIVE_CHALLENGE, CARD_POOL_VERSION, REPLAY_VERSION, RULES_VERSION,
  RANKED_CHALLENGES, MAX_DECISIONS, MAX_SEGMENT
} from '../src/engine/ranked.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = resolve(root, 'src');
const ENTRIES = Object.freeze(['src/cards/reference-set.js', 'src/engine/ranked.js']);
const STATIC_IMPORT = /(?:^|\n)\s*(?:import|export)\s+(?:[\w\s{},*]+\s+from\s*)?['"]([^'"]+)['"]/g;

function insideSource(file) {
  const abs = resolve(root, file);
  if (!file.startsWith('src/') || (abs !== srcRoot && !abs.startsWith(srcRoot + sep)) || !file.endsWith('.js')) {
    throw new Error('Verifier import escaped the game rules source: ' + file);
  }
  return abs;
}

function dependencyPath(importer, specifier) {
  if (!specifier.startsWith('.')) throw new Error('Non-local verifier dependency: ' + importer + ' -> ' + specifier);
  const file = normalize(join(dirname(importer), specifier)).split(sep).join('/');
  insideSource(file);
  return file;
}

/** Recursively includes every static local import and re-export of the rules entrypoints. */
export function verifierSourceFiles() {
  const visited = new Map();
  function visit(path) {
    if (visited.has(path)) return;
    const bytes = readFileSync(insideSource(path));
    const code = bytes.toString('utf8');
    if (/\bimport\s*\(/.test(code)) throw new Error('Dynamic import requires explicit review: ' + path);
    if (/\b(?:window|document|localStorage|sessionStorage)\s*[.[]/.test(code)) {
      throw new Error('Browser-only rules dependency: ' + path);
    }
    const imports = Array.from(code.matchAll(STATIC_IMPORT), match => match[1]);
    visited.set(path, bytes);
    for (const specifier of imports) visit(dependencyPath(path, specifier));
  }
  for (const entry of ENTRIES) visit(entry);
  return [...visited].sort(([a], [b]) => a.localeCompare(b)).map(([path, bytes]) => ({
    path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex')
  }));
}

/** The digest matches the exact ordered source bytes, not just the version string. */
export function verifierDigest(files = verifierSourceFiles()) {
  const h = createHash('sha256');
  for (const f of files) {
    h.update(f.path + '\n');
    h.update(readFileSync(insideSource(f.path)));
    h.update('\n');
  }
  return h.digest('hex');
}

export function integrationManifest({ sourceCommit = null } = {}) {
  if (sourceCommit !== null && !/^[0-9a-f]{40}$/.test(sourceCommit)) {
    throw new Error('Source commit must be a full 40-character lowercase Git SHA');
  }
  const challenge = RANKED_CHALLENGES[ACTIVE_CHALLENGE];
  if (!challenge || challenge.rulesVersion !== RULES_VERSION || challenge.cardPoolVersion !== CARD_POOL_VERSION) {
    throw new Error('Ranked challenge and rules metadata disagree');
  }
  if (!Number.isSafeInteger(challenge.revision) || challenge.revision < 1) throw new Error('Invalid challenge revision');
  if (GAME.path !== '/graftbound/') throw new Error('Canonical Game Lab route changed');
  const files = verifierSourceFiles();
  return {
    schema: 'graftbound-verifier-source-manifest-v1',
    purpose: 'lab-only; source inventory for an independently reviewed website verifier',
    game: GAME.title,
    gameVersion: GAME.version,
    gameLabRoute: GAME.path,
    sourceCommit,
    rulesVersion: RULES_VERSION,
    cardPoolVersion: CARD_POOL_VERSION,
    scoringVersion: challenge.scoringVersion,
    replayVersion: REPLAY_VERSION,
    challenge: { id: challenge.id, revision: challenge.revision, seed: challenge.seed, tutorial: challenge.tutorial },
    limits: { maxDecisions: MAX_DECISIONS, maxSegment: MAX_SEGMENT },
    entrypoints: ENTRIES.slice(),
    fileCount: files.length,
    rulesDigestSha256: verifierDigest(files),
    files
  };
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const arg = process.argv.slice(2);
  if (arg.some(v => !/^--source-sha=[0-9a-f]{40}$/.test(v)) || arg.length > 1) {
    console.error('Usage: node tools/integration-manifest.mjs [--source-sha=40-hex-commit]');
    process.exitCode = 2;
  } else {
    const sourceCommit = arg.length ? arg[0].slice('--source-sha='.length) : null;
    process.stdout.write(JSON.stringify(integrationManifest({ sourceCommit }), null, 2) + '\n');
  }
}
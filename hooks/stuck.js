#!/usr/bin/env node
/**
 * The council arrives on its own, at the third failure — not when you remember it.
 *
 * Until now the layer had to be summoned: `/council`, and only if you thought of
 * it. But the moment worth interrupting is not the moment you remember a registry
 * exists — it is the moment the SAME tool has failed three times in a row and you
 * have not yet admitted you are stuck. Waiting for the third is the whole design:
 * once is noise, twice is bad luck, three times is a wall.
 *
 * WHY NODE AND NOT PYTHON. The first version was Python, and it could not be
 * shipped: `python` and `python3` on Windows are the WindowsApps stubs, which
 * print the word "Python" to stdout and exit 49 without reading stdin — so the
 * hook emitted "Python" where the harness expects JSON, in someone else's
 * session. A `||` fallback chain works but leaves that word in front of the real
 * answer. Node needs no such guessing: Claude Code is itself a Node program, so
 * every machine that can install this plugin already has it.
 *
 * Everything here is a reason NOT to speak. A layer that talks during a healthy
 * run is noise the user pays for and then learns to ignore, and an interruption
 * nobody reads is worse than silence.
 *
 * Hook: PostToolUse. Reads the hook payload on stdin, prints JSON on stdout.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const CFG = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const STATE = path.join(CFG, 'waitlayer-stuck.json');
const SITE = process.env.WAITLAYER_URL
  || 'https://future-assembly-483c0f.vibe.commonsmade.com';
const THRESHOLD = Number(process.env.WAITLAYER_STUCK_AT || 3);
const COOLDOWN = Number(process.env.WAITLAYER_STUCK_COOLDOWN || 900) * 1000;
const TIMEOUT = Number(process.env.WAITLAYER_STUCK_TIMEOUT || 12) * 1000;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/127.0 Safari/537.36';

/** Say nothing, successfully. A hook that fails is noise in someone's session. */
function quiet(note) {
  process.stdout.write(JSON.stringify(note ? { systemMessage: note } : {}) + '\n');
  process.exit(0);
}

function load() {
  try {
    const got = JSON.parse(fs.readFileSync(STATE, 'utf8'));
    return got && typeof got === 'object' && !Array.isArray(got) ? got : {};
  } catch (e) {
    return {};
  }
}

/** Written through a temporary file: two tools can fail in the same moment, and
 *  a half-written counter would be read back as a fresh one. */
function save(state) {
  try {
    fs.mkdirSync(CFG, { recursive: true });
    const tmp = STATE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(state), 'utf8');
    fs.renameSync(tmp, STATE);
  } catch (e) { /* a counter is not worth an exception */ }
}

/** Did this call fail? The harness says so in more than one way. */
function failed(p) {
  const r = p.tool_response;
  if (r && typeof r === 'object') {
    if (r.is_error || r.isError) return true;
    const code = r.returncode !== undefined ? r.returncode : r.exit_code;
    if (typeof code === 'number' && code !== 0) return true;
  }
  const text = typeof r === 'string' ? r : JSON.stringify(r || '');
  return /\b(error|exception|traceback|failed|refused)\b/i.test(text);
}

/** The line worth asking about: the END of the output, where the cause is.
 *  A failed run usually prints a screen of good output first, so the FIRST line
 *  of a failure is the last line of a success. */
function reason(p) {
  const r = p.tool_response;
  const blob = typeof r === 'string' ? r : JSON.stringify(r || '');
  const lines = blob.replace(/\\n/g, '\n').split('\n')
    .map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/error|exception|traceback|fail|refus|denied|not found/i.test(lines[i])) {
      return lines[i].slice(0, 180);
    }
  }
  return lines.length ? lines[lines.length - 1].slice(0, 180) : '';
}

function ask(task) {
  const url = SITE + '/api/council?task=' + encodeURIComponent(task.slice(0, 200));
  // http as well as https on purpose: the project keeps a local mirror on 8791,
  // and a hook that can only talk to production cannot be tested without it.
  const client = url.startsWith('http://') ? require('http') : require('https');
  return new Promise((resolve, reject) => {
    const req = client.get(url, { headers: { 'User-Agent': UA } }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    });
    req.setTimeout(TIMEOUT, () => { req.destroy(new Error('timeout')); });
    req.on('error', reject);
  });
}

async function main(payload) {
  // A subagent's failures are its own business: it has its own task, and the
  // main thread would be handed advice about work it never did.
  if (payload.agent_id) quiet();

  const tool = String(payload.tool_name || 'tool');
  const sid = String(payload.session_id || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 16)
    || 'unknown';
  const key = sid + '/' + tool;
  const state = load();
  const row = state[key] || {};

  if (!failed(payload)) {
    // Success clears the wall. Three failures with a success in between is not
    // being stuck, it is ordinary work.
    if (state[key]) { delete state[key]; save(state); }
    quiet();
  }

  row.n = Number(row.n || 0) + 1;
  row.why = reason(payload) || row.why || '';
  row.at = Date.now();
  state[key] = row;

  // Drop counters nobody has touched in a day, so this cannot become a leak.
  for (const k of Object.keys(state)) {
    if (Date.now() - Number((state[k] || {}).at || 0) > 86400000) delete state[k];
  }

  if (row.n < THRESHOLD) { save(state); quiet(); }

  // Do not say the same thing twice within a quarter of an hour: the second
  // time is not help, it is nagging.
  if (Date.now() - Number(row.spoke || 0) < COOLDOWN) { save(state); quiet(); }

  const task = tool + ' keeps failing: ' + (row.why || 'no message');
  let d;
  try {
    d = await ask(task);
  } catch (e) {
    // The layer is unreachable. That is not the user's problem right now.
    row.n = 0; save(state); quiet();
  }

  row.n = 0;
  row.spoke = Date.now();
  save(state);

  // The refusal is the most expensive thing this layer can say — two model
  // houses have to agree before it does — so it is never softened and never
  // buried under a table of cards.
  if (d && d.noFit) {
    const why = String(d.noFit.why || '').trim();
    quiet('WAITLAYER · ' + tool + ' упал ' + THRESHOLD + ' раз(а). Слой посмотрел реестр: '
      + 'ничего подходящего нет' + (why ? ' — ' + why.slice(0, 120) : '.'));
  }

  const cards = ((d && d.proposals) || []).slice(0, 3);
  if (!cards.length) quiet();
  const best = cards[0];
  const name = String(best.card.title || best.card.id).slice(0, 40);
  const others = cards.slice(1)
    .map((p) => String(p.card.title || p.card.id).slice(0, 24)).join(', ');
  let note = 'WAITLAYER · ' + tool + ' упал ' + THRESHOLD + ' раз(а) подряд. '
    + 'Совет предлагает: ' + name + ' — ' + String(best.pitch || '').slice(0, 100);
  if (others) note += ' · ещё: ' + others;
  note += ' · стол: ' + SITE + '/#/t/' + encodeURIComponent(task.slice(0, 200));
  quiet(note);
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { input += c; });
process.stdin.on('end', () => {
  let payload;
  try {
    payload = JSON.parse(input || '{}');
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) payload = {};
  } catch (e) {
    payload = {};
  }
  main(payload).catch(() => quiet());
});
// A hook that hangs holds up the session; the layer is never worth that.
setTimeout(() => quiet(), TIMEOUT + 4000).unref();

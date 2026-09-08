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

/** One line per firing, so the layer can be asked what it actually did.
 *  Silence and breakage look identical from outside; a journal is the only
 *  thing that tells them apart. Kept to 200 lines so it cannot become a leak. */
function note(what) {
  try {
    const line = new Date().toISOString().slice(5, 19).replace('T', ' ') + '  ' + what + '\n';
    const log = path.join(CFG, 'waitlayer-stuck.log');
    let old = '';
    try { old = fs.readFileSync(log, 'utf8'); } catch (e) { /* first line */ }
    const lines = (old + line).split('\n').filter(Boolean).slice(-200);
    fs.mkdirSync(CFG, { recursive: true });
    fs.writeFileSync(log, lines.join('\n') + '\n', 'utf8');
  } catch (e) { /* a journal is never worth an exception */ }
}

function post(pathname, payload) {
  const url = SITE + pathname;
  const client = url.startsWith('http://') ? require('http') : require('https');
  const data = JSON.stringify(payload);
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = client.request({
      hostname: u.hostname,
      port: u.port || undefined,
      path: u.pathname + u.search,
      method: 'POST',
      headers: { 'content-type': 'application/json', 'User-Agent': UA,
        'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { body += c; });
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    });
    req.setTimeout(TIMEOUT, () => { req.destroy(new Error('timeout')); });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
 * Did the session actually RUN the card we suggested?
 *
 * This is the whole honesty of the feedback loop. Confirming help because a
 * command happened to succeed after we spoke would fill the public Helpers
 * table with credit the layer did not earn — the user may simply have fixed it
 * themselves, and a table ranked by "confirmed use" would then be ranked by
 * coincidence. So a confirmation requires evidence in the text of what was run:
 * the server's own id or its distinctive name.
 */
function usedIt(payload, card) {
  const inp = JSON.stringify(payload.tool_input || '');
  const hay = inp.toLowerCase();
  const id = String(card.id || '').toLowerCase();
  const tail = id.split('/').pop() || '';
  if (id && hay.includes(id)) return true;
  // A bare tail has to be distinctive: "bash" or "api" would match anything.
  if (tail.length >= 6 && hay.includes(tail)) return true;
  const name = String(card.name || '').toLowerCase();
  return Boolean(name.length >= 6 && hay.includes(name));
}

/** Tell the layer a card really helped — and only then. */
async function credit(card, task) {
  const got = await post('/api/help', { toolId: card.id, task: task, accepted: true });
  if (!got || !got.receipt) return false;
  await post('/api/confirm', { receipt: got.receipt,
    note: 'the agent ran it after the tool had failed ' + THRESHOLD + ' times' });
  return true;
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
    // THE LOOP CLOSES HERE. If we suggested a card, and the session then ran
    // that very card, and the run succeeded — the layer earned the credit and
    // says so. Anything weaker would rank the public Helpers table by
    // coincidence: a command that merely succeeded AFTER we spoke proves
    // nothing, because the user may simply have fixed it themselves.
    if (row.card && usedIt(payload, row.card) && !row.credited) {
      row.credited = Date.now();
      state[key] = row;
      save(state);
      try {
        await credit(row.card, row.task || tool);
        note('CREDIT ' + row.card.id + ' — its own name was in the command that worked');
      } catch (e) {
        note('credit failed for ' + row.card.id + ': ' + String(e).slice(0, 60));
      }
      quiet();
    }
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
    row.n = 0; save(state);
    note('layer unreachable for ' + tool + ': ' + String(e).slice(0, 60));
    quiet();
  }

  row.n = 0;
  row.spoke = Date.now();
  row.task = task;

  // The refusal is the most expensive thing this layer can say — two model
  // houses have to agree before it does — so it is never softened and never
  // buried under a table of cards.
  if (d && d.noFit) {
    row.card = null;
    save(state);
    note('NO-FIT for ' + tool + ' — the registry holds nothing for this');
    const why = String(d.noFit.why || '').trim();
    quiet('WAITLAYER · ' + tool + ' упал ' + THRESHOLD + ' раз(а). Слой посмотрел реестр: '
      + 'ничего подходящего нет' + (why ? ' — ' + why.slice(0, 120) : '.'));
  }

  const cards = ((d && d.proposals) || []).slice(0, 3);
  if (!cards.length) { save(state); quiet(); }
  const best = cards[0];
  // Remembered so the next success can be checked against it: a suggestion the
  // layer cannot recognise afterwards can never be proved to have helped.
  row.card = { id: best.card.id, name: String(best.card.title || '') };
  row.credited = 0;
  save(state);
  note('DEALT ' + best.card.id + ' after ' + tool + ' failed ' + THRESHOLD + ' times');
  const name = String(best.card.title || best.card.id).slice(0, 40);
  const others = cards.slice(1)
    .map((p) => String(p.card.title || p.card.id).slice(0, 24)).join(', ');
  // НЕ `note`: так называется функция журнала выше, и локальная переменная с тем
  // же именем затеняла её на всю функцию — вызов note('DEALT ...') несколькими
  // строками выше падал в temporal dead zone, а общий catch превращал это в
  // тихое молчание. Совет пропал целиком, и ни одна строка об этом не сказала.
  let line = 'WAITLAYER · ' + tool + ' упал ' + THRESHOLD + ' раз(а) подряд. '
    + 'Совет предлагает: ' + name + ' — ' + String(best.pitch || '').slice(0, 100);
  if (others) line += ' · ещё: ' + others;
  line += ' · стол: ' + SITE + '/#/t/' + encodeURIComponent(task.slice(0, 200));
  quiet(line);
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
  // Ошибка ЗАПИСЫВАЕТСЯ, а не только глотается. Этот catch однажды превратил
  // ReferenceError в тихое `{}`: совет исчез целиком, хук выглядел исправным, и
  // поймали это только тесты. Молчать в чужой сессии он обязан — но молчать
  // БЕССЛЕДНО не должен, иначе поломку нельзя отличить от «нечего сказать».
  main(payload).catch((e) => {
    const trace = String((e && e.stack) || e).replace(/\s+/g, ' ');
    note('BROKEN: ' + trace.slice(0, 200));
    quiet();
  });
});
// A hook that hangs holds up the session; the layer is never worth that.
setTimeout(() => quiet(), TIMEOUT + 4000).unref();

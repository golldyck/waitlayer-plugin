# WAITLAYER — the council, as a Claude Code plugin

Three real MCP servers dealt for whatever you are about to do, argued over by
four scouts with their own instincts, each card carrying the line that installs
it — and a plain **"none of these does this job"** when the registry holds
nothing that does it.

The cards come from a live mirror of the MCP registry (27,187 servers at the
time of writing), not from anybody's memory of what exists.

## Install

```
/plugin marketplace add golldyck/waitlayer-plugin
/plugin install waitlayer@waitlayer
```

That is the whole install. It brings:

- the **`waitlayer` MCP server** over HTTP, so your agent can deal a table for
  itself: `convene_council`, `verify_server`, `field_read`, `record_help`
  (three of them only read; the fourth writes and says so in its annotations);
- three commands for the person at the keyboard: `/waitlayer:council`,
  `/waitlayer:wait`, `/waitlayer:verify`.

Nothing is written into your `settings.json`, and nothing is installed from the
registry on your behalf — the layer deals cards, you decide whether to sit down.

## What this plugin does NOT bring

**The status line.** The terminal half of WAITLAYER — three cards printed under
whatever you last asked, refreshed in the background, with the verdict on top —
is a `statusLine` command, and a status line is a setting rather than a plugin
surface. It comes from the installer instead:

```
curl -fsSL https://future-assembly-483c0f.vibe.commonsmade.com/init.py | python -
```

The installer keeps any status line you already have: it runs yours first and
writes the table underneath, so nobody loses their own line to it.

## The one rule worth knowing

A refusal is the most expensive thing this layer says, so it is the one thing it
will not fake. Two independent model houses have to agree before the line
"none of these does this job" appears; one voice, or two that disagree, and the
layer says nothing at all rather than guessing. When the free model tiers are
spent there is nobody to ask, and it says nothing then too — silence here means
*no verdict was reached*, never *the table is fine*.

## The council arrives on its own, at the third failure

Everything above has to be summoned. This does not.

A hook counts consecutive failures of the same tool, and on the **third** — once
is noise, twice is bad luck, three times is a wall — it asks the layer for three
real servers for *that error* and prints one line:

```
WAITLAYER · Bash упал 3 раз(а) подряд. Совет предлагает:
io.github.MukundaKatta/shellquote-mcp — Your unterminated string is a quoting
nightmare; this tool escapes bash args safely. · ещё: SandboxAPI, Shell Exec
```

Everything else is a reason **not** to speak, because a layer that talks during a
healthy run is noise the user pays for and then learns to ignore:

* a success clears the count — three failures with a success between them is
  ordinary work, not a wall;
* counts are per tool and per session, so unrelated failures never add up;
* nothing is said twice within fifteen minutes;
* a subagent's failures stay the subagent's business;
* an unreachable layer says nothing at all — that is not your problem right now;
* a **no-fit verdict is passed through as a refusal**, never softened into a
  table of cards nobody asked for.

Knobs: `WAITLAYER_STUCK_AT` (3), `WAITLAYER_STUCK_COOLDOWN` (900 s),
`WAITLAYER_STUCK_TIMEOUT` (12 s), `WAITLAYER_URL`.

**Why the hook is Node and not Python.** The first version was Python and could
not ship: on Windows `python` and `python3` are the WindowsApps stubs, which
print the word `Python` to stdout and exit 49 without reading stdin — so the
hook emitted that word where the harness expects JSON, in someone else's
session. Claude Code is itself a Node program, so every machine that can install
this plugin already has the one interpreter this needs.

Tests: `python test_stuck.py` — 49 checks, the layer replaced by a local server
so the suite never burns the model keys the live site shares.

## What leaves your machine

Only when a tool has failed three times in a row, and at most once every fifteen
minutes, the hook sends **one line** to the layer: the tool's name and the last
error line of that failure, capped at 180 characters, as
`GET /api/council?task=...`. Nothing else — not your prompt, not your code, not
the command, not the rest of the output, and no identifier for you or the
session. Successful runs send nothing at all.

That line is **scrubbed before it is sent**, because the last line of a failure
is exactly where credentials turn up: a failed `curl` prints its own
`?api_key=`, an HTTP debug dump prints `Authorization: Bearer ...`, a database
driver prints its connection string. Removed by shape, not by keyword:

| in the error line | what is sent |
|---|---|
| `...charges?api_key=sk_live_51H8x...` | `...charges?<redacted>` |
| `Authorization: Bearer eyJhbGciOi...` | `Authorization: Bearer <redacted>` |
| `GROQ_API_KEY=gsk_abcdef...` | `GROQ_API_KEY=<redacted>` |
| `open 'C:\Users\yourname\notes.txt'` | `open '~\notes.txt'` |
| `mail to you@example.com bounced` | `mail to <email> bounced` |
| any 32+ hex run, JWT, or PEM block | `<redacted>` |

Ordinary error text is left alone — `error: unterminated string literal at line
42` arrives exactly as written, because a scrubber that redacts everything
leaves the layer nothing to work with. Eighteen of the checks in
`test_stuck.py` are about this, and they assert both halves: that the line was
really transmitted, and that the secret in it was not.

Turn the whole thing off by removing the hook from `hooks/hooks.json`, or point
it somewhere else with `WAITLAYER_URL` (a local mirror works: `http://` is
allowed on purpose). `WAITLAYER_STUCK_AT` changes the three-failure threshold,
`WAITLAYER_STUCK_COOLDOWN` the fifteen minutes.

## The loop closes: the layer learns what actually helped

A card is credited **only when the session really ran it**. The hook remembers
which server it suggested; when a later command succeeds *and that command
contains the server's own id or its distinctive name*, it posts the help and
confirms it, so the public Helpers table is ranked by confirmed use.

Confirming on mere success would rank that table by coincidence — the user may
simply have fixed it themselves — so the weaker rule is deliberately not used.
Credit is given once per suggestion, never twice.

`~/.claude/waitlayer-stuck.log` says what the layer did, one line per firing:

```
09-08 11:45:26  DEALT io.github.MukundaKatta/shellquote-mcp after Bash failed 3 times
09-08 11:47:02  CREDIT io.github.MukundaKatta/shellquote-mcp — its own name was in the command that worked
09-08 12:03:11  NO-FIT for Edit — the registry holds nothing for this
```

Breakage is written there too. That is not decoration: a `ReferenceError` inside
this hook once turned into a silent `{}` — the advice vanished entirely while the
hook looked healthy, and only the suite caught it. Silence in someone else's
session is the contract; **traceless** silence is a bug.

Tests: `python test_stuck.py` — 31 checks.

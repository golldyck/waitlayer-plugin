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

Tests: `python test_stuck.py` — 23 checks, the layer replaced by a local server
so the suite never burns the model keys the live site shares.

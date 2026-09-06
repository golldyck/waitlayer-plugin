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

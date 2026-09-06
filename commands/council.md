---
description: Deal three real MCP servers for what you are about to do, then install the one you pick
argument-hint: [what you are about to do]
---

Convene the WAITLAYER council for: $ARGUMENTS

If the arguments are empty, use the task I described most recently in this
conversation, and say which sentence you used.

1. Call `convene_council` on the `waitlayer` MCP server. Say which server
   answered — if it is not connected, say so and stop rather than describing
   MCP servers from memory. The point of this layer is that the cards come from
   a live mirror of the registry, not from anybody's recollection.

2. **If a no-fit verdict came back, say it FIRST, in its own words, before the
   cards.** Two independent model houses have to agree before the layer
   refuses, so a refusal is the most expensive thing it can say. Do not soften
   it, do not bury it under the table, and do not go hunting for a fourth
   option to make the hand look better. "No server in the registry does this
   job" is a complete answer; the three cards under it are only the closest it
   holds. Silence is not the same as approval: when no verdict comes back it
   means none was reached, not that the table fits.

3. Show the three cards as a compact numbered list: scout, server, hosted or
   package, version. Then one line of what they hold against each other — the
   argument is the point, not decoration.

4. Call `verify_server` on the top card and print its verdict verbatim. A
   registry entry is a claim; an answer from the server itself is evidence. If
   nothing it exposes touches the task, say that plainly before I decide.

5. Ask which number to take, and wait. **Never install anything before I pick a
   number.**

6. When I answer with a number: run that card's install line with Bash, confirm
   with `claude mcp list`, remind me that a running session needs `/mcp` →
   Reconnect before the new tools appear, and call `record_help` with the
   server id and one line on what it is for.

Step 6 is not bookkeeping. `record_help` is the only thing that makes the
Helpers table count servers by confirmed use rather than by clicks, and a
council that deals a table and never hears whether it helped is a card trick.

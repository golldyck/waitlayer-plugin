---
description: Ask a server what it actually exposes before you trust its description
argument-hint: [registry id] [the job you need it for]
---

Verify a server before trusting it: $ARGUMENTS

Call the `verify_server` tool on the `waitlayer` MCP server. The first argument
is the registry id (something like `com.pdfia/pdf-tools`); the rest, if given,
is the job it is wanted for.

Report exactly what the server itself answered:

- whether it replied at all — a registry entry is a claim, an answer is
  evidence, and a server that does not answer has only the claim;
- the tools it exposes, by name;
- which of them, if any, touch the words of the job. If none do, say that. A
  server that sits next to the task is not the answer to it, and saying so is
  the whole reason to check before installing.

Do not install it. Do not run the install line. If the `waitlayer` server is not
connected, say so and stop rather than describing the server from memory.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **TSP**. Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "master"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/TSP/context` | Codebase overview, check index freshness |
| `gitnexus://repo/TSP/clusters` | All functional areas |
| `gitnexus://repo/TSP/processes` | All execution flows |
| `gitnexus://repo/TSP/process/{name}` | Step-by-step execution trace |

<!-- gitnexus:end -->

# Mandatory Read Order
- Read `TSP_MODUL_DEEP_CLEAN_REVIEW.md` before broad code exploration.
- Read `dokumentasi/ARSITEKTUR.md`, `dokumentasi/DEPENDENCY_MAP.md`, and `dokumentasi/FUNCTION_MAPPING.md` before changing GAS runtime behavior.
- Read `graphify-out/FUNCTION_INDEX.md` when available before opening large files such as `Active/Index.html`, `Active/Scanner.html`, or Flutter screens.
- Treat `Active/` and `android modif/TSPModul/` as active source. Treat `android/TSPModul/` as legacy/reference unless the task explicitly targets it.
- After meaningful source or documentation changes, run `.\sync-graphify.ps1`.

# Mandatory End-of-Task Workflow (PUSH + DEPLOY + COMMIT, EVERY TIME)
At the end of **every** coding fix or update — no exceptions unless the user explicitly says to hold off — run all three of the following, in this order:

1. **Deploy**: `npm run deploy`. NEVER use only `clasp push` — it only updates `@HEAD` (`/dev`) and leaves the production URL (`/exec`) unchanged. `npm run deploy` builds docs, force-pushes code, and promotes the production Web App deployment in one pass.
2. **Commit and push backup**: commit intended changes with a clear message, then run `git push origin master`. A local commit alone is not a backup. Don't batch unrelated changes into one commit.
3. **Sync safely**: before integrating remote history, run `git fetch origin`, inspect ahead/behind and changed paths, then resolve conflicts deliberately without overwriting a validated connection design with an older local or remote variant.
4. Confirm deployment (when GAS changed), commit, and remote push all succeeded before reporting the task done.

This applies automatically after finishing implementation work — don't wait to be asked separately for deploy vs. commit each time. If a change is exploratory/WIP and not meant to ship yet, say so instead of silently skipping this workflow.

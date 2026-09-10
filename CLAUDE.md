<!-- monorepo-global-setup -->
## Monorepo Global Setup — WAJIB

Folder ini bagian dari **monorepo**. GitNexus, Graphify, LangGraph, dan Python venv adalah **setup global di root workspace** — BUKAN di folder ini.

- Shared module: `shared_core/core_setup.py` → `init_gitnexus()`, `init_graphify()`, `init_langgraph()`, `init_all()`
- Python venv tunggal: `<root>/venv`
- Dependency tunggal: `<root>/requirements.txt`
- GitNexus CLI global: `<root>/node_modules/gitnexus/dist/cli/index.js` (install sekali: `npm install gitnexus` di root)

**DILARANG** membuat venv/requirements/setup GitNexus/Graphify/LangGraph baru di sub-folder ini. Setup lokal hanya untuk hal spesifik project (mis. script mirror/deploy/tools project). Selalu import dari `shared_core`.

<!-- /monorepo-global-setup -->

<!-- canonical-locations -->
## Lokasi Kanonik — SATU-SATUNYA YANG BENAR

Semua path di bawah ini bersifat mutlak. Kalau menemukan rujukan lain di
dokumen mana pun, dokumen itu yang salah dan harus diperbaiki.

| Apa | Path |
| --- | --- |
| Root project (`<project>`) | `C:\Users\imann\SYN DAM\SynologyDrive\0. TSP MODUL` |
| Root monorepo (`<root>`) | `C:\Users\imann\SYN DAM\SynologyDrive` |
| Sumber GAS yang dipush clasp | `<project>\Active\` |
| Konfigurasi clasp | `<project>\Active\.clasp.json` (`rootDir: "."`) |
| Remote git | <https://github.com/imannurchaedi-max/TSP>, branch `master` |

`<root>` yang disebut di bagian Monorepo Global Setup adalah `C:\Users\imann\SYN DAM\SynologyDrive`,
yaitu satu tingkat DI ATAS root project. Jadi `<root>/venv`,
`<root>/requirements.txt`, dan `<root>/node_modules/gitnexus` berada di luar
folder project ini.

### Folder lama sudah TIDAK berlaku

```text
C:\Users\imann\SynologyDrive\0. APP SCRIPT\0. TSP MODUL
```

Folder itu masih ada di disk beserta `.git`-nya, tetapi **bukan sumber
kebenaran** dan tidak boleh dipakai, dibaca sebagai acuan, atau dipush.
Seluruh pekerjaan sudah dimigrasikan ke root project di atas pada
9 September 2026. Folder lama dipertahankan hanya sebagai cadangan dingin.

<!-- /canonical-locations -->

<!-- gitnexus-runner -->
## Runner GitNexus — SATU SAJA

Ada dua instalasi GitNexus di mesin ini, dan keduanya TIDAK setara:

| Instalasi | Status |
| --- | --- |
| `<root>/node_modules/gitnexus` | **KANONIK** — punya lockfile, 10.616 artefak |
| npm global (`AppData/Roaming/npm`) | Jangan dipakai untuk analyze — tanpa lockfile, 10.764 artefak |

Digest `dependencyRuntime` keduanya berbeda, sehingga **setiap pergantian runner
memaksa GitNexus membangun ulang index dari nol**. Menyamakan nomor versi saja tidak
cukup; sudah dicoba pada 9 September 2026 dan digest tetap berbeda.

Selalu panggil yang kanonik. `sync-graphify.ps1` dan `tools/verify_env.py` sudah
mengarah ke sana:

```powershell
node "<root>\node_modules\gitnexus\dist\cli\index.js" analyze --no-stats --skip-skills --pdg
```

**JANGAN** pakai `npx gitnexus`, `gitnexus` dari PATH, atau `node .gitnexus/run.cjs`
untuk analyze di workspace ini. `run.cjs` sengaja me-resolve lewat npx/pnpm dlx/bunx
sehingga bisa mendarat di instalasi global — berguna untuk bootstrap di mesin baru,
tetapi di sini justru menstempel index dengan runner yang salah dan memicu rebuild
penuh berikutnya. Catatan ini menang atas anjuran `run.cjs` di bagian GitNexus di atas,
yang ditulis untuk kasus umum tanpa CLI monorepo.

Periksa dengan `python tools/verify_env.py` — bagian GitNexus menampilkan identitas
runner yang mengindeks dan yang sedang dipakai; keduanya harus sama, dan digest
`dependencyRuntime`-nya harus identik.

Analyzer kadang gagal dengan *"Analyzer dependency runtime changed while its identity
was being computed"*. Itu race saat GitNexus menghitung hash folder paketnya sendiri di
dalam SynologyDrive; ulangi saja perintahnya (`sync-graphify.ps1` sudah retry 4x).

### Kalau `explain` / `pdg_query` menjawab "no PDG layer"

Itu server MCP yang memegang handle index lama, bukan lapisan PDG yang hilang.
Gejalanya: `analyze --pdg` sukses dan `node .gitnexus/run.cjs status` menunjukkan
commit yang benar, tetapi tool MCP tetap kosong atau memberi hasil yang sudah usang
(mis. masih memunculkan simbol dari `android/TSPModul` yang sudah dikecualikan).

Perbaikannya: **mulai ulang server MCP GitNexus**. Sebelum itu, jangan percayai hasil
MCP — pakai CLI langsung.

### `.gitnexusignore`

`android/TSPModul/` dikecualikan dari pengindeksan. Pohon itu kembaran nyaris utuh dari
`android modif/TSPModul` (40 dari 56 file `.dart` identik byte-per-byte), dan selama
ikut terindeks setiap penelusuran simbol mengembalikan hasil ganda dari dua path.

<!-- /gitnexus-runner -->




<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **TSP**.

> Index stale? Run `node .gitnexus/run.cjs analyze --index-only` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? Bootstrap with `npx`, `bunx`, or `pnpm dlx` — e.g. `bunx gitnexus@latest analyze` (npm 11 npx crash; #1939).

## Always Do

- **MUST run impact analysis before editing.** Use `impact({target: "symbolName", direction: "upstream"})` (MCP) or `node .gitnexus/run.cjs impact "symbolName" --direction upstream --repo .` (CLI fallback); report callers, processes, and risk. Never substitute grep for graph analysis. For unified PDG impact, add `mode: "pdg"` with optional `line: <N>` — it returns statement-level `affectedStatements` over CDG + REACHING_DEF and inter-procedural symbols in `interproceduralByDepth`/`byDepth`; no-layer/degraded PDG results are UNKNOWN-risk notes (`--pdg` layer). CLI equivalent: `node .gitnexus/run.cjs impact "symbolName" --direction upstream --mode pdg --line <N> --repo .`.
- **MUST analyze graph changes before committing.** Use `detect_changes({scope: "all"})` (MCP) or `node .gitnexus/run.cjs detect-changes --scope all --repo .` (CLI fallback). `partial: true` or `truncated: true` is not a clean check — a zero means unseen, not unaffected; re-run it. For regression review: `detect_changes({scope: "compare", base_ref: "master"})` or `node .gitnexus/run.cjs detect-changes --scope compare --base-ref "master" --repo .`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- **MUST treat `risk: UNKNOWN` as unresolved, not as low.** An empty caller set is not evidence the symbol is unused — it can also mean the callers are not resolvable by the index (plain-object property access, dynamic dispatch, cross-language calls). `impact` pairs `UNKNOWN` with a `riskNote` saying so. Confirm with a text search before treating the symbol as safe to change or delete; do not proceed on the strength of a zero.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).
- For control/data dependence, `pdg_query({mode: "controls", target: "fileOrSymbol"})` answers "under what condition does X run?" (CDG, incl. guard clauses) and `pdg_query({mode: "flows", target, variable})` traces "where does variable Y flow?" (REACHING_DEF). `--pdg` layer.

## Never Do

- NEVER edit a function, class, or method before MCP/CLI impact analysis.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis, and never read `UNKNOWN` as an all-clear — it means the walk could not answer, which is the one verdict that requires confirming by other means.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit before MCP/CLI graph change analysis.

## Resources

| Resource | Use for |
| --- | --- |
| `gitnexus://repo/TSP/context` | Codebase overview, check index freshness |
| `gitnexus://repo/TSP/clusters` | All functional areas |
| `gitnexus://repo/TSP/processes` | All execution flows |
| `gitnexus://repo/TSP/process/{name}` | Step-by-step execution trace |

<!-- gitnexus:end -->

# Mandatory Read Order
- Read `TSP_MODUL_DEEP_CLEAN_REVIEW.md` before broad code exploration.
- Read `dokumentasi/AUDIT_INTEGRITAS.md` before touching Apps Script auth, stock math, or the reprint/retur flow. Findings marked `TERBUKA` are known, unfixed defects -- do not re-report them as new, and do not write code that relies on behaviour already recorded there as wrong.
- Read `dokumentasi/ARSITEKTUR.md`, `dokumentasi/DEPENDENCY_MAP.md`, and `dokumentasi/FUNCTION_MAPPING.md` before changing GAS runtime behavior.
- Read `graphify-out/FUNCTION_INDEX.md` when available before opening large files such as `Active/Index.html`, `Active/Scanner.html`, or Flutter screens.
- Treat `Active/` and `android modif/TSPModul/` as active source. Treat `android/TSPModul/` as legacy/reference unless the task explicitly targets it.
- After meaningful source or documentation changes, run `.\sync-graphify.ps1`.

# Mandatory End-of-Task Workflow (PUSH + DEPLOY + COMMIT, EVERY TIME)
At the end of **every** coding fix or update — no exceptions unless the user explicitly says to hold off — run all three of the following, in this order:

1. **Deploy**: `npm run deploy`. NEVER use only `clasp push` — it only updates `@HEAD` (`/dev`) and leaves the production URL (`/exec`) unchanged. `npm run deploy` builds docs, force-pushes code, prunes stale remote files, and promotes the production Web App deployment in one pass.
   **Beware:** `clasp push` never deletes. A file removed from `Active/` stays alive in Apps Script and keeps executing, and `clasp status` will not show it — `clasp push` still reports `Script is already up to date`. `npm run deploy` closes this by calling `npm run clasp:prune:apply` (see `tools/clasp_prune.py`). Outside the deploy flow, run `npm run clasp:prune` yourself after deleting any file.
2. **Commit and push backup**: commit intended changes with a clear message, then run `git push origin master`. A local commit alone is not a backup. Don't batch unrelated changes into one commit.
3. **Sync safely**: before integrating remote history, run `git fetch origin`, inspect ahead/behind and changed paths, then resolve conflicts deliberately without overwriting a validated connection design with an older local or remote variant.
4. Confirm deployment (when GAS changed), commit, and remote push all succeeded before reporting the task done.

This applies automatically after finishing implementation work — don't wait to be asked separately for deploy vs. commit each time. If a change is exploratory/WIP and not meant to ship yet, say so instead of silently skipping this workflow.

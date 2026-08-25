$ErrorActionPreference = "Stop"

Write-Host "=== Step 1: Function index ==="
node tooling/build-function-index.cjs

Write-Host ""
Write-Host "=== Step 2: Documentation/code graph build ==="
npm run docs:build

Write-Host ""
Write-Host "=== Step 3: GitNexus re-index ==="
$env:GITNEXUS_MAX_FILE_SIZE = "2048"
gitnexus analyze --no-stats --skip-skills

Write-Host ""
Write-Host "=== Step 4: Graphify-lite report ==="
New-Item -ItemType Directory -Force -Path graphify-out | Out-Null
$graphJson = Join-Path (Get-Location) "dokumentasi\code_graph.json"
if (Test-Path $graphJson) {
  $json = Get-Content $graphJson -Raw | ConvertFrom-Json
  $nodes = if ($json.nodes) { $json.nodes.Count } else { 0 }
  $edges = if ($json.edges) { $json.edges.Count } else { 0 }
} else {
  $nodes = 0
  $edges = 0
}
$report = @"
# TSP Modul Graph Report

Generated: $(Get-Date -Format o)

Canonical source:

- Active/
- android modif/TSPModul/lib/
- dokumentasi/

Function index:

- graphify-out/FUNCTION_INDEX.md
- graphify-out/function-index.json

Generated code graph:

- dokumentasi/code_graph.json
- nodes: $nodes
- edges: $edges

Operational rule: use FUNCTION_INDEX first, then open targeted files only.
"@
Set-Content -Path "graphify-out\GRAPH_REPORT.md" -Value $report -Encoding UTF8

Write-Host ""
Write-Host "Sync complete: function index, docs graph, GitNexus, and Graphify-lite report refreshed."

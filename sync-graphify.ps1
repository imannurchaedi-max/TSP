$ErrorActionPreference = "Stop"

Write-Host "=== Step 1: Function index ==="
node tooling/build-function-index.cjs

Write-Host ""
Write-Host "=== Step 2: Documentation/code graph build ==="
npm run docs:build

Write-Host ""
Write-Host "=== Step 3: GitNexus re-index (GLOBAL) ==="
$root = $PSScriptRoot
$wsRoot = Split-Path -Parent $PSScriptRoot
# GitNexus dipanggil lewat shared_core (aturan Monorepo Global Setup), dengan
# retry karena analyzer-nya kadang gagal dengan
#   "Analyzer dependency runtime changed while its identity was being computed"
# Itu race condition: GitNexus menghitung hash identitas atas folder paketnya
# sendiri di <root>/node_modules/gitnexus, sementara folder itu berada di dalam
# SynologyDrive dan bisa disentuh proses sinkronisasi saat hash sedang dihitung.
# Terukur pada 9 September 2026: 3 invokasi identik -> 2 gagal, 1 berhasil.
# Bukan kesalahan konfigurasi, jadi retry adalah penanganan yang tepat.
$py = Join-Path $wsRoot "venv\Scripts\python.exe"
$env:PYTHONPATH = @($wsRoot, $env:PYTHONPATH) -join [IO.Path]::PathSeparator
$ok = $false
foreach ($attempt in 1..4) {
  & $py -c "from shared_core.core_setup import run_gitnexus; run_gitnexus('analyze', '--no-stats', '--skip-skills', '--pdg', repo_root=r'$root')"
  if ($LASTEXITCODE -eq 0) { $ok = $true; break }
  Write-Host "  GitNexus analyze gagal (percobaan $attempt), mengulang..."
  Start-Sleep -Seconds 3
}
if (-not $ok) { throw "GitNexus analyze gagal setelah 4 percobaan." }

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

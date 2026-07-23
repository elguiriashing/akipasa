param(
  [string]$OutputRoot = (Join-Path $PSScriptRoot "..\backups")
)

$ErrorActionPreference = "Stop"
$databaseUrl = $env:AKIPASA_BACKUP_DATABASE_URL
if ([string]::IsNullOrWhiteSpace($databaseUrl)) {
  throw "Set AKIPASA_BACKUP_DATABASE_URL to the production session-pooler connection string."
}
if ($databaseUrl -notmatch "vhpbvcfkcteswlsdjrfl") {
  throw "The backup URL does not identify the expected AkiPasa Supabase project."
}

$stamp = [DateTime]::UtcNow.ToString("yyyyMMddTHHmmssZ")
$destination = Join-Path (Resolve-Path (New-Item -ItemType Directory -Force $OutputRoot)) $stamp
New-Item -ItemType Directory -Force $destination | Out-Null

& npx.cmd --yes supabase@latest db dump --db-url $databaseUrl -f (Join-Path $destination "roles.sql") --role-only
if ($LASTEXITCODE -ne 0) { throw "Role backup failed." }
& npx.cmd --yes supabase@latest db dump --db-url $databaseUrl -f (Join-Path $destination "schema.sql")
if ($LASTEXITCODE -ne 0) { throw "Schema backup failed." }
& npx.cmd --yes supabase@latest db dump --db-url $databaseUrl -f (Join-Path $destination "data.sql") --use-copy --data-only -x "storage.buckets_vectors" -x "storage.vector_indexes"
if ($LASTEXITCODE -ne 0) { throw "Data backup failed." }

$files = Get-ChildItem -LiteralPath $destination -File
if ($files.Count -ne 3 -or ($files | Where-Object Length -eq 0)) {
  throw "Backup verification failed: expected three non-empty SQL files."
}
$files | Get-FileHash -Algorithm SHA256 |
  Select-Object Hash, Path |
  ConvertTo-Json |
  Set-Content -LiteralPath (Join-Path $destination "sha256.json") -Encoding utf8

Write-Output "Logical backup created and checksummed at $destination"

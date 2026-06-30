<#
Remove committed MongoDB data files from the repo and disk.
Run this from the repository root in PowerShell.
#>

Write-Host "Removing committed MongoDB data from git index and disk..."

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Error "git is not available in PATH. Install Git or run these commands manually."
  exit 1
}

git rm -r --cached backend/mongodb_data || Write-Host "Note: git rm returned non-zero (may already be removed)"
Write-Host "Removing on-disk files (this permanently deletes them)."
Remove-Item -LiteralPath "backend/mongodb_data" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Done. Commit the changes: git commit -m 'Remove committed MongoDB data'"
<#
.SYNOPSIS
  Waits for one commit's Vercel deployment to finish, then plays a sound.

.DESCRIPTION
  Vercel's GitHub integration reports every deployment back as a commit status on the
  pushed SHA, under the context "Vercel": pending while it builds, then success or
  failure. That status is the signal this watches, which means it needs no Vercel token
  or CLI at all -- just the `gh` login that is already set up on this machine.

  Deliberately a DIFFERENT sound from the "Windows Ding" that Claude Code's own Stop and
  Notification hooks play (see ~/.claude/settings.json), so "the deploy is live" is
  distinguishable by ear from "Claude finished talking" without looking at the screen.

  Meant to be launched detached and forgotten about by .git/hooks/pre-push -- it polls
  quietly in the background and its only output is the sound and a line in the log file.

.PARAMETER Sha
  The commit to watch. Full 40-character SHA.

.PARAMETER Repo
  owner/name. Defaults to whatever `gh` resolves for the current directory.

.PARAMETER TimeoutSeconds
  Give up silently after this long. A push to a branch Vercel doesn't build never gets a
  status at all, and that is not worth making a noise about -- it just ends up in the log.

.EXAMPLE
  .\notify-vercel-deploy.ps1 -Sha (git rev-parse HEAD)
#>
param(
  [Parameter(Mandatory = $true)][string]$Sha,
  [string]$Repo,
  [int]$TimeoutSeconds = 900,
  [int]$PollSeconds = 10
)

$ErrorActionPreference = 'Stop'

# Ready, and something clearly celebratory rather than another neutral blip; failed, and
# something that plainly reads as wrong so a broken build isn't mistaken for a live one.
$SoundReady  = 'C:\Windows\Media\tada.wav'
$SoundFailed = 'C:\Windows\Media\Windows Critical Stop.wav'

$LogFile = Join-Path $env:TEMP 'vercel-deploy-watch.log'

function Write-Log([string]$Message) {
  $line = "{0}  {1}  {2}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Sha.Substring(0, [Math]::Min(7, $Sha.Length)), $Message
  Add-Content -Path $LogFile -Value $line -Encoding utf8
}

function Play-Sound([string]$Path) {
  if (-not (Test-Path $Path)) { Write-Log "sound missing: $Path"; return }
  try { (New-Object System.Media.SoundPlayer $Path).PlaySync() }
  catch { Write-Log "sound failed: $($_.Exception.Message)" }
}

if (-not $Repo) {
  try {
    $Repo = ((& gh repo view --json nameWithOwner) -join '' | ConvertFrom-Json).nameWithOwner
  } catch {
    Write-Log 'could not resolve repo via gh; exiting'
    exit 1
  }
}

Write-Log "watching $Repo"
$deadline = (Get-Date).AddSeconds($TimeoutSeconds)

while ((Get-Date) -lt $deadline) {
  $state = $null
  try {
    # Filtered here rather than with `gh --jq`: Windows PowerShell strips the inner double
    # quotes out of a jq expression on its way to a native exe, so `select(.context ==
    # "Vercel")` reaches jq as a call to an undefined function. Parsing the JSON in
    # PowerShell sidesteps the quoting entirely.
    $raw = & gh api "repos/$Repo/commits/$Sha/status"
    if ($LASTEXITCODE -eq 0 -and $raw) {
      $statuses = (($raw -join "`n") | ConvertFrom-Json).statuses
      # GitHub returns the combined status list most-recent-first, so the first Vercel entry
      # is the current one and any others behind it are a retried build's history.
      $vercel = @($statuses | Where-Object { $_.context -eq 'Vercel' })
      if ($vercel.Count -gt 0) { $state = $vercel[0].state }
    }
  } catch {
    # A transient network/API blip shouldn't end the watch -- just try again next tick.
    Write-Log "poll error: $($_.Exception.Message)"
  }

  switch ($state) {
    'success' { Write-Log 'READY'; Play-Sound $SoundReady;  exit 0 }
    'failure' { Write-Log 'FAILED'; Play-Sound $SoundFailed; exit 0 }
    'error'   { Write-Log 'ERRORED'; Play-Sound $SoundFailed; exit 0 }
  }

  Start-Sleep -Seconds $PollSeconds
}

# No sound on timeout: silence here means "nothing to report", which is the right outcome
# for a branch Vercel doesn't deploy. The log says what happened if anyone wonders.
Write-Log "gave up after ${TimeoutSeconds}s (last state: $(if ($state) { $state } else { 'none' }))"

# OneCLIQ installer for Windows: installs the `oqgit` command from npm.
#
#   irm https://onecliq-eta.vercel.app/install | iex
#
# Read it first if you like: this file is all it does. No admin rights needed.
$ErrorActionPreference = 'Stop'
$Pkg = if ($env:ONECLIQ_PACKAGE) { $env:ONECLIQ_PACKAGE } else { 'onecliq' }
$MinNode = 20

function Step($text) { Write-Host '  ' -NoNewline; Write-Host ([char]0x25C7) -ForegroundColor Magenta -NoNewline; Write-Host " $text" }
function Fail($text, [string[]]$hints) {
  Write-Host ''
  Write-Host "  x $text" -ForegroundColor Red
  foreach ($h in $hints) { Write-Host "    $h" }
  Write-Host ''
  throw 'oqgit was not installed.'
}

Write-Host ''
Write-Host '  ' -NoNewline
Write-Host ([string][char]0x2588 + [char]0x2580 + [char]0x2588 + ' ') -ForegroundColor DarkYellow -NoNewline
Write-Host ([string][char]0x2588 + [char]0x2580 + [char]0x2588 + ' ') -ForegroundColor Yellow -NoNewline
Write-Host ([string][char]0x2588 + [char]0x2580 + [char]0x2580 + ' ') -ForegroundColor Magenta -NoNewline
Write-Host ([string][char]0x2588 + ' ' + [char]0x2580 + [char]0x2588 + [char]0x2580) -ForegroundColor DarkMagenta
Write-Host '  ' -NoNewline
Write-Host ([string][char]0x2588 + [char]0x2584 + [char]0x2588 + ' ') -ForegroundColor DarkYellow -NoNewline
Write-Host ([string][char]0x2580 + [char]0x2580 + [char]0x2588 + ' ') -ForegroundColor Yellow -NoNewline
Write-Host ([string][char]0x2588 + [char]0x2584 + [char]0x2588 + ' ') -ForegroundColor Magenta -NoNewline
Write-Host ([string][char]0x2588 + '  ' + [char]0x2588 + ' ') -ForegroundColor DarkMagenta -NoNewline
Write-Host '  installer' -ForegroundColor DarkGray
Write-Host ''

# --- Node.js ----------------------------------------------------------------------
if (-not (Get-Command node -ErrorAction SilentlyContinue) -or -not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Fail "oqgit needs Node.js $MinNode or newer, and it isn't installed." @(
    'winget install OpenJS.NodeJS.LTS    (or download it from https://nodejs.org)',
    'Then open a new terminal and run this installer again.'
  )
}
$NodeMajor = [int](node -p "process.versions.node.split('.')[0]")
if ($NodeMajor -lt $MinNode) {
  Fail "oqgit needs Node.js $MinNode or newer (you have $(node -v))." @('Update Node.js from https://nodejs.org, then run this again.')
}
Step "Node.js $(node -v)"

# --- Install ------------------------------------------------------------------------
Step "Installing $Pkg..."
$out = & npm install -g $Pkg --no-fund --no-audit --loglevel=error 2>&1
if ($LASTEXITCODE -ne 0) {
  $out | Select-Object -Last 15 | ForEach-Object { Write-Host "    $_" }
  Fail "npm couldn't install $Pkg." @("Check your connection, or try: npm install -g $Pkg")
}

$prefix = (& npm prefix -g).Trim()
$shim = Join-Path $prefix 'oqgit.cmd'
$version = ''
try { $version = (& $shim --version 2>$null) } catch { }
if (-not $version) { Fail 'Installed, but oqgit did not start.' @("Try: npx $Pkg --help") }

Write-Host ''
Write-Host '  ' -NoNewline; Write-Host ([char]0x2714) -ForegroundColor Green -NoNewline; Write-Host " oqgit $version is installed."
Write-Host ''

# npm's global folder is normally on PATH; make sure, for this user, without admin rights.
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if (($env:Path -split ';') -notcontains $prefix) {
  if (($userPath -split ';') -notcontains $prefix) {
    [Environment]::SetEnvironmentVariable('Path', ($userPath.TrimEnd(';') + ';' + $prefix), 'User')
  }
  $env:Path = $env:Path.TrimEnd(';') + ';' + $prefix
  Write-Host "  Added $prefix to your PATH. Open a new terminal if oqgit isn't found." -ForegroundColor DarkGray
  Write-Host ''
}

Write-Host '  Try it:'
Write-Host '    oqgit sharkdp/bat          ' -NoNewline; Write-Host 'download the right file for this computer' -ForegroundColor DarkGray
Write-Host '    oqgit review 12            ' -NoNewline; Write-Host 'AI review of pull request 12 in this repo' -ForegroundColor DarkGray
Write-Host '    oqgit                      ' -NoNewline; Write-Host 'menu' -ForegroundColor DarkGray
Write-Host ''

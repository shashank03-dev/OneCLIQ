#!/bin/sh
# OneCLIQ installer for macOS and Linux: installs the `oqgit` command from npm.
#
#   curl -fsSL https://onecliq-eta.vercel.app/install | sh
#
# It never uses sudo. If npm's global folder isn't writable, it installs to ~/.local instead.
# Read it first if you like: this file is all it does.
set -eu

PKG="${ONECLIQ_PACKAGE:-onecliq}"
MIN_NODE=20

if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  B="$(printf '\033[1m')"; D="$(printf '\033[2m')"; R="$(printf '\033[0m')"
  E1="$(printf '\033[38;5;202m')"; E2="$(printf '\033[38;5;209m')"; L="$(printf '\033[38;5;147m')"; V="$(printf '\033[38;5;99m')"
  OK="$(printf '\033[38;5;114m')"; BAD="$(printf '\033[38;5;203m')"
else
  B=""; D=""; R=""; E1=""; E2=""; L=""; V=""; OK=""; BAD=""
fi

say() { printf '%s\n' "$*"; }
step() { printf '  %s◇%s %s\n' "$L" "$R" "$*"; }
fail() {
  printf '\n  %s✖ %s%s\n' "$BAD" "$1" "$R"
  shift
  for line in "$@"; do printf '    %s\n' "$line"; done
  printf '\n'
  exit 1
}

say ""
say "  ${E1}█▀█ ${E2}█▀█ ${L}█▀▀ ${V}█ ▀█▀${R}"
say "  ${E1}█▄█ ${E2}▀▀█ ${L}█▄█ ${V}█  █ ${R}  ${D}installer${R}"
say ""

# --- Node.js ----------------------------------------------------------------------
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  case "$(uname -s)" in
    Darwin) hint="brew install node    ${D}(or download it from https://nodejs.org)${R}" ;;
    *) hint="Install Node.js ${MIN_NODE}+ from https://nodejs.org or your package manager." ;;
  esac
  fail "oqgit needs Node.js ${MIN_NODE} or newer, and it isn't installed." "$hint" "Then run this installer again."
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if [ "$NODE_MAJOR" -lt "$MIN_NODE" ]; then
  fail "oqgit needs Node.js ${MIN_NODE} or newer (you have $(node -v))." "Update Node.js from https://nodejs.org, then run this again."
fi
step "Node.js $(node -v)"

# --- Install ------------------------------------------------------------------------
LOCAL=""
LOG="$(mktemp 2>/dev/null || echo "/tmp/onecliq-install.$$")"
step "Installing ${B}${PKG}${R}…"
if ! npm install -g "$PKG" --no-fund --no-audit --loglevel=error >"$LOG" 2>&1; then
  if grep -qiE 'EACCES|EPERM|permission denied' "$LOG"; then
    # npm's global folder belongs to root (a system Node): install for this user instead of asking for sudo.
    LOCAL="$HOME/.local"
    mkdir -p "$LOCAL/bin"
    step "No permission for npm's global folder; installing to ~/.local instead…"
    if ! npm install -g --prefix "$LOCAL" "$PKG" --no-fund --no-audit --loglevel=error >"$LOG" 2>&1; then
      sed 's/^/    /' "$LOG" | tail -n 15
      rm -f "$LOG"
      fail "npm couldn't install ${PKG}." "Check your connection, or try: npm install -g ${PKG}"
    fi
  else
    sed 's/^/    /' "$LOG" | tail -n 15
    rm -f "$LOG"
    fail "npm couldn't install ${PKG}." "Check your connection, or try: npm install -g ${PKG}"
  fi
fi
rm -f "$LOG"

BIN="${LOCAL:+$LOCAL/bin/}oqgit"
if [ -n "$LOCAL" ]; then
  VERSION="$("$BIN" --version 2>/dev/null || echo "")"
else
  VERSION="$(oqgit --version 2>/dev/null || echo "")"
  if [ -z "$VERSION" ] && [ -x "$(npm prefix -g 2>/dev/null)/bin/oqgit" ]; then VERSION="$("$(npm prefix -g)/bin/oqgit" --version 2>/dev/null || echo "")"; fi
fi
[ -n "$VERSION" ] || fail "Installed, but oqgit didn't start." "Try: npx ${PKG} --help"

printf '\n  %s✔%s %soqgit %s is installed.%s\n\n' "$OK" "$R" "$B" "$VERSION" "$R"

# --- PATH ---------------------------------------------------------------------------
if [ -n "$LOCAL" ]; then
  case ":$PATH:" in
    *":$LOCAL/bin:"*) ;;
    *)
      case "${SHELL:-}" in
        */zsh) RC="~/.zshrc" ;;
        */bash) RC="~/.bashrc" ;;
        */fish) RC="~/.config/fish/config.fish" ;;
        *) RC="your shell's startup file" ;;
      esac
      say "  One more step: add ~/.local/bin to your PATH (add this line to ${RC}):"
      say ""
      if [ "$RC" = "~/.config/fish/config.fish" ]; then
        say "    ${B}fish_add_path ~/.local/bin${R}"
      else
        say "    ${B}export PATH=\"\$HOME/.local/bin:\$PATH\"${R}"
      fi
      say ""
      ;;
  esac
fi

say "  Try it:"
say "    ${L}oqgit${R} sharkdp/bat          ${D}download the right file for this computer${R}"
say "    ${L}oqgit${R} review 12            ${D}AI review of pull request 12 in this repo${R}"
say "    ${L}oqgit${R}                      ${D}menu${R}"
say ""

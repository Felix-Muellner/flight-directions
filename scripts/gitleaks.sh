#!/usr/bin/env bash
# Runs gitleaks over the full git history. Downloads a pinned binary into
# .tools/ (gitignored) on first use so no global install is needed.
set -euo pipefail

VERSION="8.30.1"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BIN="$ROOT/.tools/gitleaks-$VERSION"

if [ ! -x "$BIN" ]; then
  case "$(uname -s)" in
    Linux) os=linux ;;
    Darwin) os=darwin ;;
    *) echo "Unsupported OS: $(uname -s)" >&2; exit 1 ;;
  esac
  case "$(uname -m)" in
    x86_64 | amd64) arch=x64 ;;
    arm64 | aarch64) arch=arm64 ;;
    *) echo "Unsupported arch: $(uname -m)" >&2; exit 1 ;;
  esac
  mkdir -p "$ROOT/.tools"
  url="https://github.com/gitleaks/gitleaks/releases/download/v$VERSION/gitleaks_${VERSION}_${os}_${arch}.tar.gz"
  curl -sSfL "$url" | tar -xz -C "$ROOT/.tools" gitleaks
  mv "$ROOT/.tools/gitleaks" "$BIN"
fi

exec "$BIN" git --redact --verbose "$ROOT"

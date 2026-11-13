#!/usr/bin/env bash
# Runs gitleaks over the full git history. Downloads a pinned binary into
# .tools/ (gitignored) on first use so no global install is needed. The
# downloaded archive is checked against a pinned SHA-256 before it is unpacked.
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
  # From gitleaks_${VERSION}_checksums.txt of the GitHub release.
  # Update these together with VERSION.
  case "${os}_${arch}" in
    linux_x64) sha256="551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb" ;;
    linux_arm64) sha256="e4a487ee7ccd7d3a7f7ec08657610aa3606637dab924210b3aee62570fb4b080" ;;
    darwin_x64) sha256="dfe101a4db2255fc85120ac7f3d25e4342c3c20cf749f2c20a18081af1952709" ;;
    darwin_arm64) sha256="b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5" ;;
  esac

  mkdir -p "$ROOT/.tools"
  archive="$(mktemp "$ROOT/.tools/gitleaks-download.XXXXXX")"
  trap 'rm -f "$archive"' EXIT
  url="https://github.com/gitleaks/gitleaks/releases/download/v$VERSION/gitleaks_${VERSION}_${os}_${arch}.tar.gz"
  curl -sSfL -o "$archive" "$url"

  if command -v sha256sum >/dev/null 2>&1; then
    actual="$(sha256sum "$archive" | cut -d' ' -f1)"
  else
    actual="$(shasum -a 256 "$archive" | cut -d' ' -f1)"
  fi
  if [ "$actual" != "$sha256" ]; then
    echo "gitleaks download: SHA-256 mismatch for $url" >&2
    echo "  expected $sha256" >&2
    echo "  got      $actual" >&2
    exit 1
  fi

  tar -xzf "$archive" -C "$ROOT/.tools" gitleaks
  mv "$ROOT/.tools/gitleaks" "$BIN"
  # The trap does not fire after exec below, so remove the archive here.
  rm -f "$archive"
  trap - EXIT
fi

exec "$BIN" git --redact --verbose "$ROOT"

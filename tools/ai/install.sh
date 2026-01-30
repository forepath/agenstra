#!/usr/bin/env sh
# Install script for agentctx – supports common Linux distros and macOS.
# Usage (one-liner, requires sudo): curl -fsSL <url> | sudo sh
# Usage (from file): curl -fsSL <url> -o install.sh && chmod +x install.sh && sudo ./install.sh

set -e

# Fixed download URL for the agentctx binary (replace with real release URL when available).
AGENTCTX_INSTALL_URL="${AGENTCTX_INSTALL_URL:-https://downloads.agenstra.com/agentctx/agentctx}"

# Re-run as root (sudo) if not already root. Preserves arguments.
run_as_root() {
  if [ "$(id -u)" -ne 0 ]; then
    exec sudo "$0" "$@"
  fi
}

# Detect OS for package manager and node install.
detect_os() {
  OS=""
  DISTRO=""
  if [ "$(uname -s)" = "Darwin" ]; then
    OS="macos"
    return
  fi
  if [ "$(uname -s)" != "Linux" ]; then
    echo "Unsupported OS: $(uname -s). This script supports Linux and macOS."
    exit 1
  fi
  OS="linux"
  if [ -f /etc/os-release ]; then
    # shellcheck source=/dev/null
    . /etc/os-release
    DISTRO="${ID:-$ID_LIKE}"
  fi
}

# Ensure Node.js is installed. Try package manager first; otherwise print instructions.
ensure_node() {
  if command -v node >/dev/null 2>&1; then
    return
  fi
  if command -v nodejs >/dev/null 2>&1; then
    return
  fi

  echo "Node.js is required to run agentctx. Attempting to install..."

  case "$OS" in
    macos)
      if command -v brew >/dev/null 2>&1; then
        brew install node
      else
        echo "Please install Node.js: https://nodejs.org/ or run: brew install node"
        exit 1
      fi
      ;;
    linux)
      case "$DISTRO" in
        debian|ubuntu|linuxmint|pop)
          apt-get update -qq && apt-get install -y nodejs
          ;;
        fedora|rhel|centos|rocky|almalinux)
          if command -v dnf >/dev/null 2>&1; then
            dnf install -y nodejs
          else
            yum install -y nodejs
          fi
          ;;
        opensuse*|sles)
          zypper -n install nodejs
          ;;
        arch|manjaro)
          pacman -Sy --noconfirm nodejs
          ;;
        alpine)
          apk add --no-cache nodejs
          ;;
        *)
          echo "Could not detect package manager. Please install Node.js manually (https://nodejs.org/) and run this script again."
          exit 1
          ;;
      esac
      ;;
    *)
      echo "Please install Node.js (https://nodejs.org/) and run this script again."
      exit 1
      ;;
  esac

  if ! command -v node >/dev/null 2>&1 && ! command -v nodejs >/dev/null 2>&1; then
    echo "Node.js installation may have failed. Please install it manually and retry."
    exit 1
  fi
}

# Ensure curl or wget is available. Try installing curl first if neither is present.
ensure_curl_or_wget() {
  if command -v curl >/dev/null 2>&1 || command -v wget >/dev/null 2>&1; then
    return
  fi

  echo "curl or wget is required to download agentctx. Attempting to install curl..."

  case "$OS" in
    macos)
      if command -v brew >/dev/null 2>&1; then
        brew install curl
      else
        echo "Please install curl or wget (e.g. brew install curl) and run this script again."
        exit 1
      fi
      ;;
    linux)
      case "$DISTRO" in
        debian|ubuntu|linuxmint|pop)
          apt-get update -qq && apt-get install -y curl
          ;;
        fedora|rhel|centos|rocky|almalinux)
          if command -v dnf >/dev/null 2>&1; then
            dnf install -y curl
          else
            yum install -y curl
          fi
          ;;
        opensuse*|sles)
          zypper -n install curl
          ;;
        arch|manjaro)
          pacman -Sy --noconfirm curl
          ;;
        alpine)
          apk add --no-cache curl
          ;;
        *)
          echo "Could not detect package manager. Please install curl or wget manually and run this script again."
          exit 1
          ;;
      esac
      ;;
    *)
      echo "Please install curl or wget and run this script again."
      exit 1
      ;;
  esac

  if ! command -v curl >/dev/null 2>&1 && ! command -v wget >/dev/null 2>&1; then
    echo "curl/wget installation may have failed. Please install one manually and retry."
    exit 1
  fi
}

# Download agentctx binary to a temp file and install to /usr/bin/agentctx.
# If agentctx exists in the same directory as this script, use that and skip download.
install_agentctx() {
  SCRIPT_DIR=""
  case "$0" in
    */*)
      SCRIPT_DIR="${0%/*}"
      if [ -n "$SCRIPT_DIR" ] && (cd "$SCRIPT_DIR" 2>/dev/null); then
        SCRIPT_DIR="$(cd "$SCRIPT_DIR" && pwd)"
      else
        SCRIPT_DIR=""
      fi
      ;;
    *) ;;
  esac
  if [ -n "$SCRIPT_DIR" ]; then
    LOCAL_AGENTCTX="${SCRIPT_DIR}/agentctx"
    if [ -f "$LOCAL_AGENTCTX" ]; then
      install -m 755 "$LOCAL_AGENTCTX" /usr/bin/agentctx
      echo "Installed agentctx to /usr/bin/agentctx (from local binary)"
      return
    fi
  fi

  TMP_FILE=""
  TMP_FILE="$(mktemp)"
  trap 'rm -f "$TMP_FILE"' EXIT

  if command -v curl >/dev/null 2>&1; then
    curl -fSL --progress-bar -o "$TMP_FILE" "$AGENTCTX_INSTALL_URL"
  elif command -v wget >/dev/null 2>&1; then
    wget -q -O "$TMP_FILE" "$AGENTCTX_INSTALL_URL"
  else
    echo "Need curl or wget to download agentctx. Please install one and retry."
    exit 1
  fi

  chmod +x "$TMP_FILE"
  install -m 755 "$TMP_FILE" /usr/bin/agentctx
  echo "Installed agentctx to /usr/bin/agentctx"
}

main() {
  run_as_root "$@"
  detect_os
  ensure_node
  ensure_curl_or_wget
  install_agentctx
}

main "$@"

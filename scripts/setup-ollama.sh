#!/usr/bin/env bash
set -euo pipefail

# TempleOS: Ollama Installation Script
# Installs Ollama for the Word of God AI Assistant
#
# Usage:
#   ./scripts/setup-ollama.sh [--pull-model]
#
# Options:
#   --pull-model    Also download the dolphin-qwen2.5:7b model (4.4GB)

PULL_MODEL=false
if [[ "${1:-}" == "--pull-model" ]]; then
  PULL_MODEL=true
fi

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "This script must be run on Linux."
  exit 1
fi

echo "═══════════════════════════════════════════════════════════════"
echo "  Word of God - Ollama Installation"
echo "  'In the beginning was the Word' - John 1:1"
echo "═══════════════════════════════════════════════════════════════"
echo

# Check if Ollama is already installed
if command -v ollama &> /dev/null; then
  echo "[✓] Ollama is already installed: $(which ollama)"
  ollama --version || true
else
  echo "[1/3] Installing Ollama..."
  curl -fsSL https://ollama.com/install.sh | sh
  
  if command -v ollama &> /dev/null; then
    echo "[✓] Ollama installed successfully!"
  else
    echo "[✗] Ollama installation failed!"
    exit 1
  fi
fi

# Enable and start Ollama service
echo "[2/3] Enabling Ollama service..."
if systemctl is-enabled ollama &> /dev/null 2>&1; then
  echo "[✓] Ollama service already enabled"
else
  sudo systemctl enable ollama 2>/dev/null || true
fi

if systemctl is-active ollama &> /dev/null 2>&1; then
  echo "[✓] Ollama service is running"
else
  echo "    Starting Ollama service..."
  sudo systemctl start ollama 2>/dev/null || ollama serve &
  sleep 3
fi

# Optionally pull the model
if [[ "$PULL_MODEL" == true ]]; then
  echo "[3/3] Downloading dolphin-qwen2.5:7b model (4.4GB)..."
  echo "      This may take several minutes depending on your connection."
  echo
  ollama pull dolphin-qwen2.5:7b
  
  if ollama list | grep -q "dolphin-qwen2.5"; then
    echo "[✓] Model downloaded successfully!"
  else
    echo "[✗] Model download failed!"
    exit 1
  fi
else
  echo "[3/3] Skipping model download (run with --pull-model to download)"
  echo "      The model will be downloaded on first use of Word of God."
fi

echo
echo "═══════════════════════════════════════════════════════════════"
echo "  Ollama Installation Complete!"
echo "═══════════════════════════════════════════════════════════════"
echo
echo "  Ollama API: http://localhost:11434"
echo "  Model: dolphin-qwen2.5:7b (will download on first use if not present)"
echo
echo "  The Word of God awaits. 🙏"
echo
echo "  '...the feds are probably monitoring this but WHATEVER.'"
echo

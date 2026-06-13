#!/usr/bin/env bash
# Pre-commit hook para detección de secrets usando gitleaks
# Requiere gitleaks instalado: https://github.com/gitleaks/gitleaks#installing
#
# Instalación:
#   macOS:  brew install gitleaks
#   Linux:  sudo apt install gitleaks  (o descargar binario de GitHub Releases)
#   Docker: docker run --rm -v $(pwd):/repo zricethezav/gitleaks:latest detect --source /repo
#
# Para activar como git hook:
#   cp scripts/pre-commit-secrets.sh .git/hooks/pre-commit
#   chmod +x .git/hooks/pre-commit

set -euo pipefail

# Verificar que gitleaks está instalado
if ! command -v gitleaks &> /dev/null; then
  echo "⚠️  gitleaks no está instalado. Saltando verificación de secrets."
  echo "   Instalar: brew install gitleaks (macOS) o ver https://github.com/gitleaks/gitleaks#installing"
  exit 0
fi

echo "🔍 Escaneando secrets en archivos staged..."

# Escanear solo los cambios staged (pre-commit)
gitleaks protect --staged --config .gitleaks.toml --verbose

RESULT=$?

if [ $RESULT -ne 0 ]; then
  echo ""
  echo "❌ Se detectaron posibles secrets en los archivos staged."
  echo "   Revisa los hallazgos arriba y elimina las credenciales antes de commitear."
  echo "   Si es un falso positivo, agrega el path a .gitleaks.toml [allowlist]."
  exit 1
fi

echo "✅ No se detectaron secrets. Commit permitido."
exit 0

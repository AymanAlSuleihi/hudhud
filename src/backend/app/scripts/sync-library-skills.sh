#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKSPACE_DIR="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
SKILLS_ENV_DIR="${LIBRARY_SKILLS_ENV_DIR:-$BACKEND_DIR/.skills-venv}"
LIBRARY_SKILLS_PACKAGE_SPEC="${LIBRARY_SKILLS_PACKAGE_SPEC:-library-skills}"
FASTAPI_SPEC="${LIBRARY_SKILLS_FASTAPI_SPEC:-fastapi}"

if ! command -v uv >/dev/null 2>&1; then
    echo "uv is required to sync library skills." >&2
    exit 1
fi

if [ ! -f "$SKILLS_ENV_DIR/pyvenv.cfg" ]; then
    echo "Creating library-skills environment at $SKILLS_ENV_DIR"
    uv venv "$SKILLS_ENV_DIR"
fi

echo "Installing $FASTAPI_SPEC and $LIBRARY_SKILLS_PACKAGE_SPEC into $SKILLS_ENV_DIR"
uv pip install --python "$SKILLS_ENV_DIR/bin/python" --upgrade "$FASTAPI_SPEC" "$LIBRARY_SKILLS_PACKAGE_SPEC"

install_args=(install --copy --yes)
has_skill_selection=false

for arg in "$@"; do
    case "$arg" in
        --all|--skill|--skill=*|-s|-s*)
            has_skill_selection=true
            ;;
    esac
done

if [ "$has_skill_selection" = false ]; then
    install_args+=(--skill fastapi)
fi

cd "$WORKSPACE_DIR"

if [ "$has_skill_selection" = false ] && [ -e "$WORKSPACE_DIR/.agents/skills/fastapi" ]; then
    rm -rf "$WORKSPACE_DIR/.agents/skills/fastapi"
fi

echo "Installing library skills into $WORKSPACE_DIR/.agents"
UV_PROJECT_ENVIRONMENT="$SKILLS_ENV_DIR" "$SKILLS_ENV_DIR/bin/library-skills" "${install_args[@]}" "$@"

if [ "$has_skill_selection" = false ] && [ ! -f "$WORKSPACE_DIR/.agents/skills/fastapi/SKILL.md" ]; then
    echo "FastAPI skill was not installed." >&2
    echo "Set LIBRARY_SKILLS_FASTAPI_SPEC to a FastAPI version that publishes library skills if needed." >&2
    exit 1
fi
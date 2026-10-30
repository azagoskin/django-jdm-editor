"""Hatchling build hook for the JS bundle (variant A).

At wheel build time this ensures the pre-built ``jdm-editor.js``/``.css`` bundle is
present in the package's ``static/`` dir. If the bundle is missing and Node.js is
available, it is built automatically via ``npm ci && npm run build`` in
``frontend/``. If it is still missing afterwards the build fails loudly, so a wheel
can never be published without the editor assets.
"""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

from hatchling.builders.hooks.plugin.interface import BuildHookInterface

ROOT = Path(__file__).parent
STATIC_DIR = ROOT / "src" / "django_jdm_editor" / "static" / "django_jdm_editor"
FRONTEND_DIR = ROOT / "frontend"
REQUIRED = ("jdm-editor.js", "jdm-editor.css")


class CustomBuildHook(BuildHookInterface):
    PLUGIN_NAME = "custom"

    def initialize(self, version, build_data):
        if self._bundle_present():
            return

        if shutil.which("npm") is None:
            self._fail(
                "JS bundle missing and `npm` is not available to build it. "
                "Build it manually: `cd frontend && npm ci && npm run build`."
            )

        self.app.display_info("django-jdm-editor: building JS bundle with npm...")
        self._run(["npm", "ci"])
        self._run(["npm", "run", "build"])

        if not self._bundle_present():
            self._fail(
                "JS build finished but expected files are still missing in "
                f"{STATIC_DIR}: {', '.join(REQUIRED)}"
            )

    def _bundle_present(self) -> bool:
        return all((STATIC_DIR / name).is_file() for name in REQUIRED)

    def _run(self, cmd: list[str]) -> None:
        subprocess.run(cmd, cwd=FRONTEND_DIR, check=True)

    def _fail(self, message: str) -> None:
        raise RuntimeError(f"[django-jdm-editor build] {message}")

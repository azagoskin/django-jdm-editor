"""Smoke test: the pre-built JS bundle ships inside the package.

Skipped automatically when the bundle has not been built yet (variant A: it is
produced in CI / at wheel build time, not committed to git). In CI the bundle is
always built before tests run, so this test is active there.
"""

from pathlib import Path

import pytest

import django_jdm_editor

STATIC_DIR = Path(django_jdm_editor.__file__).parent / "static" / "django_jdm_editor"
JS = STATIC_DIR / "jdm-editor.js"
CSS = STATIC_DIR / "jdm-editor.css"

bundle_built = JS.is_file() and CSS.is_file()


@pytest.mark.skipif(not bundle_built, reason="JS bundle not built (run `npm run build`)")
def test_bundle_files_exist_and_nonempty():
    assert JS.stat().st_size > 0
    assert CSS.stat().st_size > 0


@pytest.mark.skipif(not bundle_built, reason="JS bundle not built (run `npm run build`)")
def test_bundle_contains_editor_bootstrap():
    content = JS.read_text(encoding="utf-8", errors="ignore")
    # Our entry-point selector/boot markers survive minification.
    assert "data-jdm-editor" in content
    assert "formset:added" in content


@pytest.mark.skipif(not bundle_built, reason="JS bundle not built (run `npm run build`)")
def test_bundle_has_no_sourcemap_comment_lines():
    # Django's ManifestStaticFilesStorage treats any standalone
    # `//# sourceMappingURL=` line as a real asset reference and fails
    # collectstatic if the target .map is missing. The build strips these.
    for line in JS.read_text(encoding="utf-8", errors="ignore").splitlines():
        assert not line.startswith("//# sourceMappingURL="), line

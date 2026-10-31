# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/).

## [0.1.2]

### Changed
- Docs: README now documents the preview card (per-type color markers, I/O
  excluded) and the optional Simulator; refreshed the preview screenshot.
- CI: bumped GitHub Actions to the Node 24 runtime (checkout v5, setup-node v5,
  setup-python v6, upload/download-artifact v5; build Node 22) to silence the
  Node 20 deprecation warning.

## [0.1.1]

### Fixed
- License: the `LICENSE` file shipped the GPLv3 text while the package metadata,
  README and intent were MIT. Replaced `LICENSE` with the MIT text so the license
  is consistent everywhere (the project is MIT, matching its MIT-licensed bundled
  dependencies). 0.1.0 on PyPI carried the mismatched file; use 0.1.1.

## [0.1.0]

### Fixed
- Editor popups (the upload/download menus, node-type selects, hit-policy
  dropdowns, tooltips, context menus) opened *behind* the fullscreen overlay and
  looked broken/unclickable: the overlay's high `z-index` covered Ant Design
  popups rendered into `<body>`. The editor is now wrapped in an Ant Design
  `ConfigProvider` with `getPopupContainer` pointing inside the overlay, so popups
  stack above the editor and are usable.

- `collectstatic` under `ManifestStaticFilesStorage` (e.g. WhiteNoise's
  `CompressedManifestStaticFilesStorage`) no longer fails: the build now strips
  stray `//# sourceMappingURL=*.d.ts.map` comment lines (embedded by bundled
  monaco / TypeScript lib declarations) that Django tried to resolve as real
  assets. Added a regression test.

### Changed
- Redesigned the collapsed preview into a card: a "N checks" badge + a list of the
  decision nodes with a color-coded marker per node type (decision table /
  expression / function / switch / sub-decision). Graph I/O nodes (Request /
  Response) are excluded from the list and the count.

### Added
- Optional in-editor **Simulator** panel via `JDMWidget(simulate_url=...)`: on run
  the editor POSTs `{graph, context}` (with CSRF) to the given endpoint and renders
  the `{performance, result, trace}` response (or `{error}`). No simulation UI is
  shown when `simulate_url` is unset.
- Initial MVP: `JDMField` model field, `JDMFormField` / `JDMWidget` form widgets
  mounting the GoRules `@gorules/jdm-editor` `DecisionGraph` in the Django admin.
- Self-contained IIFE JS bundle (React inlined) built with Vite; no Node required
  for end users.
- Lightweight structural `validate_jdm` validator.
- Packaging via hatchling with a build hook that builds/verifies the bundle.
- CI (test matrix + wheel/bundle check) and release (PyPI trusted publishing)
  workflows.

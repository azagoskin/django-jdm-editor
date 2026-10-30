# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- Initial MVP: `JDMField` model field, `JDMFormField` / `JDMWidget` form widgets
  mounting the GoRules `@gorules/jdm-editor` `DecisionGraph` in the Django admin.
- Self-contained IIFE JS bundle (React inlined) built with Vite; no Node required
  for end users.
- Lightweight structural `validate_jdm` validator.
- Packaging via hatchling with a build hook that builds/verifies the bundle.
- CI (test matrix + wheel/bundle check) and release (PyPI trusted publishing)
  workflows.

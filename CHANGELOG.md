# Changelog

All notable changes to this project. Format: [Keep a Changelog](https://keepachangelog.com), versioning: SemVer.

## [1.0.0] — 2026-11-11

### Added
- Autonomous 7-step self-healing pipeline: monitor → detect → collect → analyse → decide → recover → verify.
- Three real managed micro-services with 7 injectable faults and a DevOps supervisor (restart, deploy, rollback).
- Offline evidence-scoring root-cause analyser with 7 failure signatures; optional Claude analysis with schema validation and local second opinion.
- Six predefined recovery actions, learning model, guardrails (modes, confidence, risk, attempts, cooldown, circuit breaker, blast radius).
- Human-in-the-loop approvals, incident timeline, notes, CSV export, audit log.
- React dashboard (white & blue, react-icons): live dashboard, services, incidents, agent control, playbooks, chaos lab with guided demo, live logs, reports, users, settings, profile, about.
- Security: JWT cookies, bcrypt, lockout, RBAC, zod validation, Helmet CSP, rate limits.
- 143 automated tests including real end-to-end recovery tests; Docker, CI workflow, setup script and full documentation.

### Fixed (during verification)
- Fast memory release after cache clear; no false error spike after reconnect; detection baseline after recovery; dedicated `API_PORT`; persisted dev secret; timezone-aware reports; HTTPS-only CSP upgrade.

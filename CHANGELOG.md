# Changelog

All notable additions to **DevLens**. Newest first. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/). Each concept page ships the same
7-part shape (plain-English → real-world → visual → C# → 3 takeaways → related →
interview tip) and is registered in `assets/js/nav.js` + `data/search-index.json`.

## [Unreleased]

### Added — 2026-06-13 · Interactive site features (Phase 3)

- **Roadmap** (`roadmap.html`) — live build progress across all tracks (built vs
  planned, completion status), rendered from `nav.js`.
- **Concept map** (`conceptmap.html`) — an interactive force-directed graph
  (vanilla JS + SVG, no libraries) of every “related concept” link: hover to
  highlight neighbours, click to open, scroll to zoom, drag to pan, filter by track.
- **Cheat sheets** (`cheatsheet.html?cat=<track>`) — every track distilled to its
  concepts’ three key takeaways, scannable, from `data/cards.json`.
- **Flashcard / quiz mode** — every concept page gains a “🎴 Study these as
  flashcards” button (injected by `nav.js`, no per-page edits) that turns the 3 key
  takeaways into cloze recall cards (blank the bold term, flip to reveal; keyboard-driven).
- **RSS feed** (`feed.xml`) — newly added concepts, auto-discovered on every page.
- New generated data: `data/cards.json` (takeaways) and `data/graph.json` (concept graph).

### Added — 2026-06-13 · More tracks + cheat sheet (Phase 2)

- **DevOps & CI/CD** 🚀 (5) — CI/CD Pipelines · Containers & Images · Deployment
  Strategies (rolling / blue-green / canary) · Infrastructure as Code · Feature Flags.
- **Security Fundamentals** 🔒 (5) — Authentication vs Authorization · Hashing &
  Salting · Encryption Basics · SQL Injection · Cross-Site Scripting (XSS).
- **Observability** 📈 (5) — The Three Pillars (logs/metrics/traces) · Structured
  Logging · Metrics, SLIs & SLOs · Distributed Tracing & Spans · Alerting & Dashboards.
- **Data Structures & Algorithms** 📐 (7) — Big-O Notation · **Big-O Cheat Sheet** ·
  Arrays vs Linked Lists · Hash Tables · Stacks & Queues · Trees & Graphs · Sorting Algorithms.
- **Microservices** (+3) — Service Mesh · API Versioning · Strangler Fig Pattern.
- **C# & Design Patterns** (+3) — Value vs Reference Types · Boxing & Unboxing · Records.

### Added — 2026-06-13 · New foundational tracks (Phase 1)

- **Concurrency & Multithreading** 🧵 (6) — Concurrency vs Parallelism · Async/Await
  Pitfalls · Locks & Race Conditions · Thread Safety & Atomicity · Channels &
  Producer/Consumer · Cancellation & Timeouts.
- **Testing** ✅ (5) — The Test Pyramid · Unit Testing · Mocking & Test Doubles ·
  Integration Testing · Test-Driven Development.
- **Git & Version Control** 🔀 (5) — How Git Works: Objects & Refs · Branching
  Strategies · Merge vs Rebase · Resolving Merge Conflicts · Undoing Changes.

## Project milestones

- **Interview Scenarios** 🧩 — open-ended senior-engineer questions (scaling,
  concurrency, availability, security, incident response). Grew to **27** pages.
- **Coding Problems** 🧠 — **complete at 350**, every page with an interactive
  step-through visualizer, grouped into 18 pattern sub-groups in the sidebar.
- Core tracks: .NET Internals (28) · C# & Design Patterns (28) · Database
  Optimization (14) · OOP & Principles (10) · Microservices (14) · System
  Design (13) · Web Fundamentals (12).

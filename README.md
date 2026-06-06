# DevLens — Computer Science Concepts

A free, self-contained, **static knowledge base** for working developers — the concepts you
rely on every day but never had time to truly understand, explained in plain English with
real-world examples, inline diagrams, and C# code.

> Built like MDN meets roadmap.sh, but friendlier. No frameworks, no backend, no tracking.

🔗 **Live site:** https://v1-coder-max.github.io/Computer-Science-Concepts/

---

## What's inside

Every concept page follows the same shape so you can skim fast and trust what you'll find:

1. **Plain-English explanation** — the mental model first, then the depth
2. **Real-world example** — how Twitter, Gmail, Netflix, Amazon, etc. use it
3. **Visual** — an inline, responsive SVG diagram (adapts to light/dark)
4. **C# code** — syntax-highlighted and copy-pasteable
5. **3 key takeaways**
6. **Related concepts** — linked into the knowledge graph
7. **Interview tip** — exactly how it shows up when you're being grilled

## Categories

| Track | Status |
|---|---|
| ⚙️ **.NET Internals** | ✅ Complete — CLR, GC, JIT, async/await, DI, middleware, EF Core, Span&lt;T&gt;, AOT… |
| 🏛️ **OOP & Principles** | ✅ Complete — 4 pillars, SOLID, composition vs inheritance, coupling/cohesion, DRY/KISS/YAGNI |
| 🌐 **Web Fundamentals** | ✅ Complete — HTTP, status codes, REST, HTTPS/TLS, DNS, cookies, JWT, OAuth, CORS, WebSockets, caching |
| 🗄️ **Database Optimization** | ✅ Complete — indexing, execution plans, transactions/ACID, isolation, deadlocks, sharding, replication, NoSQL, Redis |
| 🛰️ **System Design** | ✅ Complete — load balancers, CDNs, caching, queues, rate limiting, consistent hashing, CAP + product breakdowns (Twitter, Instagram, Netflix, Gmail) |
| 🔗 **Microservices** | 🚧 In progress |
| 🧩 **C# & Design Patterns** | 🚧 In progress |
| 🧠 **Coding Problems** | 🚧 In progress |

## Features

- 🔍 **Instant client-side search** (Fuse.js) — press <kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>K</kbd>
- 🌙 **Dark mode by default**, light mode toggle (persisted)
- 📑 Collapsible sidebar, per-page table of contents, breadcrumbs
- 📈 **Reading-progress tracking** (localStorage)
- 📱 Fully responsive
- 💻 Syntax highlighting via Prism.js

## Tech stack

100% free and dependency-light: **pure HTML, CSS, and vanilla JavaScript**. No build step.
Fuse.js (search) and Prism.js (highlighting) are loaded from a CDN. Hosted on **GitHub Pages**.

```
/index.html                 Home: category grid + search
/concepts/<category>/*.html One file per concept
/assets/css/style.css       Global design system (dark/light)
/assets/js/nav.js           Sidebar, breadcrumb, TOC, progress (site structure)
/assets/js/search.js        Fuse.js search modal (Ctrl/Cmd+K)
/assets/js/theme.js         Dark/light toggle
/data/search-index.json     Single source of truth for search
/concepts/_template.html    Reusable concept-page template
```

## Run locally

The search index is loaded with `fetch`, so use a local server (not `file://`):

```bash
# Python
python -m http.server 8080
# or Node
npx serve .
```

Then open <http://localhost:8080>.

## Contributing a concept

1. Copy `concepts/_template.html` to `concepts/<category>/<slug>.html`
2. Fill in all 7 sections and set the `<body data-category / data-concept / data-title>` attributes
3. Register it in `assets/js/nav.js` (`SITE.categories[].concepts`) **and** `data/search-index.json`

## License

Free and open educational resource.

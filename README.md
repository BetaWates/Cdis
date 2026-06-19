# Concept Digitalization Inspection Standard
### Client: AIINA — PT Alpha Innovatech Indonesia

A digital inspection standard system for industrial quality control. Structured as a monorepo with separate FrontEnd and BackEnd packages.

> [!IMPORTANT]
> **Quick Start Setup:** Before running the projects, you must install dependencies in both folders:
> ```bash
> cd BackEnd && npm install
> cd ../FrontEnd && npm install
> ```

---

## Repository Structure

```
├── FrontEnd/          # React 19 + TypeScript + Tailwind v4 (Vite)
├── BackEnd/           # Node.js + Express + TypeScript API (mysql2)
└── README.md
```

---

## FrontEnd

**Stack:** React 19, TypeScript, Tailwind CSS v4, Vite, SheetJS (xlsx)

### Features
- Master Form management with background async Excel parsing (PROCESSING → ACTIVE)
- Daily checksheet split-panel with 3 input modes per row: Keypad, Voice (Web Speech API), Stylus/Handwriting canvas
- Live OK/NG tolerance comparison on all measurement rows
- 4-stage approval workflow: PIC → Leader → SPV → Manager
- Card-based Approval Inbox with per-stage pending stat counters
- shadcn/ui-aligned components (Card, Badge, Button, Table, Dialog)
- State via custom hooks (`useMasterForms`, `useSubmissions`) — localStorage-backed now, API-swap-ready later

### Running FrontEnd

```bash
cd FrontEnd
npm install
npm run dev         # http://localhost:3000
```

> **Note:** `npm install xlsx` is required inside FrontEnd/ to enable real Excel parsing on upload.

---

## BackEnd

**Stack:** Node.js 20+, Express 4, TypeScript, mysql2

### Endpoints (stub handlers — no DB logic yet)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/health` | Health check |
| GET, POST | `/api/master-forms` | Master Form CRUD |
| GET, POST | `/api/daily-checks` | Daily check submissions |
| GET, POST | `/api/approvals` | Approval workflow |

### Running BackEnd

```bash
cd BackEnd
npm install
cp .env.example .env    # Fill in your MySQL/XAMPP credentials
npm run dev             # http://localhost:4000
```

---

## Integration Notes

> The FrontEnd currently uses **localStorage-based hooks** (`useMasterForms`, `useSubmissions`).
> When BackEnd routes have real DB logic, replace each hook's read/write with `fetch('/api/...')` calls — no component changes needed.

---

## Development Workflow

1. Start XAMPP → Apache + MySQL (port 3306)
2. `cd BackEnd && npm run dev`
3. `cd FrontEnd && npm run dev`
4. Open `http://localhost:3000`

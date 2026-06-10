# GPSFDK.com — Enterprise Resource Planning (MERN)

An internal ERP web application for **GPSFDK.com**, a GPS fleet-tracking company. Built with the **MERN** stack (MongoDB + Mongoose, Express, React, Node.js), it provides 17 role-aware modules behind a public marketing landing page, login and self-registration.

> Brand: blue (blue-700/800/900) · ₹ Indian Rupee formatting · `MapPin` logo · fully responsive app shell.

---

## ✨ Features

- **5 roles** — Super Admin, Web Developer, Designer, Marketing, Operation Management.
- **Module access matrix** enforced on **both** the backend (middleware + query scoping) and the frontend (route guards + conditional UI).
- **Modules**: Dashboard, Employees, Attendance, Leaves, Tenders, Projects, Tasks, Payroll, Finance & Expenses, Campaigns, Leads, Assets, Design Library, Reports, Notifications, Profile, Settings.
- **Gamification & culture**: Employee of the Month / Year leaderboards, daily Good-Morning "best thought" feed (first quality post earns an EOM point), notice board, holidays.
- **Admin user provisioning**: Super Admin creates accounts (email + role, optional demo password). A unique Employee ID and password are generated and **emailed to the user via Resend**; they log in and change it. No public self-service needed.
- **Shift timings & attendance control**: each user has a work shift (`shiftStart`/`shiftEnd`); "Late" on check-in is computed against their shift. Super Admin can add/edit/correct any employee's attendance record from the dashboard.
- **Auth**: JWT (httpOnly cookie **and** `Authorization: Bearer` header), bcrypt-hashed passwords, zod validation.
- Charts via **recharts**, icons via **lucide-react**, dates via **date-fns**, styling via **Tailwind CSS**.

---

## 🧱 Tech Stack

| Layer    | Tech |
|----------|------|
| Backend  | Node.js, Express, Mongoose, JWT, bcryptjs, zod, helmet, cors, morgan, cookie-parser |
| Frontend | React 18 + Vite, React Router v6, Tailwind CSS, axios, recharts, lucide-react, date-fns |
| Monorepo | npm + `concurrently` (`npm run dev` runs server :5000 and client :5173) |

---

## 📋 Prerequisites

- **Node.js 18+**
- **MongoDB** running locally (`mongodb://127.0.0.1:27017`) **or** a MongoDB Atlas connection string.

---

## 🚀 Setup

```bash
# 1. From the repo root, install all dependencies (root + server + client)
npm run install:all

# 2. Configure environment variables
#    server/.env  — a working dev .env is already included; or copy the example:
cp server/.env.example server/.env
#    client/.env (optional — defaults to the Vite proxy at /api):
cp client/.env.example client/.env

# 3. Seed the database with demo data
npm run seed

# 4. Start both server and client
npm run dev
```

- API → http://localhost:5000
- Web → http://localhost:5173

The Vite dev server proxies `/api` → `http://localhost:5000`, so no CORS config is needed in development.

---

## 🔑 Demo Accounts

After `npm run seed`, log in with any of these (password for **all**: `password123`):

| Role | Email |
|------|-------|
| Super Admin | `admin@gpsfdk.com` |
| Web Developer | `arjun@gpsfdk.com` |
| Web Developer | `neha@gpsfdk.com` |
| Designer | `priya@gpsfdk.com` |
| Designer | `rahul@gpsfdk.com` |
| Marketing | `sneha@gpsfdk.com` |
| Marketing | `vikram@gpsfdk.com` |
| Operation Management | `anita@gpsfdk.com` |

> Or use **Register** on the landing page to create your own account and pick a role.

---

## 🔐 Access Control Matrix

Values: `true` = full · `view` = read-only · `self` = own records · `team` = team records · `assigned` = assigned records · `edit` · `request` · `approve` · `false` = no access.

| module | super_admin | web_developer | designer | marketing | operation |
|--------|:-:|:-:|:-:|:-:|:-:|
| employees | full | — | — | — | view |
| attendance | full | self | self | self | team |
| leaves | full | self | self | self | team |
| tenders | full | — | — | edit | full |
| projects | full | assigned | assigned | assigned | full |
| tasks | full | assigned | assigned | assigned | full |
| payroll | full | — | — | — | view |
| finance | full | request | request | request | approve |
| campaigns | full | — | — | full | — |
| leads | full | — | — | full | — |
| assets | full | — | — | — | full |
| design_library | full | — | designer | — | — |
| reports | full | — | — | — | full |
| settings | full | — | — | — | — |

The matrix lives in [`server/src/config/accessMatrix.js`](server/src/config/accessMatrix.js) (source of truth) and is mirrored on the client in [`client/src/lib/access.js`](client/src/lib/access.js). The server enforces it via `requireModule` / `requireWrite` middleware and per-role query scoping (`server/src/utils/scope.js`); a developer literally cannot read or write admin-only data even by calling the API directly.

---

## 🗂️ Project Structure

```
gpserprefresh/
├── package.json                # root scripts (dev / seed / build) + concurrently
├── README.md
├── client/                     # React + Vite frontend
│   ├── vite.config.js          # /api proxy → :5000
│   ├── tailwind.config.js
│   └── src/
│       ├── api/client.js       # axios instance + JWT interceptor
│       ├── context/AuthContext.jsx
│       ├── components/
│       │   ├── layout/         # Sidebar, Header, AppLayout
│       │   ├── ui/             # Logo, Modal, Table, primitives
│       │   └── RouteGuards.jsx
│       ├── lib/                # access matrix, formatters, badges, nav
│       ├── hooks/useFetch.js
│       └── pages/              # Dashboard + 16 module pages + public/
└── server/                     # Express + Mongoose backend
    ├── .env.example
    └── src/
        ├── index.js            # entry
        ├── app.js              # express app
        ├── config/             # db.js, accessMatrix.js
        ├── models/             # 17 Mongoose schemas
        ├── middleware/         # auth, authorize, error
        ├── controllers/        # auth, crudFactory, workflow, dashboard, reports…
        ├── routes/             # auth + mounted REST routers
        ├── utils/              # token, scope, ApiError, asyncHandler
        └── seed.js             # demo data
```

---

## 📡 Key API Endpoints

```
POST   /api/auth/register | login | logout
GET    /api/auth/me            PUT /api/auth/profile
GET    /api/dashboard/stats    GET /api/reports/overview
GET    /api/access-matrix      GET /api/users/options

# Resources (GET list, GET :id, POST, PUT :id, DELETE :id) — all role-scoped:
/api/employees  /api/attendance  /api/leaves  /api/tenders  /api/projects
/api/tasks  /api/payroll  /api/expenses  /api/campaigns  /api/leads
/api/assets  /api/design-assets  /api/notices  /api/holidays

# Workflow:
PATCH  /api/leaves/:id/status      PATCH /api/expenses/:id/status
POST   /api/attendance/checkin     POST  /api/attendance/checkout
GET    /api/recognition            GET   /api/good-morning   POST /api/good-morning
GET    /api/notifications          PATCH /api/notifications/:id/read
```

---

## 📜 Scripts

| Command | Where | Description |
|---------|-------|-------------|
| `npm run install:all` | root | Install root + server + client deps |
| `npm run dev` | root | Run server (:5000) and client (:5173) together |
| `npm run seed` | root | Wipe & reseed the database with demo data |
| `npm run build` | root | Build the client for production |
| `npm run start` | root | Run the server in production mode |

---

## 🛠️ Notes

- `server/.env` ships with a working local config (gitignored). **Change `JWT_SECRET` before any real deployment.**
- To use MongoDB Atlas, set `MONGODB_URI` in `server/.env` to your Atlas SRV string, then `npm run seed`.
- **Email:** set `EMAIL_FROM` plus either a Resend key (`EMAIL_PASS=re_...`, or `RESEND_API_KEY`) or SMTP creds (`EMAIL_HOST/PORT/USER/PASS`) in `server/.env` to send new-user credential emails. The mailer **prefers Resend's HTTPS API** (port 443) and falls back to SMTP. ⚠️ On hosts that **block outbound SMTP ports** (Render, many PaaS), use the Resend key path — SMTP will time out. For Resend: `EMAIL_USER=resend`, `EMAIL_PASS=<your Resend API key>`, `EMAIL_FROM` on a Resend-verified domain. Without any of these, the email is **logged to the server console** (dev fallback) and the Employees screen shows the credentials to share manually.
- **Creating users:** Super Admin → **Employees → Create Account** → enter name/email/role, optionally a demo password (blank = auto-generated), set the shift, Save. The user gets an Employee ID + password by email and can log in immediately.
- **Shift / attendance control:** edit a user's shift in the Employees form; Super Admin can add or correct any attendance record on the **Attendance** page (Add Record / row edit).
- Default password for seeded users is intentionally simple for demo purposes only.

# DICOM Viewer

A small PACS worklist app: **Orthanc** stores the DICOM files, **Express** proxies it and handles auth, **React** shows the worklist, and clicking a study opens it in **OHIF**.

```
CT/MRI scan → Orthanc (storage) → Express (auth + proxy) → React (worklist UI) → OHIF (viewer)
```

---

## What's in this repo

```
DICOM-Viewer/
├── backend/       Express API - auth, proxies Orthanc, caches metadata in Postgres
├── frontend/      React + Vite - login page, worklist table
├── common/        shared TypeScript types
└── docker-compose.yml   spins up Orthanc + Postgres
```

OHIF itself is **not** in this repo - it's a separate open-source project you clone and run on its own (Step 4 below).

---

## Before you start

You'll need:
- **Docker Desktop** installed and running
- **Node.js 20+**
- A sample DICOM file to test with

---

## Step 1 - start Orthanc and Postgres

```bash
docker compose up -d
```

This brings up two containers:
- **Orthanc** → `http://localhost:8042` (login: `orthanc` / `orthanc`)
- **Postgres** → `localhost:5433` (this is the app's own database, separate from Orthanc's file storage)

Open `http://localhost:8042` in a browser - you should see Orthanc's built-in interface. If that loads, you're good.

Your uploaded files and database rows are stored in named Docker volumes, so they survive normal restarts (`docker compose stop`, `docker compose down`, closing Docker Desktop). They're only wiped if you run `docker compose down -v` or delete the volumes yourself.

---

## Step 2 - load a sample DICOM file into Orthanc

Grab a free test file from:
- Orthanc's own samples: https://www.orthanc-server.com/static/downloads/dicom/
- The Cancer Imaging Archive: https://www.cancerimagingarchive.net/

Upload it either through the web UI (`http://localhost:8042` → Upload → drag in the `.dcm` file), or with curl:

```bash
curl -u orthanc:orthanc -X POST http://localhost:8042/instances --data-binary @your-file.dcm
```

Check it worked:

```bash
curl -u orthanc:orthanc http://localhost:8042/dicom-web/studies
```

You should get back some JSON with at least one study in it.

---

## Step 3 - run the backend

```bash
cd backend
cp .env.example .env
npm install
npm run migrate
npm run dev
```

`npm run migrate` creates the `User`, `StudyCache`, and `AuditLog` tables in Postgres (first time only).

Check it's up: `http://localhost:4000/health` should return `{"ok":true}`.

**Create your first login** (no signup page yet, so just curl it):

```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"yourpassword"}'
```

Remember this email/password - you'll log in with it in Step 5.

---

## Step 4 - run OHIF

OHIF is its own project, cloned separately:

```bash
git clone https://github.com/OHIF/Viewers.git ohif-viewer
cd ohif-viewer
yarn install
```

Open `platform/app/public/config/default.js` and point its data source at your Orthanc:

```js
window.config = {
  dataSources: [
    {
      friendlyName: "Local Orthanc",
      namespace: "@ohif/extension-default.dataSourcesModule.dicomweb",
      sourceName: "dicomweb",
      configuration: {
        friendlyName: "Local Orthanc",
        name: "Orthanc",
        wadoUriRoot: "http://localhost:8042/wado",
        qidoRoot: "http://localhost:8042/dicom-web",
        wadoRoot: "http://localhost:8042/dicom-web",
        qidoSupportsIncludeField: true,
        supportsReject: false,
        imageRendering: "wadors",
        thumbnailRendering: "wadors",
        enableStudyLazyLoad: true,
        supportsFuzzyMatching: true,
        supportsWildcard: true,
      },
    },
  ],
  defaultDataSourceName: "dicomweb",
};
```

Run it:

```bash
yarn dev
```

OHIF should now be live at `http://localhost:3000`, showing whatever studies you've uploaded to Orthanc.

> **Heads up:** Orthanc's DICOMweb endpoints require basic auth by default (`orthanc`/`orthanc`). For local dev, the easiest fix is turning auth off temporarily - set `ORTHANC__AUTHENTICATION_ENABLED: "false"` in `docker-compose.yml` and restart with `docker compose up -d`. You'd turn it back on before deploying anywhere real.

---

## Step 5 - run the frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Opens at `http://localhost:5173`. Log in with the account you registered in Step 3. Your uploaded study should show up in the table - click it to open it in OHIF.

---

## Running it again later

Once everything's installed once, starting it back up is just:

```bash
docker compose up -d          # orthanc + postgres
cd backend && npm run dev     # in one terminal
cd frontend && npm run dev    # in another
cd ohif-viewer && yarn dev    # and another
```

---

## What each piece actually does

| Piece | Job |
|---|---|
| Orthanc | stores the DICOM files, exposes them over a web API (DICOMweb) |
| Postgres | our own database - users, a cached study list, an audit log of who viewed what |
| Express backend | login/auth, proxies Orthanc's API, keeps the Postgres cache updated |
| React frontend | the worklist page - login screen, study table, links out to OHIF |
| OHIF | the actual image viewer - zoom, pan, brightness/contrast, all pre-built |

---

## A note on security

Auth uses an httpOnly cookie instead of storing the token in localStorage - the idea is that JavaScript running on the page (yours or, worst case, an attacker's via some XSS bug) can never read the token directly. Login/register bodies are validated with Zod before touching any database or hashing logic, so malformed requests get rejected early with a clear error instead of causing weird bugs downstream.

This is still a local-dev setup - things like HTTPS, secrets management, and rate limiting would need to be added before this touches real patient data or goes anywhere public.

---

## Troubleshooting

- **"couldn't load studies" in the frontend** → check the backend is running (`http://localhost:4000/health`) and that you're actually logged in.
- **Backend can't reach Orthanc** → `docker compose ps` should show `orthanc` as running; double check `ORTHANC_URL` in `backend/.env`.
- **OHIF shows nothing** → `qidoRoot`/`wadoRoot` in OHIF's config need to match your Orthanc URL exactly.
- **`npm run migrate` fails** → check Postgres is running and `DATABASE_URL` in `backend/.env` uses port `5433` (matches `docker-compose.yml`).
- **Cookies not showing up / login seems to not "stick"** → make sure `FRONTEND_URL` in `backend/.env` exactly matches where your frontend is running (`http://localhost:5173`), since CORS with cookies needs an exact origin match, not a wildcard.

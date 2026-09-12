# AI Meeting Notes Summarizer

A full-stack app that takes a raw meeting transcript, runs it through an LLM
agent to extract a summary and structured action items, and lets you track,
edit, and export them. Built and verified end-to-end locally, currently being
deployed live.

**Live demo:** _coming soon_
**Repo:** [https://github.com/Vijay-punyamurthy/ai-meeting-notes-summarizer](https://ai-meeting-notes-summarizer-plum.vercel.app/)

## Architecture

```
frontend/  React + TypeScript (Vite)
backend/   Node.js + TypeScript + Express (REST API)
           PostgreSQL  → structured data (meetings, action items)
           MongoDB     → unstructured data (raw transcripts, raw agent output)
           Groq (OpenAI-compatible API) → LLM agent call
```

### Why two databases (not just decorative)

- **Postgres** holds everything the app *queries and filters on repeatedly*:
  meeting status, action item owner/due date/done-state. This data has a
  fixed, known shape, and relational integrity matters (an action item always
  belongs to exactly one meeting → foreign key).
- **MongoDB** holds the raw transcript text and the raw, unvalidated model
  output for each summarization run. This data is variable-length free text,
  isn't queried relationally, and is kept as an audit trail — "what did the
  model actually say, and what prompt produced it?" — useful for debugging
  a bad summary later without losing that history to an overwrite.

### Handling LLM output safely

The agent is prompted to return strict JSON. The response is parsed and then
validated at runtime against a Zod schema (`backend/src/services/agent.ts`).
If the model returns malformed or unexpected JSON, the run is marked
`failed` and the raw output is still stored in Mongo for debugging — the app
never silently accepts or guesses at bad structured output.

In testing, the model sometimes correctly leaves `owner`/`due_date` as `null`
when the transcript doesn't clearly state one (rather than fabricating a
value) — this is treated as expected, honest behavior, not a bug.

### LLM provider

Uses the OpenAI SDK's client shape but points at **Groq's** free,
OpenAI-compatible endpoint (`https://api.groq.com/openai/v1`) rather than
OpenAI directly, since Groq's free tier is sufficient for this workload.
Swapping back to OpenAI, or to any other OpenAI-compatible provider, is a
one-line env var change — no code change needed.

**Note:** Groq's available model catalog varies per account/key. Before
setting `OPENAI_MODEL`, check what your key actually has access to:
```bash
curl https://api.groq.com/openai/v1/models -H "Authorization: Bearer YOUR_KEY"
```
This project was verified working with `openai/gpt-oss-120b`.

## Project structure

```
backend/
  src/
    index.ts              Express app entry point
    db/postgres.ts         PG connection pool
    db/mongo.ts             Mongo connection + collection helpers
    routes/meetings.ts       /meetings endpoints
    routes/actionItems.ts    /action-items endpoints
    services/agent.ts        LLM call + output validation (Zod)
    types.ts
  sql/schema.sql            Postgres table definitions
  .env.example

frontend/
  src/
    main.tsx
    App.tsx                 Routes
    api.ts                  Typed fetch client
    types.ts
    pages/
      NewMeeting.tsx         Paste transcript → create + summarize
      MeetingList.tsx        Table of all meetings
      MeetingDetail.tsx       Summary + editable action items + export
```

## API

| Method | Path                        | Description                                  |
|--------|-----------------------------|-----------------------------------------------|
| POST   | /meetings                   | Create a meeting, store transcript in Mongo   |
| GET    | /meetings                   | List all meetings                             |
| GET    | /meetings/:id                | Get one meeting + its action items           |
| POST   | /meetings/:id/summarize      | Run the agent, persist summary + action items |
| PATCH  | /action-items/:id            | Edit/complete an action item                 |
| DELETE | /meetings/:id                | Delete a meeting                             |

## Local setup

### 1. Databases

Run Postgres and MongoDB via Docker. If default ports (5432 / 27017) are
already in use on your machine (e.g. by another project), map to different
host ports as shown:

```bash
docker run -d --name meeting-pg -e POSTGRES_PASSWORD=postgres -p 5434:5432 postgres:16
docker run -d --name meeting-mongo -p 27019:27017 mongo:7
```

Create the database and load the schema:

```bash
docker exec -it meeting-pg psql -U postgres -c "CREATE DATABASE meeting_notes;"

# macOS/Linux:
docker exec -i meeting-pg psql -U postgres -d meeting_notes < backend/sql/schema.sql

# Windows PowerShell (no < redirection support):
Get-Content backend/sql/schema.sql | docker exec -i meeting-pg psql -U postgres -d meeting_notes
```

### 2. Backend

```bash
cd backend
cp .env.example .env    # fill in your ports, Groq key, and model
npm install
npm run dev              # http://localhost:4000
```

Match `.env` to whatever ports you actually used above, e.g.:
```
PG_PORT=5434
MONGO_URI=mongodb://localhost:27019
```

Verify it's working before moving to the frontend:
```bash
curl http://localhost:4000/health
# → {"ok":true}
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173 (proxies /api to :4000)
```

Open http://localhost:5173, click **+ New Meeting**, paste a transcript, and
submit — it creates the meeting and immediately runs the summarizer.

## Deployment

This app is deployed with:
- **Backend + Postgres:** Render (Web Service + managed Postgres)
- **MongoDB:** MongoDB Atlas (free M0 cluster)
- **Frontend:** _TBD_

Deployment notes and the live URL will be added here once complete.

## Security note

Never commit `.env` — it's excluded via `.gitignore`. If a real API key is
ever accidentally committed, revoke it immediately at the provider's console
and rotate to a new one; a key sitting in git history is compromised even
after removal from the latest commit.

# AI Meeting Notes Summarizer

A full-stack app that takes a raw meeting transcript, runs it through an LLM
agent to extract a summary + structured action items, and lets you track and
export them.

## Architecture

```
frontend/  React + TypeScript (Vite)
backend/   Node.js + TypeScript + Express (REST API)
           PostgreSQL  → structured data (meetings, action items)
           MongoDB     → unstructured data (raw transcripts, raw agent output)
```

### Why two databases (not just decorative)

- **Postgres** holds everything the app *queries and filters on repeatedly*:
  meeting status, action item owner/due date/done-state. This data has a
  fixed, known shape, and relational integrity matters (an action item always
  belongs to exactly one meeting → foreign key).
- **MongoDB** holds the raw transcript text and the raw, unvalidated model
  output for each summarization run. This data is variable-length free text,
  isn't queried relationally, and is kept mainly as an audit trail — "what did
  the model actually say, and what prompt produced it?" — which is useful for
  debugging bad summaries later without losing that history to an overwrite.

### Handling LLM output safely

The agent is prompted to return strict JSON. The response is parsed and then
validated at runtime against a Zod schema (`backend/src/services/agent.ts`).
If the model returns malformed or unexpected JSON, the run is marked
`failed` and the raw output is still stored in Mongo for debugging — the app
never silently accepts or guesses at bad structured output.

## Project structure

```
backend/
  src/
    index.ts              Express app entry point
    db/postgres.ts         PG connection pool
    db/mongo.ts             Mongo connection + collection helpers
    routes/meetings.ts       /meetings endpoints
    routes/actionItems.ts    /action-items endpoints
    services/agent.ts        LLM call + output validation
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

## Setup

### 1. Databases

You need a running Postgres instance and a running MongoDB instance. Easiest
via Docker:

```bash
docker run -d --name pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16
docker run -d --name mongo -p 27017:27017 mongo:7
```

Then load the schema:

```bash
psql -h localhost -U postgres -d postgres -c "CREATE DATABASE meeting_notes;"
psql -h localhost -U postgres -d meeting_notes -f backend/sql/schema.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env    # fill in OPENAI_API_KEY and DB credentials
npm install
npm run dev              # http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173 (proxies /api to :4000)
```

Open http://localhost:5173, click **+ New Meeting**, paste a transcript, and
submit — it creates the meeting and immediately runs the summarizer.

## Notes on the LLM client

The agent service uses the OpenAI SDK format (`backend/src/services/agent.ts`),
but works with any OpenAI-compatible endpoint (Groq, local models via Ollama's
OpenAI-compatible mode, etc.) — just change `OPENAI_API_KEY` and add a
`baseURL` if needed. Swapping in LangChain.js instead of the raw SDK call is a
drop-in change isolated to that one file.

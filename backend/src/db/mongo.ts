import { MongoClient, Db } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
const dbName = process.env.MONGO_DB || "meeting_notes";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getMongoDb(): Promise<Db> {
  if (db) return db;
  client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);
  return db;
}

// Collections:
// - transcripts: { meetingId, rawText, uploadedAt }
// - agent_runs:  { meetingId, rawModelOutput, promptUsed, timestamp }
export async function getTranscriptsCollection() {
  const database = await getMongoDb();
  return database.collection("transcripts");
}

export async function getAgentRunsCollection() {
  const database = await getMongoDb();
  return database.collection("agent_runs");
}

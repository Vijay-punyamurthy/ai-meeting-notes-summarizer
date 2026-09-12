import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { meetingsRouter } from "./routes/meetings";
import { actionItemsRouter } from "./routes/actionItems";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" })); // transcripts can be long

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/meetings", meetingsRouter);
app.use("/action-items", actionItemsRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

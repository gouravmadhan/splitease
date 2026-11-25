import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { connectDB } from "./db.js";
import { ZodError } from "zod";
import "./models/index.js";
import { groups } from "./routes/groups.js";
import { members } from "./routes/members.js";
import { expenses } from "./routes/expenses.js";
import { finance } from "./routes/finance.js";
import { HttpError } from "./routes/util.js";

export const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Single-user passcode (set APP_PASSCODE; leave empty to disable locally).
app.use("/api", (req, res, next) => {
  const code = process.env.APP_PASSCODE;
  if (!code || req.path === "/health") return next();
  if (req.header("x-passcode") === code) return next();
  res.status(401).json({ error: "Wrong or missing passcode" });
});

app.use("/api", async (_req, res, next) => {
  try { await connectDB(); next(); } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, db: mongoose.connection.readyState === 1 ? "connected" : "connecting" });
});

app.use("/api", groups, members, expenses, finance);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof ZodError) return res.status(400).json({ error: err.issues[0]?.message ?? "Invalid input" });
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err.name === "CastError") return res.status(404).json({ error: "Not found" });
  res.status(400).json({ error: err.message });
});

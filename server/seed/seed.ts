import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../db.js";
import { Group, Member, Expense, Advance, Settlement } from "../models/index.js";
import { equalSplit } from "../services/split.js";

await connectDB();
if (await Group.exists({ name: "Goa Trip (sample)" })) { console.log("Sample data already exists."); process.exit(0); }
const g: any = await Group.create({ name: "Goa Trip (sample)", emoji: "🏖️", description: "Sample data" });
const [gourav, rahul, aman]: any[] = await Member.create(["Gourav", "Rahul", "Aman"].map((name) => ({ groupId: g._id, name })));
await Group.findByIdAndUpdate(g._id, { meMemberId: gourav._id });
await Advance.create([[gourav, 500000], [rahul, 200000], [aman, 100000]].map(([m, a]: any) => ({ groupId: g._id, memberId: m._id, amountPaise: a, note: "Initial advance" })));
const all = [gourav, rahul, aman].map((m) => String(m._id));
const ex = (title: string, amountPaise: number, category: string, paidBy: "pool" | "member", payer: any, day: number) => ({
  groupId: g._id, title, amountPaise, category, paidBy, paidByMemberId: payer?._id, date: new Date(Date.now() - day * 864e5), shares: equalSplit(amountPaise, all) });
await Expense.create([ex("Hotel", 300000, "Stay", "pool", null, 6), ex("Dinner at Baga", 90000, "Food", "member", rahul, 4), ex("Scooter fuel", 150000, "Fuel", "member", gourav, 2)]);
await Settlement.create({ groupId: g._id, fromMemberId: aman._id, toMemberId: gourav._id, amountPaise: 30000, note: "Sample payment" });
console.log("Seeded Goa Trip (sample)."); await mongoose.disconnect();

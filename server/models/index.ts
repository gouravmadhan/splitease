import mongoose from "mongoose";
const { Schema, model, models } = mongoose;

const paise = { type: Number, required: true, validate: { validator: Number.isInteger, message: "Amount must be integer paise" } };
const posPaise = { ...paise, min: [1, "Amount must be greater than zero"] as [number, string] };
const ref = (to: string) => ({ type: Schema.Types.ObjectId, ref: to, required: true });

export const Group = models.Group ?? model("Group", new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, trim: true },
  emoji: String, colour: String,
  archived: { type: Boolean, default: false },
  isDefault: { type: Boolean, default: false }, // the active group, stored server-side so it follows you across devices
  meMemberId: { type: Schema.Types.ObjectId, ref: "Member" },
}, { timestamps: true }));

const memberSchema = new Schema({
  groupId: ref("Group"),
  name: { type: String, required: true, trim: true, maxlength: 60 },
  contact: String, notes: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
memberSchema.index({ groupId: 1, isActive: 1 });
export const Member = models.Member ?? model("Member", memberSchema);

const expenseSchema = new Schema({
  groupId: ref("Group"),
  title: { type: String, required: true, trim: true },
  amountPaise: posPaise,
  category: { type: String, default: "Other" },
  date: { type: Date, required: true },
  paidBy: { type: String, enum: ["member", "pool"], required: true }, // pool = advance pool
  paidByMemberId: { type: Schema.Types.ObjectId, ref: "Member" },
  splitType: { type: String, enum: ["equal", "custom", "percent"], default: "equal" },
  shares: {
    type: [{ memberId: ref("Member"), sharePaise: { ...paise, min: 0 }, _id: false }],
    validate: [
      { validator: (s: unknown[]) => s.length > 0, message: "At least one participant is required" },
    ],
  },
  description: String,
  idempotencyKey: { type: String, index: { unique: true, sparse: true } },
}, { timestamps: true });
expenseSchema.index({ groupId: 1, date: -1 });
expenseSchema.pre("validate", function (next) {
  const sum = (this.shares ?? []).reduce((a: number, s: { sharePaise: number }) => a + s.sharePaise, 0);
  if (sum !== this.amountPaise) return next(new Error("Shares must add up to the expense amount"));
  if (this.paidBy === "member" && !this.paidByMemberId) return next(new Error("Payer is required"));
  next();
});
export const Expense = models.Expense ?? model("Expense", expenseSchema);

const advanceSchema = new Schema({
  groupId: ref("Group"), memberId: ref("Member"),
  amountPaise: posPaise, date: { type: Date, default: Date.now }, note: String,
  idempotencyKey: { type: String, index: { unique: true, sparse: true } },
}, { timestamps: true });
advanceSchema.index({ groupId: 1, memberId: 1 });
export const Advance = models.Advance ?? model("Advance", advanceSchema);

const settlementSchema = new Schema({
  groupId: ref("Group"), fromMemberId: ref("Member"), toMemberId: ref("Member"),
  amountPaise: posPaise, date: { type: Date, default: Date.now }, note: String,
  idempotencyKey: { type: String, index: { unique: true, sparse: true } },
}, { timestamps: true });
settlementSchema.index({ groupId: 1, date: -1 });
settlementSchema.pre("validate", function (next) {
  if (String(this.fromMemberId) === String(this.toMemberId)) return next(new Error("Payer and receiver must differ"));
  next();
});
export const Settlement = models.Settlement ?? model("Settlement", settlementSchema);


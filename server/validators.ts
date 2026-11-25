import { z } from "zod";
const text = (n: number) => z.string().trim().max(n).optional();
export const groupBody = z.object({
  name: z.string().trim().min(1, "Group name is required").max(80),
  description: text(300), emoji: z.string().max(8).optional(), meMemberId: z.string().nullable().optional(),
});
export const memberBody = z.object({
  name: z.string().trim().min(1, "Member name is required").max(60),
  contact: text(80), notes: text(300),
  advancePaise: z.number().int().min(0).optional(),
  idempotencyKey: z.string().max(80).optional(),
});
export const advanceBody = z.object({
  amountPaise: z.number().int().positive("Advance must be greater than zero"),
  date: z.coerce.date().optional(), note: text(200),
  idempotencyKey: z.string().max(80).optional(),
});

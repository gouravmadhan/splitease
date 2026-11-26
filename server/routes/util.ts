import type { RequestHandler } from "express";
export const wrap = (fn: RequestHandler): RequestHandler => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
export class HttpError extends Error { constructor(public status: number, msg: string, public code?: string) { super(msg); } }

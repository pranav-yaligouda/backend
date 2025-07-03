import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

// Simple audit logger middleware. In production, use Winston or similar.
const logFile = path.join(__dirname, '../../logs/audit.log');

function appendLog(entry: string) {
  fs.appendFile(logFile, entry + '\n', err => {
    if (err) console.error('Audit log write failed:', err);
  });
}

export function auditLogger(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    // Log only for mutating requests
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      const entry = JSON.stringify({
        time: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        user: user ? { id: user._id, role: user.role } : null,
        body: req.body,
        durationMs: duration
      });
      appendLog(entry);
    }
  });
  next();
}

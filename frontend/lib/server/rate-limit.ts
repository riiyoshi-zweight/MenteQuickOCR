interface AttemptRecord {
  timestamps: number[];
  lockedUntil: number;
}

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_DURATIONS_MS = [
  1 * 60 * 1000,   // 1 min after 5th fail
  5 * 60 * 1000,   // 5 min after 10th
  15 * 60 * 1000,  // 15 min after 15th
  60 * 60 * 1000,  // 60 min after 20th+
];

const store = new Map<string, AttemptRecord>();

function getKey(ip: string, userId: string): string {
  return `${ip}:${userId}`;
}

function pruneOld(record: AttemptRecord, now: number) {
  record.timestamps = record.timestamps.filter(t => now - t < WINDOW_MS);
}

function getLockoutDuration(totalFails: number): number {
  const tier = Math.floor(totalFails / MAX_ATTEMPTS) - 1;
  const idx = Math.min(tier, LOCKOUT_DURATIONS_MS.length - 1);
  return idx >= 0 ? LOCKOUT_DURATIONS_MS[idx] : 0;
}

export function checkRateLimit(ip: string, userId: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const key = getKey(ip, userId);
  const record = store.get(key);

  if (!record) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (record.lockedUntil > now) {
    return { allowed: false, retryAfterSeconds: Math.ceil((record.lockedUntil - now) / 1000) };
  }

  pruneOld(record, now);
  return { allowed: true, retryAfterSeconds: 0 };
}

export function recordFailedAttempt(ip: string, userId: string) {
  const now = Date.now();
  const key = getKey(ip, userId);
  let record = store.get(key);

  if (!record) {
    record = { timestamps: [], lockedUntil: 0 };
    store.set(key, record);
  }

  record.timestamps.push(now);
  pruneOld(record, now);

  if (record.timestamps.length >= MAX_ATTEMPTS) {
    const lockMs = getLockoutDuration(record.timestamps.length);
    record.lockedUntil = now + lockMs;
  }
}

export function resetAttempts(ip: string, userId: string) {
  store.delete(getKey(ip, userId));
}

// サーバレス環境向け: 古いエントリを定期的に GC
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store) {
      pruneOld(record, now);
      if (record.timestamps.length === 0 && record.lockedUntil <= now) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

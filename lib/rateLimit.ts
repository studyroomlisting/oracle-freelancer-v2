// Simple in-memory rate limiter, keyed by IP + route.
//
// LIMITATION: this state lives in the Node process memory. It works
// correctly on a single-instance deployment (one server, one process) but
// resets on restart and does NOT share state across multiple instances
// behind a load balancer. If you deploy with more than one instance, swap
// this for a shared store (Redis, Upstash, etc.) — the function signature
// below is designed to be a drop-in replacement.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count };
}

// Periodically clear expired buckets so this map doesn't grow forever on a
// long-running process.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}, 5 * 60 * 1000).unref?.();

export function getClientIp(req: { headers: { get: (name: string) => string | null } }): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

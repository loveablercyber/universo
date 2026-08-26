import { hashToken, query } from "@/lib/db.server";

function requestIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    null
  );
}

export async function enforceEloPublicRateLimit(request: Request, bucket: string) {
  const ip = requestIp(request);
  if (!ip) return;
  const secret = process.env.SESSION_SECRET || process.env.DATABASE_URL || "elo-public-form";
  const ipHash = hashToken(`${secret}:${bucket}:${ip}`);
  const result = await query<{ attempt_count: number }>(
    `with cleanup as (
       delete from universe.elo_public_submission_limits where updated_at<now()-interval '30 days'
     ), limited as (
       insert into universe.elo_public_submission_limits(ip_hash)
       values($1)
       on conflict(ip_hash) do update
         set attempt_count=case
               when universe.elo_public_submission_limits.window_started_at < now()-interval '1 hour'
               then 1 else universe.elo_public_submission_limits.attempt_count+1 end,
             window_started_at=case
               when universe.elo_public_submission_limits.window_started_at < now()-interval '1 hour'
               then now() else universe.elo_public_submission_limits.window_started_at end,
             updated_at=now()
       returning attempt_count
     ) select attempt_count from limited`,
    [ipHash],
  );
  if (Number(result.rows[0]?.attempt_count || 0) > 5) {
    throw Response.json(
      { ok: false, message: "Muitas solicitações. Aguarde uma hora e tente novamente." },
      { status: 429 },
    );
  }
}

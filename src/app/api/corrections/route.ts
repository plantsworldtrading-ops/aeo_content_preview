import { NextResponse } from "next/server";

// Saves a reviewer's corrections through the passcode-checked database function (supabase/guide_corrections.sql).
// SUPABASE_URL and SUPABASE_ANON_KEY are server-only env vars; the anon key can do nothing but call that function.
export async function POST(req: Request) {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key = process.env.SUPABASE_ANON_KEY?.trim().replace(/^["']|["']$/g, "");
  if (!url || !key) return NextResponse.json({ error: "Saving is not set up yet." }, { status: 503 });

  const body = await req.json().catch(() => null);
  const { passcode, guide_handle, content_hash, reviewer, items, overall } = body ?? {};
  if (typeof passcode !== "string" || typeof reviewer !== "string" || !reviewer.trim() || !Array.isArray(items)) {
    return NextResponse.json({ error: "Enter your name and the passcode." }, { status: 400 });
  }
  if (items.length === 0 && !overall?.trim()) {
    return NextResponse.json({ error: "Nothing to send yet." }, { status: 400 });
  }

  const res = await fetch(`${url}/rest/v1/rpc/submit_guide_correction`, {
    method: "POST",
    // Legacy anon keys are JWTs and also go in Authorization; new sb_publishable_ keys must only be sent as apikey.
    headers: { apikey: key, ...(key.startsWith("eyJ") && { Authorization: `Bearer ${key}` }), "Content-Type": "application/json" },
    body: JSON.stringify({
      p_passcode: passcode,
      p_guide_handle: guide_handle,
      p_content_hash: content_hash,
      p_reviewer: reviewer,
      p_items: items,
      p_overall: overall ?? null,
    }),
  });
  if (res.ok) return NextResponse.json({ id: await res.json() });

  const err = await res.json().catch(() => ({}));
  if (err.code === "28P01") return NextResponse.json({ error: "Wrong passcode." }, { status: 401 });
  console.error("submit_guide_correction failed", res.status, err);
  // The code (e.g. PGRST202, 42501) says what is wrong without exposing anything sensitive.
  return NextResponse.json({ error: "Could not save. Please try again.", code: err.code ?? res.status, detail: err.message ?? err.msg }, { status: 502 });
}

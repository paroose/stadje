import type { NextRequest } from "next/server";
import { cityForDate, isKnownPuzzleDate } from "@/lib/game/selection";
import { resolvePuzzleDate } from "@/lib/time";

// GET /api/puzzle/image?date=YYYY-MM-DD
//
// Proxies the day's photo without ever exposing its origin URL to the client. Wikimedia Commons
// filenames routinely embed the place name (e.g. "Veendam_105.JPG"), so handing the client the
// raw `image.url` from GET /api/puzzle would leak the answer through the filename alone, before
// any guess — this route exists specifically to close that leak. Not "re-hosting" in the
// storage sense (research.md's next/image decision still holds — nothing is stored, only
// streamed through per request).
// Wikimedia's User-Agent policy (https://meta.wikimedia.org/wiki/User-Agent_policy) requires a
// descriptive UA with contact info; requests with Node's generic default ("node") get throttled
// with HTTP 429, which surfaced to players as a missing photo.
const UPSTREAM_HEADERS = {
  "User-Agent":
    "Stadje/1.0 (https://stadje.paroose.dev; daily Dutch city guessing game)",
};

export async function GET(request: NextRequest) {
  const dateParam = request.nextUrl.searchParams.get("date");
  const date = resolvePuzzleDate(dateParam);

  if (!date || !isKnownPuzzleDate(date)) {
    return new Response("Invalid or unavailable date", { status: 400 });
  }

  const city = cityForDate(date);
  if (!city) {
    return new Response("Invalid or unavailable date", { status: 400 });
  }

  const upstream = await fetch(city.image.url, { headers: UPSTREAM_HEADERS });
  if (!upstream.ok || !upstream.body) {
    return new Response("Image unavailable", { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

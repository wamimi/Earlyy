import { EarlyError, ensure } from "./errors";
import type { RouteId } from "./model";

export type SupportTarget = { targetId: string; label: string; url: string };

export function parseTargetLink(route: RouteId, input: string): SupportTarget | { handle: string } {
  const value = input.trim();
  if (route === "spotify_saved_track") {
    let uri = value;
    if (!value.startsWith("spotify:")) {
      let url: URL;
      try { url = new URL(value); } catch { throw new EarlyError("INVALID_TARGET", "Paste a Spotify song or artist link from Share → Copy link."); }
      ensure(url.protocol === "https:" && url.hostname === "open.spotify.com" && !url.username && !url.password && !url.port,
        "INVALID_TARGET", "Use a link from open.spotify.com.");
      const match = url.pathname.match(/^\/(?:intl-[a-z-]+\/)?(track|artist)\/([A-Za-z0-9]{22})\/?$/);
      ensure(match, "INVALID_TARGET", "Choose a Spotify song or artist link. Albums are not supported yet.");
      uri = `spotify:${match[1]}:${match[2]}`;
    }
    const match = uri.match(/^spotify:(track|artist):([A-Za-z0-9]{22})$/);
    ensure(match, "INVALID_TARGET", "Paste a Spotify song or artist link.");
    return { targetId: uri, label: match[1] === "track" ? "Spotify song" : "Spotify artist", url: `https://open.spotify.com/${match[1]}/${match[2]}` };
  }
  if (/^UC[A-Za-z0-9_-]{22}$/.test(value)) return { targetId: value, label: "YouTube channel", url: `https://www.youtube.com/channel/${value}` };
  let url: URL;
  try { url = new URL(value); } catch { throw new EarlyError("INVALID_TARGET", "Paste a YouTube channel link from Share → Copy link."); }
  ensure(url.protocol === "https:" && ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)
    && !url.username && !url.password && !url.port, "INVALID_TARGET", "Use a youtube.com channel link.");
  const channel = url.pathname.match(/^\/channel\/(UC[A-Za-z0-9_-]{22})(?:\/(?:featured|videos|shorts|streams|playlists|community|about))?\/?$/);
  if (channel) return { targetId: channel[1], label: "YouTube channel", url: `https://www.youtube.com/channel/${channel[1]}` };
  const handle = url.pathname.match(/^\/(@[^/\s?#]{1,100})(?:\/(?:featured|videos|shorts|streams|playlists|community|about))?\/?$/);
  ensure(handle, "INVALID_TARGET", "Choose a channel link, rather than an individual YouTube video.");
  return { handle: handle[1] };
}

export async function resolveSupportTarget(route: RouteId, input: string): Promise<SupportTarget> {
  const parsed = parseTargetLink(route, input);
  if ("targetId" in parsed) return parsed;
  // Fetch public channel metadata only; never forward source-account credentials.
  const response = await fetch(`https://www.youtube.com/${parsed.handle}`, {
    redirect: "error", signal: AbortSignal.timeout(10000), headers: { "Accept-Language": "en-US,en;q=0.9" },
  });
  ensure(response.ok, "TARGET_LOOKUP_FAILED", "YouTube could not load this channel. Try its /channel/ link or retry.", 502);
  const reader = response.body?.getReader();
  ensure(reader, "TARGET_LOOKUP_FAILED", "YouTube returned no channel information.", 502);
  let size = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 3 * 1024 * 1024) { await reader.cancel(); ensure(false, "TARGET_LOOKUP_FAILED", "YouTube returned an unexpected page. Try the channel’s /channel/ link.", 502); }
    chunks.push(value);
  }
  const html = Buffer.concat(chunks).toString("utf8");
  const metadata = html.match(/"channelMetadataRenderer":(\{"title":"(?:[^"\\]|\\.)*"[\s\S]{0,12000}?"externalId":"UC[A-Za-z0-9_-]{22}"[\s\S]{0,12000}?\})/);
  const targetId = metadata?.[1].match(/"externalId":"(UC[A-Za-z0-9_-]{22})"/)?.[1];
  ensure(targetId, "TARGET_LOOKUP_FAILED", "Couldn’t resolve this channel. Try its /channel/ link; no proof has been requested.", 502);
  const title = metadata?.[1].match(/"title":("(?:[^"\\]|\\.)*")/)?.[1];
  return { targetId, label: title ? String(JSON.parse(title)).slice(0, 150) : "YouTube channel", url: `https://www.youtube.com/channel/${targetId}` };
}

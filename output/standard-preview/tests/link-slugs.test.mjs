// Readable link endings and YouTube addresses (pulsify-saas #72). Pure rules plus the claim helper on real SQLite.
import assert from "node:assert/strict";
import { slugify, slugProblem, claimSlug } from "../functions/_shared/link-slug.js";
import { fallbackLabel, isYouTubeAddress, isYouTubeHost, parseYouTubeUrl } from "../functions/_shared/youtube-url.js";
import { sql, env } from "./_links-env.mjs";

// ---------- slugify ----------
assert.equal(slugify("Trading EP12"), "trading-ep12");
assert.equal(slugify("  Why I quit my job -- & started trading!  "), "why-i-quit-my-job-and-started-trading");
assert.equal(slugify("Café Résumé tips"), "cafe-resume-tips");
assert.equal(slugify("It's 100% real"), "its-100-real", "apostrophes vanish instead of splitting words");
assert.equal(slugify("!!!"), "");
const long = slugify("this is a very long video title that keeps going and going well past forty characters");
assert.ok(long.length <= 40, `cut to 40, got ${long.length}`);
assert.ok(!long.endsWith("-") && !long.includes("--"));
assert.equal(long, "this-is-a-very-long-video-title-that", "cut at a word, not in the middle of one");

// ---------- the rules ----------
assert.equal(slugProblem("trading-ep12"), null);
assert.equal(slugProblem("case-study"), null);
assert.match(slugProblem("ab"), /at least 3/);
assert.match(slugProblem("a".repeat(61)), /under 60/);
assert.match(slugProblem("Trading"), /lowercase letters, numbers and hyphens/);
assert.match(slugProblem("has space"), /lowercase letters, numbers and hyphens/);
assert.match(slugProblem("-lead"), /hyphen/);
assert.match(slugProblem("trail-"), /hyphen/);
assert.match(slugProblem("two--hyphens"), /hyphen/);
for (const word of ["api", "admin", "login", "portal", "app"]) assert.match(slugProblem(word), /kept for the site/, word);

// ---------- claiming an ending ----------
const addLink = (token, client, slug, archived = 0) => sql.prepare(
  "INSERT INTO asset_links(token,client,label,target_url,created_at,archived,kind,slug) VALUES(?,?,?,?,?,?,'link',?)",
).run(token, client, token, "https://example.com/", "2026-10-01T00:00:00.000Z", archived, slug);

let claim = await claimSlug(env, "acme", "trading-ep12");
assert.deepEqual(claim, { slug: "trading-ep12" }, "a free ending is taken as asked");
addLink("tok-a1", "acme", "trading-ep12");

claim = await claimSlug(env, "acme", "trading-ep12");
assert.equal(claim.slug, "trading-ep12-2", "a name you already use gets a number");
claim = await claimSlug(env, "acme", "trading-ep12", { exact: true });
assert.match(claim.error, /already used/, "a typed ending is never changed behind your back");
assert.match(claim.error, /trading-ep12-2/, "the message offers the next free one");

claim = await claimSlug(env, "other", "trading-ep12");
assert.equal(claim.slug, "trading-ep12-2", "another client on the shared domain cannot take the same ending");
claim = await claimSlug(env, "other", "trading-ep12", { ownDomain: true });
assert.equal(claim.slug, "trading-ep12", "a client on its own domain only competes with its own links");

// A real token can never be shadowed by an ending.
claim = await claimSlug(env, "other", "tok-a1");
assert.equal(claim.slug, "tok-a1-2");

// An ending the same client archived comes back to them.
addLink("tok-arch", "acme", "old-launch", 1);
claim = await claimSlug(env, "acme", "old-launch", { exact: true });
assert.equal(claim.slug, "old-launch");
assert.equal(sql.prepare("SELECT slug FROM asset_links WHERE token='tok-arch'").get().slug, null, "the archived link lets go");
// ...but another client's archived link keeps it, so a printed link can't land on someone else's page.
addLink("tok-arch2", "acme", "kept-launch", 1);
claim = await claimSlug(env, "other", "kept-launch", { exact: true });
assert.match(claim.error, /already used/);

// ---------- YouTube addresses ----------
const id = "dQw4w9WgXcQ";
for (const input of [
  `https://www.youtube.com/watch?v=${id}`,
  `https://youtube.com/watch?v=${id}&si=trackingjunk&feature=share`,
  `https://m.youtube.com/watch?v=${id}`,
  `https://youtu.be/${id}?si=abc`,
  `youtu.be/${id}`,
  `https://www.youtube.com/shorts/${id}`,
  `https://www.youtube.com/live/${id}?feature=share`,
  `https://www.youtube.com/embed/${id}`,
]) {
  const parsed = parseYouTubeUrl(input);
  assert.deepEqual({ kind: parsed?.kind, id: parsed?.id, url: parsed?.url }, { kind: "video", id, url: `https://www.youtube.com/watch?v=${id}` }, input);
}
assert.equal(parseYouTubeUrl(`https://youtu.be/${id}?t=95`).url, `https://www.youtube.com/watch?v=${id}&t=95s`, "a start time is kept");
assert.equal(parseYouTubeUrl(`https://www.youtube.com/watch?v=${id}&t=1m5s`).url, `https://www.youtube.com/watch?v=${id}`, "an odd time format is dropped");

assert.deepEqual(parseYouTubeUrl("https://www.youtube.com/@acmetrading/videos"), { kind: "channel", handle: "acmetrading", url: "https://www.youtube.com/@acmetrading" });
assert.deepEqual(parseYouTubeUrl("https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv"), { kind: "channel", channelId: "UCabcdefghijklmnopqrstuv", url: "https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv" });
assert.equal(parseYouTubeUrl("https://www.youtube.com/c/AcmeTrading").kind, "channel");
assert.equal(parseYouTubeUrl("https://www.youtube.com/user/acme").kind, "channel");
assert.equal(parseYouTubeUrl("https://www.youtube.com/playlist?list=PLabcdefghij123").kind, "playlist");
assert.equal(parseYouTubeUrl("https://www.youtube.com/").kind, "other", "the home page is neither a video nor a channel");
assert.equal(parseYouTubeUrl("https://www.youtube.com/watch?v=short").kind, "other", "a broken video id is not accepted");
assert.equal(parseYouTubeUrl("https://example.com/watch?v=dQw4w9WgXcQ"), null, "other sites are not YouTube");
assert.equal(parseYouTubeUrl("https://notyoutube.com/watch?v=dQw4w9WgXcQ"), null);
assert.equal(parseYouTubeUrl("https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ"), null, "look-alike hosts are not YouTube");
assert.equal(isYouTubeHost("www.youtube.com"), true);
assert.equal(isYouTubeHost("youtube.com.evil.example"), false);
assert.equal(isYouTubeAddress("not a url at all"), false);

assert.equal(fallbackLabel({ kind: "video", id }), `YouTube video ${id}`);
assert.equal(fallbackLabel({ kind: "channel", handle: "acmetrading" }), "YouTube channel @acmetrading");

console.log("link-slugs: all checks passed");

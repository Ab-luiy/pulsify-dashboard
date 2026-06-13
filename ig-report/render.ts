// render.ts — deterministic scoring + self-contained HTML report. No network here.

export interface ReelInsights {
  reach: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saved: number;
  totalInteractions: number;
  avgWatchTimeMs: number; // ig_reels_avg_watch_time (milliseconds)
}

export interface Reel {
  id: string;
  caption: string;
  permalink: string;
  timestamp: string; // ISO 8601
  thumbnailDataUri: string; // base64 data URI, or "" if unavailable
  insights: ReelInsights;
}

export interface ScoredReel extends Reel {
  engagementRate: number; // total_interactions / reach
  saveRate: number; // saved / reach
  shareRate: number; // shares / reach
  hookScore: number; // 0-100, relative to your own set
  diagnosis: string;
  rank: number;
}

const safeRate = (n: number, d: number): number => (d > 0 ? n / d : 0);

/** Returns a min-max normalizer over the given values, mapping into [0,1]. */
function normalizer(values: number[]): (v: number) => number {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return (v: number) => (max === min ? 0.5 : (v - min) / (max - min));
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Hook Score is a RELATIVE ranking across your own last-14-days reels — it
 * answers "which of my reels hooked + held people best", not an absolute grade.
 * Blend: retention (avg watch time) 40%, save rate 25%, share rate 20%,
 * engagement rate 15% — each min-max normalized across the set.
 */
export function scoreReels(reels: Reel[]): ScoredReel[] {
  if (reels.length === 0) return [];

  const saveRates = reels.map((r) => safeRate(r.insights.saved, r.insights.reach));
  const shareRates = reels.map((r) => safeRate(r.insights.shares, r.insights.reach));
  const engRates = reels.map((r) => safeRate(r.insights.totalInteractions, r.insights.reach));

  const nWatch = normalizer(reels.map((r) => r.insights.avgWatchTimeMs));
  const nSave = normalizer(saveRates);
  const nShare = normalizer(shareRates);
  const nEng = normalizer(engRates);
  const medianReach = median(reels.map((r) => r.insights.reach));

  const scored: ScoredReel[] = reels.map((r) => {
    const saveRate = safeRate(r.insights.saved, r.insights.reach);
    const shareRate = safeRate(r.insights.shares, r.insights.reach);
    const engagementRate = safeRate(r.insights.totalInteractions, r.insights.reach);
    const hookScore = Math.round(
      100 *
        (0.4 * nWatch(r.insights.avgWatchTimeMs) +
          0.25 * nSave(saveRate) +
          0.2 * nShare(shareRate) +
          0.15 * nEng(engagementRate)),
    );
    return {
      ...r,
      saveRate,
      shareRate,
      engagementRate,
      hookScore,
      diagnosis: diagnose(r, hookScore, medianReach),
      rank: 0,
    };
  });

  scored.sort((a, b) => b.hookScore - a.hookScore);
  scored.forEach((r, i) => (r.rank = i + 1));
  return scored;
}

function diagnose(reel: Reel, hookScore: number, medianReach: number): string {
  const { reach, shares, saved } = reel.insights;
  const lowReach = reach < medianReach;
  const saveRate = safeRate(saved, reach);
  const shareRate = safeRate(shares, reach);

  if (hookScore >= 70 && lowReach) {
    return "Strong hook, IG didn't push it — repost or remix; the content earned more reach than it got.";
  }
  if (hookScore < 40 && !lowReach) {
    return "IG pushed it but retention was weak — the first 3 seconds need a sharper hook.";
  }
  if (saveRate >= 0.02) {
    return "High save rate — people want it for later. Make a follow-up or turn it into a series.";
  }
  if (shareRate >= 0.01) {
    return "Highly shareable — lean into this format/topic again.";
  }
  if (hookScore >= 70) {
    return "Top performer — strong hook and distribution. Study what worked and repeat it.";
  }
  return "Middle of the pack — test a different hook, angle, or opening visual.";
}

// ---------- HTML report ----------

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const fmt = (n: number): string => new Intl.NumberFormat("en-US").format(Math.round(n));
const pct = (n: number): string => `${(n * 100).toFixed(1)}%`;
const secs = (ms: number): string => `${(ms / 1000).toFixed(1)}s`;

function scoreColor(score: number): string {
  if (score >= 70) return "#16a34a";
  if (score >= 40) return "#d97706";
  return "#dc2626";
}

function reelCard(r: ScoredReel): string {
  const caption = r.caption ? esc(r.caption.slice(0, 110)) + (r.caption.length > 110 ? "…" : "") : "(no caption)";
  const date = new Date(r.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const thumb = r.thumbnailDataUri
    ? `<img class="thumb" src="${r.thumbnailDataUri}" alt="reel thumbnail" />`
    : `<div class="thumb thumb--empty">No<br/>thumb</div>`;
  const color = scoreColor(r.hookScore);

  const metric = (label: string, value: string) =>
    `<div class="metric"><span class="metric__v">${value}</span><span class="metric__l">${label}</span></div>`;

  return `
  <article class="card">
    <div class="rank">#${r.rank}</div>
    <a class="thumb-link" href="${esc(r.permalink)}" target="_blank" rel="noopener">${thumb}</a>
    <div class="body">
      <div class="card-head">
        <div class="caption">${caption}</div>
        <div class="hook" style="--c:${color}">
          <span class="hook__n">${r.hookScore}</span>
          <span class="hook__l">Hook</span>
        </div>
      </div>
      <div class="meta">${date} · <a href="${esc(r.permalink)}" target="_blank" rel="noopener">Open on Instagram ↗</a></div>
      <div class="metrics">
        ${metric("Reach", fmt(r.insights.reach))}
        ${metric("Views", fmt(r.insights.views))}
        ${metric("Avg watch", secs(r.insights.avgWatchTimeMs))}
        ${metric("Saves", fmt(r.insights.saved))}
        ${metric("Shares", fmt(r.insights.shares))}
        ${metric("Eng. rate", pct(r.engagementRate))}
      </div>
      <div class="diagnosis">${esc(r.diagnosis)}</div>
    </div>
  </article>`;
}

export function renderReport(reels: ScoredReel[]): string {
  const generated = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const totalReach = reels.reduce((s, r) => s + r.insights.reach, 0);
  const totalViews = reels.reduce((s, r) => s + r.insights.views, 0);
  const avgHook = reels.length ? Math.round(reels.reduce((s, r) => s + r.hookScore, 0) / reels.length) : 0;
  const top = reels[0];

  const summary = (label: string, value: string) =>
    `<div class="kpi"><div class="kpi__v">${value}</div><div class="kpi__l">${label}</div></div>`;

  const cards = reels.map(reelCard).join("\n");
  const empty = `<div class="empty">No reels found in the window. Post a few reels and re-run.</div>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Instagram Reels — Hook Score Report</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: #f4f5f7; color: #0f172a;
    font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .wrap { max-width: 820px; margin: 0 auto; padding: 40px 24px 80px; }
  header h1 { margin: 0 0 4px; font-size: 26px; letter-spacing: -0.02em; }
  header .sub { color: #64748b; font-size: 13px; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 28px 0 36px; }
  .kpi { background: #fff; border: 1px solid #e6e8ec; border-radius: 14px; padding: 16px; text-align: center; }
  .kpi__v { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
  .kpi__l { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; margin-top: 4px; }
  .card {
    display: grid; grid-template-columns: 86px 1fr; gap: 16px; position: relative;
    background: #fff; border: 1px solid #e6e8ec; border-radius: 16px; padding: 16px; margin-bottom: 14px;
    transition: box-shadow .15s ease, transform .15s ease;
  }
  .card:hover { box-shadow: 0 8px 28px rgba(15,23,42,.08); transform: translateY(-1px); }
  .rank { position: absolute; top: -8px; left: -8px; background: #0f172a; color: #fff;
    font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 999px; }
  .thumb-link { display: block; }
  .thumb { width: 86px; height: 120px; object-fit: cover; border-radius: 10px; background: #e2e8f0; display: block; }
  .thumb--empty { display: grid; place-items: center; color: #94a3b8; font-size: 11px; text-align: center; }
  .card-head { display: flex; align-items: flex-start; gap: 12px; justify-content: space-between; }
  .caption { font-weight: 600; font-size: 14px; line-height: 1.35; }
  .hook { flex: none; text-align: center; line-height: 1; }
  .hook__n { display: block; font-size: 24px; font-weight: 800; color: var(--c); letter-spacing: -0.03em; }
  .hook__l { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; }
  .meta { font-size: 12px; color: #94a3b8; margin: 4px 0 12px; }
  .meta a { color: #6366f1; text-decoration: none; }
  .metrics { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; padding: 12px 0; border-top: 1px solid #f1f5f9; }
  .metric { text-align: center; }
  .metric__v { display: block; font-weight: 700; font-size: 14px; }
  .metric__l { display: block; font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 2px; }
  .diagnosis { margin-top: 10px; padding: 10px 12px; background: #f8fafc; border-left: 3px solid #6366f1;
    border-radius: 8px; font-size: 13px; color: #334155; }
  .empty { background: #fff; border: 1px dashed #cbd5e1; border-radius: 16px; padding: 48px; text-align: center; color: #64748b; }
  footer { margin-top: 32px; text-align: center; font-size: 12px; color: #cbd5e1; }
  @media (max-width: 560px) {
    .kpis { grid-template-columns: repeat(2, 1fr); }
    .metrics { grid-template-columns: repeat(3, 1fr); }
  }
</style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>Reels Hook Score</h1>
      <div class="sub">${reels.length} reel${reels.length === 1 ? "" : "s"} · generated ${generated}</div>
    </header>
    <section class="kpis">
      ${summary("Reels", String(reels.length))}
      ${summary("Total reach", fmt(totalReach))}
      ${summary("Total views", fmt(totalViews))}
      ${summary("Avg hook", String(avgHook))}
    </section>
    ${top ? `<p style="color:#475569;font-size:14px;margin:0 0 20px">🏆 Your strongest hook this period: <b>${esc((top.caption || "(no caption)").slice(0, 60))}</b> — score ${top.hookScore}.</p>` : ""}
    ${reels.length ? cards : empty}
    <footer>Built with Composio + Claude · Hook Score is relative to your own reels</footer>
  </div>
</body>
</html>`;
}

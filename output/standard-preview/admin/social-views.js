// Instagram and YouTube: native shell views over the data spine. They replace
// the two Mirage dashboard tabs (#tab-instagram and the "metrics" tab that the
// sidebar labelled YouTube). Everything painted here comes from
// /api/spine/snapshot and /api/spine/series for scope=operator. A field that
// the last pull did not carry shows as "No data", never as a made-up zero.
(() => {
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const TZ = "Europe/Istanbul";
  const has = (v) => v !== undefined && v !== null && v !== "";
  const num = (v) => (has(v) && Number.isFinite(Number(v)) ? Number(v) : null);
  const fmt = (v) => {
    const n = num(v);
    if (n === null) return "No data";
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1) + "M";
    return n.toLocaleString("en-US");
  };
  const pct = (part, whole) => { const p = num(part), w = num(whole); return p === null || !w ? null : (p / w) * 100; };
  const seconds = (ms) => { const n = num(ms); return n === null ? null : (n / 1000).toFixed(1) + "s"; };
  const stamp = (iso) => (iso ? new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) : "");
  const day = (iso) => (iso ? new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "short" }).format(new Date(iso)) : "");
  function ago(iso, now = Date.now()) {
    if (!iso) return "";
    const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
    if (s < 60) return "just now";
    const m = Math.floor(s / 60); if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
    const h = Math.floor(m / 60); if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
    const d = Math.floor(h / 24); if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
    return day(iso);
  }
  function duration(iso) {
    const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || "");
    if (!m) return "";
    const h = +(m[1] || 0), mi = +(m[2] || 0), s = +(m[3] || 0);
    return (h ? h + ":" + String(mi).padStart(2, "0") : String(mi)) + ":" + String(s).padStart(2, "0");
  }
  const COUNTRIES = { US: "United States", GB: "United Kingdom", CA: "Canada", AU: "Australia", DE: "Germany", FR: "France", IE: "Ireland", NL: "Netherlands", NZ: "New Zealand", IN: "India", PK: "Pakistan", BD: "Bangladesh", ID: "Indonesia", NG: "Nigeria", PH: "Philippines", TR: "Turkey", EG: "Egypt", BR: "Brazil", MX: "Mexico", ZA: "South Africa", SA: "Saudi Arabia", AE: "United Arab Emirates", IT: "Italy", ES: "Spain", MA: "Morocco", DZ: "Algeria", IQ: "Iraq", VN: "Vietnam", MY: "Malaysia", KE: "Kenya", NP: "Nepal", LK: "Sri Lanka", JO: "Jordan", TN: "Tunisia", SE: "Sweden", PL: "Poland", RU: "Russia", UA: "Ukraine", AR: "Argentina", CO: "Colombia" };
  const country = (code) => { try { return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || COUNTRIES[code] || code; } catch { return COUNTRIES[code] || code; } };

  async function api(path) {
    const r = await fetch(path, { headers: { "content-type": "application/json", "x-pulsify-operator": "1" }, cache: "no-store" });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.ok === false) throw PulsifyShell.failure(r.status);
    return d;
  }
  // One warm copy per source so a second visit paints without a skeleton.
  const warm = new Map();
  async function pull(source) {
    const [snap, series] = await Promise.all([
      api(`/api/spine/snapshot?scope=operator&source=${source}`),
      api(`/api/spine/series?scope=operator&source=${source}`),
    ]);
    const kinds = {}; let capturedAt = "";
    for (const row of snap.snapshots || []) {
      if (row.source !== source) continue;
      kinds[row.kind] = row.payload || {};
      if (row.captured_at > capturedAt) capturedAt = row.captured_at;
    }
    const metrics = {};
    for (const p of series.points || []) {
      if (p.source !== source) continue;
      const v = num(p.value); if (v === null) continue;
      (metrics[p.metric] ||= []).push({ ts: p.ts, value: v });
    }
    for (const list of Object.values(metrics)) list.sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));
    const data = { kinds, metrics, capturedAt, empty: !Object.keys(kinds).length };
    warm.set(source, data);
    return data;
  }
  const latest = (list) => (list && list.length ? list[list.length - 1].value : null);

  // Inline sparkline: stroke follows the cell's text colour at 60 percent,
  // draws in over --dur with --ease (see social-views.css).
  function spark(list) {
    if (!list || list.length < 2) return "";
    const W = 100, H = 28, pad = 2, values = list.map((p) => p.value);
    const max = Math.max(...values), min = Math.min(...values), span = max - min || 1;
    const step = (W - pad * 2) / (values.length - 1);
    const pts = values.map((v, i) => [pad + i * step, H - pad - ((v - min) / span) * (H - pad * 2)]);
    const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
    return `<svg class="sv-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}"/></svg>`;
  }
  function trend(list, note) {
    if (!list || !list.length) return note;
    if (list.length === 1) return `First reading ${day(list[0].ts)}`;
    const delta = list[list.length - 1].value - list[0].value;
    const word = delta === 0 ? "No change" : (delta > 0 ? "+" : "-") + fmt(Math.abs(delta));
    return `${word} since ${day(list[0].ts)}`;
  }
  // cell: {label, value (already formatted or null), series, note}
  function kpi(c) {
    const missing = c.value === null || c.value === undefined || c.value === "No data";
    return `<div class="ps-kpi sv-kpi"><small>${esc(c.label)}</small><b class="${missing ? "sv-none" : ""}">${esc(missing ? "No data" : c.value)}</b>${missing ? "" : spark(c.series)}<small class="sv-kpi-foot">${esc(missing ? "Not in the last pull" : trend(c.series, c.note))}</small></div>`;
  }
  const kpiSkeleton = () => Array.from({ length: 8 }, () => '<div class="ps-kpi sv-kpi"><div class="skeleton sv-sk-label"></div><div class="skeleton sv-sk-value"></div></div>').join("");
  const rowSkeleton = (n = 4) => `<div class="sv-list-skeleton">${Array.from({ length: n }, () => '<div class="sv-row-skeleton"><div class="skeleton sv-sk-thumb"></div><div><div class="skeleton sv-sk-line"></div><div class="skeleton sv-sk-line short"></div></div></div>').join("")}</div>`;
  const stat = (label, value) => `<div class="sv-stat"><span>${esc(label)}</span><b>${esc(value)}</b></div>`;
  const bar = (label, value, max, text) => `<div class="sv-bar"><span class="sv-bar-label">${esc(label)}</span><span class="sv-bar-track"><span style="width:${max ? Math.max(0, Math.min(100, (value / max) * 100)) : 0}%"></span></span><span class="sv-bar-num">${esc(text)}</span></div>`;
  const pill = (ok, label) => `<span class="int-pill ${ok ? "int-pill-ok" : "int-pill-warn"}">${esc(label)}</span>`;
  const asOf = (iso) => (iso ? `<p class="sv-asof int-note">Data as of ${esc(stamp(iso))} (Istanbul)</p>` : "");
  function media(item, alt) {
    const uri = item.thumbnailDataUri || item.thumbnail_url || item.media_url || "";
    if (!uri) return `<span class="sv-thumb sv-thumb-empty">${PulsifyShell.icon("image")}</span>`;
    if (uri.startsWith("data:video") || /\.mp4(\?|$)/.test(uri)) return `<video class="sv-thumb" src="${esc(uri)}" muted playsinline preload="auto" aria-label="${esc(alt)}"></video>`;
    return `<img class="sv-thumb" src="${esc(uri)}" alt="${esc(alt)}" loading="lazy">`;
  }
  const link = (href, inner, cls = "") => (href ? `<a class="${cls}" href="${esc(href)}" target="_blank" rel="noopener">${inner}</a>` : `<span class="${cls}">${inner}</span>`);

  // Shared frame: header with Refresh, then a body the view fills. load()
  // owns skeleton, warm cache, error and empty states for one source.
  function frame(root, { source, title, note, icon, draw }) {
    let disposed = false, sequence = 0, data = warm.get(source) || null;
    root.innerHTML = `<div class="ps-page-header sv-head"><div><h1>${esc(title)}</h1><p>${esc(note)}</p></div><button class="ps-control" id="sv-refresh">Refresh</button></div><div id="sv-body" class="sv-body"></div>`;
    const body = root.querySelector("#sv-body"), button = root.querySelector("#sv-refresh");
    function skeleton() { body.innerHTML = `<div class="ps-kpis">${kpiSkeleton()}</div><h2>${esc(source === "instagram" ? "Reels" : "Latest video")}</h2>${rowSkeleton(source === "instagram" ? 4 : 1)}`; }
    function paint() {
      if (!data) return;
      if (data.empty) {
        body.replaceChildren(PulsifySurface.empty(icon, `${title} is not connected`, `Connect ${title} in Integrations. The first pull lands here on the next sync.`, "Open Integrations", () => window.PulsifyOperatorShell?.go("integrations")));
        return;
      }
      body.innerHTML = draw(data);
      body.querySelectorAll("[data-go]").forEach((b) => (b.onclick = () => window.PulsifyOperatorShell?.go(b.dataset.go)));
    }
    async function load() {
      if (disposed || !root.isConnected) return;
      const current = ++sequence;
      body.querySelector(":scope > .ps-inline-error")?.remove();
      if (!data) skeleton();
      PulsifyShell.pending(button);
      try {
        const fresh = await pull(source);
        if (disposed || current !== sequence) return;
        data = fresh; paint();
      } catch (e) {
        if (disposed || current !== sequence) return;
        if (!data) body.replaceChildren();
        PulsifyShell.inlineError(body, e, load);
      } finally {
        if (!disposed && current === sequence) PulsifyShell.pending(button, false);
      }
    }
    button.onclick = load;
    paint();
    load();
    return () => { disposed = true; sequence++; };
  }

  // Instagram. Old tab: profile strip, reels performance and leaderboard,
  // reach-per-post sparkline, posts grid, stories grid, content funnel,
  // audience (countries and age), cadence notes.
  function drawInstagram({ kinds, metrics, capturedAt }) {
    const p = kinds.profile || {}, a = kinds.account || {}, c = kinds.content || {}, cad = kinds.cadence || {}, aud = kinds.audience || {};
    const reels = Array.isArray(kinds.reels) ? kinds.reels : [], posts = Array.isArray(kinds.posts) ? kinds.posts : [], stories = Array.isArray(kinds.stories) ? kinds.stories : [];
    const rs = kinds["reels-summary"] || {}, ps = kinds["posts-summary"] || {}, ss = kinds["stories-summary"] || {};
    const followers = latest(metrics.followers) ?? num(p.followers), mediaCount = latest(metrics.media_count) ?? num(p.mediaCount);
    const reach30 = latest(metrics.reach_30d) ?? num(a.reach30d), views30 = latest(metrics.views_30d) ?? num(a.views30d);
    const reachByPost = Array.isArray(c.reachByPost) ? c.reachByPost.map((x) => ({ ts: x.date, value: num(x.reach) })).filter((x) => x.value !== null) : [];
    const saveRate = pct(c.totalSaves, c.totalReach);
    const cells = [
      { label: "Followers", value: followers === null ? null : fmt(followers), series: metrics.followers, note: "From the profile" },
      { label: "Following", value: num(p.following) === null ? null : fmt(p.following), note: "From the profile" },
      { label: "Posts", value: mediaCount === null ? null : fmt(mediaCount), series: metrics.media_count, note: "All media on the account" },
      { label: "Reach, 30 days", value: reach30 === null ? null : fmt(reach30), series: metrics.reach_30d, note: "Accounts reached" },
      { label: "Views, 30 days", value: views30 === null ? null : fmt(views30), series: metrics.views_30d, note: "Plays across formats" },
      { label: "Reel reach, 90 days", value: num(c.totalReach) === null ? null : fmt(c.totalReach), series: reachByPost, note: "Across recent reels" },
      { label: "Average hook", value: num(c.avgHook) === null ? null : fmt(c.avgHook), note: "Score out of 100 across reels" },
      { label: "Save rate", value: saveRate === null ? null : saveRate.toFixed(1) + "%", note: "Saves over reel reach" },
    ];
    const handle = p.username ? "@" + p.username : "";
    const avatar = p.profilePicture ? `<img class="sv-avatar" src="${esc(p.profilePicture)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'sv-avatar',textContent:'${esc((p.username || "?").slice(0, 2).toUpperCase())}'}))">` : `<span class="sv-avatar">${esc((p.username || "?").slice(0, 2).toUpperCase())}</span>`;
    const profile = Object.keys(p).length ? `<section class="sv-profile">${avatar}<div class="sv-profile-id"><div class="sv-profile-handle">${handle ? link("https://instagram.com/" + encodeURIComponent(p.username), esc(handle)) : "No handle in the last pull"}${p.accountType ? `<span class="int-pill">${esc(String(p.accountType).toLowerCase().replace(/_/g, " "))}</span>` : ""}</div>${p.biography ? `<p class="sv-bio">${esc(p.biography)}</p>` : ""}${p.website ? link(p.website, esc(String(p.website).replace(/^https?:\/\//, "")), "sv-site") : ""}</div></section>` : "";

    const reelCount = num(rs.count ?? c.reelsCount);
    const reelNote = reelCount === null ? "" : `${fmt(reelCount)} reels in 90 days`;
    const reelStats = [["Views", fmt(c.totalViews)], ["Average watch", seconds(c.avgWatchMs) ?? "No data"], ["Saves", fmt(c.totalSaves)], ["Shares", fmt(c.totalShares)], ["Interactions", fmt(c.totalInteractions)]];
    const reelRows = [...reels].sort((x, y) => (x.rank ?? 99) - (y.rank ?? 99)).map((r) => {
      const i = r.insights || {}, hook = num(r.hookScore);
      return `<tr><td><div class="sv-cell-media">${link(r.permalink, media(r, "Reel thumbnail"), "sv-thumb-link")}<div class="sv-cell-text"><span>${esc((r.caption || "No caption").slice(0, 90))}</span><small>${esc(r.timestamp ? day(r.timestamp) : "")}${r.diagnosis ? " · " + esc(r.diagnosis) : ""}</small></div></div></td><td><span class="sv-hook ${hook === null ? "" : hook >= 70 ? "ok" : hook >= 40 ? "mid" : "low"}">${esc(hook === null ? "n/a" : hook)}</span></td><td>${esc(fmt(i.reach))}</td><td>${esc(fmt(i.views))}</td><td>${esc(seconds(i.avgWatchTimeMs) ?? "n/a")}</td><td>${esc(fmt(i.saved))}</td><td>${esc(fmt(i.shares))}</td></tr>`;
    }).join("");
    const reelsBlock = `<section class="sv-section"><h2>Reels <span>${esc(reelNote)}</span></h2><div class="sv-stats">${reelStats.map(([l, v]) => stat(l, v)).join("")}</div>${reels.length ? `<div class="int-table sv-table"><table><thead><tr><th>Reel</th><th>Hook</th><th>Reach</th><th>Views</th><th>Watch</th><th>Saves</th><th>Shares</th></tr></thead><tbody>${reelRows}</tbody></table></div>` : `<div class="sv-empty">No reels in the last 90 days. The next pull picks up anything you post.</div>`}</section>`;

    const tile = (item, alt, parts) => `<div class="sv-tile">${link(item.permalink, media(item, alt), "sv-tile-media")}<div class="sv-tile-meta">${parts.map((x) => `<span>${esc(x)}</span>`).join("")}</div></div>`;
    const postStats = [["Posts", fmt(ps.count)], ["Reach", fmt(ps.totalReach)], ["Saves", fmt(ps.totalSaves)], ["Save rate", (() => { const r = pct(ps.totalSaves, ps.totalReach); return r === null ? "No data" : r.toFixed(1) + "%"; })()], ["Interactions", fmt(ps.totalInteractions)]];
    const postsBlock = `<section class="sv-section"><h2>Posts <span>feed photos and carousels, 90 days</span></h2><div class="sv-stats">${postStats.map(([l, v]) => stat(l, v)).join("")}</div>${posts.length ? `<div class="sv-tiles">${posts.slice(0, 12).map((x) => tile(x, "Post thumbnail", [`${fmt(x.insights?.reach)} reach`, `${fmt(x.insights?.saved)} saves`])).join("")}</div>` : `<div class="sv-empty">No feed posts in the last 90 days. The grid is the landing page of the profile funnel; carousels earn saves that reels do not.</div>`}</section>`;
    const storyStats = [["Captured", fmt(ss.count)], ["Reach", fmt(ss.totalReach)], ["Replies", fmt(ss.totalReplies)], ["Profile visits", fmt(ss.totalProfileVisits)], ["Posted, 7 days", fmt(cad.stories7d)]];
    const storiesBlock = `<section class="sv-section"><h2>Stories <span>captured daily, kept after they expire</span></h2><div class="sv-stats">${storyStats.map(([l, v]) => stat(l, v)).join("")}</div>${stories.length ? `<div class="sv-tiles">${stories.slice(0, 12).map((x) => tile(x, "Story", [`${fmt(x.insights?.reach)} reach`, `${fmt(x.insights?.replies)} replies`, `${fmt(x.insights?.profileVisits)} visits`])).join("")}</div>` : `<div class="sv-empty">No stories captured yet. Stories expire after 24 hours; the daily pull keeps the ones it catches.</div>`}</section>`;

    const funnel = [["Reach", num(c.totalReach)], ["Interactions", num(c.totalInteractions)], ["Saves and shares", num(c.totalSaves) === null && num(c.totalShares) === null ? null : (num(c.totalSaves) || 0) + (num(c.totalShares) || 0)], ["Followers", followers]];
    const fmax = Math.max(1, ...funnel.map(([, v]) => v || 0));
    const hasTrigger = /\bdm\b|message me/i.test(p.biography || "");
    const cadenceRows = [["Reels this week", num(cad.reels7d), 7, "standard is one a day"], ["Stories this week", num(cad.stories7d), 7, "standard is one a day"], ["Posts this week", num(cad.posts7d), null, "carousels build the grid"]];
    const cadenceBlock = `<section class="sv-card"><h3>Cadence</h3><div class="sv-rows">${cadenceRows.map(([l, v, target, why]) => `<div class="sv-row"><div><span>${esc(l)}</span><small>${esc(why)}</small></div><b>${esc(v === null ? "No data" : fmt(v))}${target ? ` <em>of ${target}</em>` : ""}</b>${target && v !== null ? pill(v >= target, v >= target ? "On cadence" : "Behind") : ""}</div>`).join("")}<div class="sv-row"><div><span>DM trigger word in bio</span><small>the profile funnel needs a keyword to reply to</small></div><b>${p.biography ? (hasTrigger ? "Yes" : "No") : "No data"}</b>${p.biography ? pill(hasTrigger, hasTrigger ? "Set" : "Missing") : ""}</div></div><h3>Content funnel <span>recent reels</span></h3><div class="sv-bars">${funnel.map(([l, v]) => bar(l, v || 0, fmax, v === null ? "No data" : fmt(v))).join("")}</div></section>`;

    const countries = Array.isArray(aud.countries) ? aud.countries : [], ages = Array.isArray(aud.age) ? aud.age : [];
    const ctot = countries.reduce((s, x) => s + (num(x.value) || 0), 0), atot = ages.reduce((s, x) => s + (num(x.value) || 0), 0);
    const cmax = Math.max(1, ...countries.map((x) => num(x.value) || 0)), amax = Math.max(1, ...ages.map((x) => num(x.value) || 0));
    const audienceBlock = `<section class="sv-card"><h3>Audience <span>who follows you</span></h3>${countries.length || ages.length ? `${countries.length ? `<h4>Top countries</h4><div class="sv-bars">${[...countries].sort((x, y) => (num(y.value) || 0) - (num(x.value) || 0)).slice(0, 6).map((x) => bar(country(x.name), num(x.value) || 0, cmax, ctot ? Math.round(((num(x.value) || 0) / ctot) * 100) + "%" : fmt(x.value))).join("")}</div>` : ""}${ages.length ? `<h4>Age</h4><div class="sv-bars">${ages.map((x) => bar(x.name, num(x.value) || 0, amax, atot ? Math.round(((num(x.value) || 0) / atot) * 100) + "%" : fmt(x.value))).join("")}</div>` : ""}` : `<div class="sv-empty">No audience breakdown in the last pull. Instagram only reports it above 100 followers.</div>`}</section>`;

    return `${profile}<div class="ps-kpis">${cells.map(kpi).join("")}</div>${reelsBlock}${postsBlock}${storiesBlock}<div class="sv-cols">${audienceBlock}${cadenceBlock}</div>${asOf(capturedAt)}`;
  }

  // YouTube. Old "metrics" tab was a generic performance grid; the YouTube
  // numbers the founder saw lived on the overview strip (latest upload card
  // with views, published, subscribers and video count). This view is the
  // channel, the latest upload and what YouTube Analytics can add.
  function drawYouTube({ kinds, metrics, capturedAt }) {
    const ch = kinds.channel || {}, v = kinds["latest-video"] || {}, an = kinds.analytics || {};
    const subs = latest(metrics.subscribers) ?? num(ch.subscribers), views = latest(metrics.channel_views) ?? num(ch.views), videos = latest(metrics.video_count) ?? num(ch.videos), latestViews = latest(metrics.latest_video_views) ?? num(v.views);
    const cells = [
      { label: "Subscribers", value: subs === null ? null : fmt(subs), series: metrics.subscribers, note: "Public channel count" },
      { label: "Channel views", value: views === null ? null : fmt(views), series: metrics.channel_views, note: "All time" },
      { label: "Videos", value: videos === null ? null : fmt(videos), series: metrics.video_count, note: "Public uploads" },
      { label: "Latest video views", value: latestViews === null ? null : fmt(latestViews), series: metrics.latest_video_views, note: "The newest upload" },
      { label: "Latest video likes", value: num(v.likes) === null ? null : fmt(v.likes), note: "The newest upload" },
      { label: "Latest video comments", value: num(v.comments) === null ? null : fmt(v.comments), note: "The newest upload" },
      { label: "Published", value: v.publishedAt ? ago(v.publishedAt) : null, note: v.publishedAt ? stamp(v.publishedAt) : "" },
      { label: "Analytics", value: has(an.connected) ? (an.connected ? "Connected" : "Off") : null, note: an.connected ? "Retention, watch time and CTR are on" : "Connect Analytics for more" },
    ];
    const channelBlock = Object.keys(ch).length ? `<section class="sv-card sv-channel"><h3>Channel</h3><div class="sv-channel-id"><span class="sv-avatar sv-avatar-yt">${PulsifyShell.icon("youtube")}</span><div><strong>${esc(ch.name || "No name in the last pull")}</strong><small>${esc(ch.handle || "")}${ch.source ? " · " + esc(ch.source) : ""}</small></div></div><div class="sv-rows">${[["Subscribers", subs], ["Videos", videos], ["Views", views]].map(([l, n]) => `<div class="sv-row"><div><span>${esc(l)}</span></div><b>${esc(n === null ? "No data" : fmt(n))}</b></div>`).join("")}</div>${ch.url ? link(ch.url, "Open channel", "ps-button ghost sv-card-action") : ""}</section>` : `<section class="sv-card"><h3>Channel</h3><div class="sv-empty">No channel snapshot in the last pull.</div></section>`;
    const meta = [latestViews === null ? "" : fmt(latestViews) + " views", num(v.likes) === null ? "" : fmt(v.likes) + " likes", num(v.comments) === null ? "" : fmt(v.comments) + " comments", v.publishedAt ? ago(v.publishedAt) : (v.publishedLabel || "")].filter(Boolean);
    const dur = v.duration || duration(v.durationIso);
    const videoBlock = Object.keys(v).length ? `<section class="sv-card sv-video"><h3>Latest video</h3>${link(v.url, `<span class="sv-video-thumb">${v.thumbnail ? `<img src="${esc(v.thumbnail)}" alt="" loading="lazy" onerror="this.remove()">` : ""}${dur ? `<span class="sv-video-duration">${esc(dur)}</span>` : ""}</span>`, "sv-video-link")}<strong class="sv-video-title">${esc(v.title || "Untitled upload")}</strong><div class="sv-video-meta">${meta.map((m) => `<span>${esc(m)}</span>`).join("")}</div>${v.url ? link(v.url, "Watch on YouTube", "ps-button ghost sv-card-action") : ""}</section>` : `<section class="sv-card"><h3>Latest video</h3><div class="sv-empty">No upload in the last pull.</div></section>`;
    const signals = [["Connection", an.connected, "YouTube Analytics OAuth"], ["Retention", an.retentionAvailable, "Average view duration and audience retention"], ["Watch time", an.watchTimeAvailable, "Hours watched per video and per period"], ["Click-through rate", an.ctrAvailable, "Impressions to views on the thumbnail and title"]];
    const analyticsBlock = `<section class="sv-section"><h2>Analytics <span>what the connection unlocks</span></h2>${Object.keys(an).length ? `<div class="int-table sv-table"><table><thead><tr><th>Signal</th><th>Status</th><th>What it adds</th></tr></thead><tbody>${signals.map(([l, on, what]) => `<tr><td>${esc(l)}</td><td>${has(on) ? pill(Boolean(on), on ? "On" : "Off") : '<span class="int-note">No data</span>'}</td><td><span class="int-note">${esc(what)}</span></td></tr>`).join("")}</tbody></table>${an.note ? `<p class="int-note sv-table-note">${esc(an.note)}</p>` : ""}</div>${an.connected ? "" : `<div class="sv-next"><span class="int-note">Public data covers subscribers, views and uploads. Connect Analytics for the rest.</span><button class="ps-button ghost" data-go="integrations">Open Integrations</button></div>`}` : `<div class="sv-empty">No analytics snapshot in the last pull.</div>`}</section>`;
    return `<div class="ps-kpis">${cells.map(kpi).join("")}</div><div class="sv-cols sv-cols-yt">${videoBlock}${channelBlock}</div>${analyticsBlock}${asOf(capturedAt)}`;
  }

  window.PulsifyInstagramView = { render: (root) => frame(root, { source: "instagram", title: "Instagram", note: "Reach, content and who follows you, from the last pull.", icon: "instagram", draw: drawInstagram }) };
  window.PulsifyYouTubeView = { render: (root) => frame(root, { source: "youtube", title: "YouTube", note: "Your channel and the latest upload, from the last pull.", icon: "youtube", draw: drawYouTube }) };
})();

/**
 * FITFO call sheet. Internal, used live during the call.
 *
 * Different register from the prospect asset (prospect-asset-doc-standard):
 * that one is read, this one is glanced at mid-sentence. So: short lines, hard
 * left-aligned labels, no prose blocks longer than two lines, everything
 * findable by shape rather than by reading. Same tokens, so it still looks like
 * ours if it ever ends up on a shared screen.
 */
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  LevelFormat, PageOrientation, VerticalAlign, TabStopType,
} = require('docx');
const fs = require('fs');

const INK = '1A1A1A', MUTED = '464E5C', ACCENT = '4A53D9', RULE = 'D5D5DD';
const RED = 'B3261E', GREEN = '156B4C', FILL = 'F2F3F7';
const SERIF = 'Georgia', MONO = 'Consolas';
const T = { title: 30, h1: 23, body: 20, small: 18, caption: 16 };

const MARGIN_X = 1440, MARGIN_Y = 1080;
const CONTENT_W = 12240 - MARGIN_X * 2;

const p = (text, o = {}) => new Paragraph({
  spacing: { after: o.after ?? 110, line: o.line ?? 285 },
  children: [new TextRun({
    text, font: o.mono ? MONO : SERIF, size: o.size ?? T.body,
    color: o.color ?? INK, bold: o.bold, italics: o.italics,
  })],
});

const h1 = (text, o = {}) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: o.before ?? 280, after: 130 },
  keepNext: true,
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 7 } },
  children: [new TextRun({ text, font: SERIF, size: T.h1, bold: true, color: INK })],
});

const bullet = (text, o = {}) => new Paragraph({
  numbering: { reference: 'b', level: 0 },
  spacing: { after: o.after ?? 75, line: 280 },
  children: [new TextRun({ text, font: SERIF, size: o.size ?? T.small, color: o.color ?? INK })],
});

/* a line you can find without reading: bold lead-in, then the content */
const lead = (label, rest, o = {}) => new Paragraph({
  spacing: { after: o.after ?? 85, line: 285 },
  indent: { left: 260, hanging: 260 },
  children: [
    new TextRun({ text: label + '  ', font: SERIF, size: T.small, bold: true, color: o.color ?? INK }),
    new TextRun({ text: rest, font: SERIF, size: T.small, color: MUTED }),
  ],
});

const cell = (runs, width, o = {}) => new TableCell({
  width: { size: width, type: WidthType.DXA },
  verticalAlign: VerticalAlign.TOP,
  margins: { top: 95, bottom: 95, left: 140, right: 140 },
  shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: 'auto' } : undefined,
  children: runs,
});

const t = (text, o = {}) => new Paragraph({
  spacing: { after: o.after ?? 0, line: 265 },
  children: [new TextRun({
    text, font: SERIF, size: o.size ?? T.caption,
    color: o.color ?? INK, bold: o.bold, italics: o.italics,
  })],
});

/* ---------- the fork box: the one thing on the page he must not miss ---------- */
const forkBox = new Table({
  columnWidths: [CONTENT_W],
  width: { size: CONTENT_W, type: WidthType.DXA },
  borders: {
    top: { style: BorderStyle.SINGLE, size: 6, color: RULE },
    bottom: { style: BorderStyle.SINGLE, size: 6, color: RULE },
    left: { style: BorderStyle.SINGLE, size: 6, color: RULE },
    right: { style: BorderStyle.SINGLE, size: 6, color: RULE },
  },
  rows: [new TableRow({
    cantSplit: true,
    children: [cell([
      t('ASK THIS FIRST', { size: T.caption, bold: true, color: ACCENT, after: 90 }),
      new Paragraph({
        spacing: { after: 110, line: 290 },
        children: [new TextRun({ text: '"what happens when someone messages you after a video?"', font: MONO, size: T.body, color: INK })],
      }),
      t('Nothing in five uploads shows an offer, a link, or a lead magnet. His answer forks the whole call.', { color: MUTED, after: 0 }),
    ], CONTENT_W, { fill: FILL })],
  })],
});

/* ---------- fork outcomes ---------- */
const FC = [Math.floor(CONTENT_W / 2), CONTENT_W - Math.floor(CONTENT_W / 2)];
const forkOutcomes = new Table({
  columnWidths: FC,
  width: { size: CONTENT_W, type: WidthType.DXA },
  rows: [new TableRow({
    cantSplit: true,
    children: [
      cell([
        t('HE HAS AN OFFER', { bold: true, color: GREEN, after: 80 }),
        t('Standard engagement. Open $5k base + 30%.', { after: 55 }),
        t('Dominant wound is content stall, and he is holding the proof we can fix it.', { color: MUTED, after: 0 }),
      ], FC[0]),
      cell([
        t('HE DOES NOT', { bold: true, color: RED, after: 80 }),
        t('Offer creation first, scoped separately at $5k, no performance fee.', { after: 55 }),
        t('Our own offer page lists "no offer at all" as a disqualifier for the standard deal. Do not force it.', { color: MUTED, after: 0 }),
      ], FC[1]),
    ],
  })],
});

/* ---------- wounds ---------- */
const WC = [1900, 2500, CONTENT_W - 4400];
const woundRow = (n, status, statusColor, what, install) => new TableRow({
  cantSplit: true,
  children: [
    cell([t(n, { bold: true }), t(status, { color: statusColor, size: T.caption })], WC[0]),
    cell([t(what, { color: MUTED })], WC[1]),
    cell([t(install)], WC[2]),
  ],
});

const woundTable = new Table({
  columnWidths: WC,
  width: { size: CONTENT_W, type: WidthType.DXA },
  rows: [
    new TableRow({
      tableHeader: true, cantSplit: true,
      children: [
        cell([t('Wound', { bold: true })], WC[0], { fill: FILL }),
        cell([t('What is broken', { bold: true })], WC[1], { fill: FILL }),
        cell([t('What we install', { bold: true })], WC[2], { fill: FILL }),
      ],
    }),
    woundRow('1. Content', 'CONFIRMED', GREEN,
      'No thumbnails ever. 3 of 5 videos are one topic. No pillars. Best video was an accident.',
      'Content Engine: packaging subroutine, 10 ranked angles every 7 days, pillar map, format ladder.'),
    woundRow('2. Lead flow', 'LIKELY', MUTED,
      'No link in description. No DM motion, no capture. Attention going nowhere.',
      'Profile funnel, story sequences, DM motion, link path from video to capture.'),
    woundRow('3. Program', 'THE FORK', RED,
      'No visible offer. But 5 funded accounts, a -$20k recovery and a 4R plan is a mentorship spine already.',
      'Offer creation, unique mechanism named with him. Comes first if the fork says no.'),
    woundRow('4. Backend', 'LIKELY', MUTED,
      'No VSL, no lander, no sequences, no CRM.',
      'Funnel Stack, VSL, Typeform, Cal.com. NOT this call if he has no offer.'),
    woundRow('5. Sales infra', 'NOT YET', MUTED,
      'No setter, no closer, no dispositions, because there are probably no calls.',
      'Endgame layer. Raising it now sounds like a bundle.'),
  ],
});

const doc = new Document({
  creator: 'Pulsify',
  title: 'FITFO call sheet',
  numbering: {
    config: [{
      reference: 'b',
      levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 300, hanging: 190 } } } }],
    }],
  },
  styles: { default: { document: { run: { font: SERIF, size: T.body, color: INK } } } },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840, orientation: PageOrientation.PORTRAIT },
        margin: { top: MARGIN_Y, bottom: MARGIN_Y, left: MARGIN_X, right: MARGIN_X },
      },
    },
    children: [
      new Paragraph({
        spacing: { after: 70 },
        children: [new TextRun({ text: 'FITFO call sheet', font: SERIF, size: T.title, bold: true, color: INK })],
      }),
      new Paragraph({
        spacing: { after: 230 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 10 } },
        children: [new TextRun({
          text: 'Prop trader, NQ futures, 5 funded accounts via Lucid Trading. Cold IG open, received the packaging doc, booked.',
          font: SERIF, size: T.caption, color: MUTED,
        })],
      }),

      forkBox,
      p('', { after: 100 }),
      forkOutcomes,

      h1('The five wounds'),
      woundTable,

      h1('Open with'),
      p('He already has the packaging doc, so do not re-present it. Reference it once and move.', { size: T.small, color: MUTED, after: 130 }),
      bullet('"what happens when someone messages you after a video?"  <- the fork'),
      bullet('"are you getting DMs off these, and what do you do with them?"'),
      bullet('"has anyone ever asked you to teach them this?"'),
      bullet('"what are you actually trying to build here, is this a business or is it the trading?"'),

      h1('Say this'),
      lead('Trading niche.', '$18k for a trading client in 2 days. ~$96k in 90 days, trading. The Nick content engine. Our proof lives in his exact niche.'),
      lead('His instinct is right.', 'He writes titles for someone already funded and already down, not for beginners who want to get rich. Nobody can install that.'),
      lead('His outlier.', 'The 48.8x is the video where the auto-frame landed on his payout ledger. He already proved what his audience wants and does not know it.'),
      lead('Proof currency.', 'He refuses to flex and his best asset is a checkable ledger. We are not asking him to change who he is on camera.'),
      lead('Live demo.', '"draft 10 video angles for your channel right now." Lands hard because his repetition problem is visible to him.', { after: 0 }),

      h1('Do not'),
      bullet('Do not put the $100k guarantee up before confirming a working offer. The qualification gate is what makes it survivable.', { color: RED }),
      bullet('Do not pitch the full stack as a bundle. Diagnose one dominant wound.', { color: RED }),
      bullet('Do not lead with AI. He cares whether it works, not what it is built from.', { color: RED }),
      bullet('Do not offer more free work. That is the vendor-auditioning failure mode.', { color: RED }),

      h1('Pricing tree'),
      lead('Open', '$5,000 base + 30% performance.'),
      lead('If 30% objection', 'drop to 25%, base moves to $10,000.'),
      lead('If base objection after that', 'settle $7,500 + 30%.'),
      lead('Hard floor', '$5,000 + 30%. Never below. Both components mandatory.', { after: 0 }),

      h1('Get these on the call'),
      bullet('Subscriber count, average views, upload cadence. Not in the vault. No projection without them.'),
      bullet('IG or YouTube, which is the bigger audience.'),
      bullet('Has he ever sold anything, at any price.'),
      bullet('Payout cadence and totals, the drawdown screenshot, what he cut from his chart. Unlocks the remaining thumbnails either way.', { after: 0 }),
    ],
  }],
});

Packer.toBuffer(doc).then((b) => {
  fs.writeFileSync(process.argv[2], b);
  console.log('wrote', (b.length / 1024).toFixed(1) + ' KB');
});

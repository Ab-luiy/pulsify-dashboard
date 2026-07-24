/** FITFO scope. Prospect-facing, per prospect-asset-doc-standard. */
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  LevelFormat, PageOrientation, VerticalAlign,
} = require('docx');
const fs = require('fs');

const INK = '1A1A1A', MUTED = '464E5C', ACCENT = '4A53D9', RULE = 'D5D5DD', FILL = 'F2F3F7';
const SERIF = 'Georgia', MONO = 'Consolas';
const T = { title: 32, h1: 24, body: 21, small: 18, caption: 16 };

const MARGIN_X = 1728, MARGIN_Y = 1152;
const CONTENT_W = 12240 - MARGIN_X * 2;

const p = (text, o = {}) => new Paragraph({
  spacing: { after: o.after ?? 130, line: o.line ?? 300 },
  children: [new TextRun({ text, font: SERIF, size: o.size ?? T.body, color: o.color ?? INK, bold: o.bold })],
});

const h1 = (text, o = {}) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: o.before ?? 320, after: 150 },
  keepNext: true,
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 8 } },
  children: [new TextRun({ text, font: SERIF, size: T.h1, bold: true, color: INK })],
});

const bullet = (text, o = {}) => new Paragraph({
  numbering: { reference: 'b', level: 0 },
  spacing: { after: o.after ?? 85, line: 295 },
  children: [new TextRun({ text, font: SERIF, size: T.small, color: o.color ?? INK })],
});

/* numbered deliverable: accent numeral, bold name, then the detail beneath */
const item = (n, name, detail) => [
  new Paragraph({
    spacing: { before: 175, after: 55 },
    keepNext: true,
    indent: { left: 340, hanging: 340 },
    children: [
      new TextRun({ text: n + '  ', font: SERIF, size: T.small, bold: true, color: ACCENT }),
      new TextRun({ text: name, font: SERIF, size: T.small, bold: true, color: INK }),
    ],
  }),
  new Paragraph({
    spacing: { after: 0, line: 295 },
    indent: { left: 340 },
    children: [new TextRun({ text: detail, font: SERIF, size: T.small, color: MUTED })],
  }),
];

const cell = (runs, width, o = {}) => new TableCell({
  width: { size: width, type: WidthType.DXA },
  verticalAlign: VerticalAlign.TOP,
  margins: { top: 110, bottom: 110, left: 150, right: 150 },
  shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: 'auto' } : undefined,
  children: runs,
});

const t = (text, o = {}) => new Paragraph({
  spacing: { after: o.after ?? 0, line: 280 },
  children: [new TextRun({ text, font: o.mono ? MONO : SERIF, size: o.size ?? T.caption, color: o.color ?? INK, bold: o.bold })],
});

const HALF = Math.floor(CONTENT_W / 2);
const termsBox = new Table({
  columnWidths: [HALF, CONTENT_W - HALF],
  width: { size: CONTENT_W, type: WidthType.DXA },
  rows: [new TableRow({
    cantSplit: true,
    children: [
      cell([
        t('$2,000 UP FRONT', { bold: true, color: ACCENT, after: 85 }),
        t('The build. One payment, covers everything in the next section.', { color: MUTED }),
      ], HALF, { fill: FILL }),
      cell([
        t('30% ONCE WE LAUNCH', { bold: true, color: ACCENT, after: 85 }),
        t('Kicks in at the first launch, not before. Split 70/30 in your favour.', { color: MUTED }),
      ], CONTENT_W - HALF, { fill: FILL }),
    ],
  })],
});

const doc = new Document({
  creator: 'Pulsify',
  title: 'FITFO scope',
  numbering: {
    config: [{
      reference: 'b',
      levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 340, hanging: 200 } } } }],
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
        spacing: { after: 80 },
        children: [new TextRun({ text: 'What the $2,000 covers', font: SERIF, size: T.title, bold: true, color: INK })],
      }),
      new Paragraph({
        spacing: { after: 260 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 11 } },
        children: [new TextRun({ text: 'FITFO, July 2026. Scope, terms, and what I need from you.', font: SERIF, size: T.small, color: MUTED })],
      }),

      termsBox,
      p('', { after: 150 }),

      p('The split is deliberate. The $2,000 pays for the build, which takes real hours whether it works or not. The 30% only starts once there is something to launch and a team running it, and it comes out of profit rather than off the top. Until then you pay nothing beyond the two.'),

      h1('The build'),
      p('Thirty days. This is the part the $2,000 buys, and you keep all of it whether we carry on or not.', { color: MUTED, size: T.small, after: 40 }),

      ...item('1', 'Packaging, built and systemised',
        'Your five existing videos repackaged, titles and thumbnails, files delivered ready to upload. Then the system behind it, so every video after this one gets packaged the same way without you guessing. This is the thing your channel is currently missing entirely.'),

      ...item('2', 'The content bank',
        'Pillar map for the channel plus 30 titles banked against it, drawn from what you already do every week. You stop deciding what to film on the morning you film it, and you stop making the same video three times.'),

      ...item('3', 'The offer, named and structured',
        'What you sell, to who, at what price, and what they actually get. Right now there is nothing on your channel telling anyone you can be hired. This is the piece that turns views into money rather than into subscribers.'),

      ...item('4', 'The path from video to conversation',
        'Where a viewer goes when a video ends. Link, page, form, and the wording that gets them to use it. Built and live, not a recommendation.'),

      ...item('5', 'Tracking',
        'So both of us can see what came from where. This is also what makes the 30% honest: you see the same numbers I do, and neither of us is guessing about what the content produced.'),

      h1('After the build'),
      p('Nothing here costs you anything until the first launch. From that point the split is 70/30 in your favour, and the 30 covers the team that runs it: 5% to the setter who handles the incoming conversations, 10% to the closer who takes the calls, 15% to me. Ongoing:'),
      bullet('Every new upload packaged: title, thumbnail, hook.'),
      bullet('The content bank refilled so it never runs dry.'),
      bullet('The funnel watched and fixed when it leaks.'),
      bullet('Sales infrastructure added when the volume justifies it, not before.'),
      p('No retainer, no monthly fee, and nothing at all until there is a launch to split. If nothing sells, the 30 is zero.', { after: 0 }),

      h1('What I need from you'),
      bullet('Your payout numbers and the drawdown screenshot, so the packaging uses your real figures rather than approximations.'),
      bullet('A filming cadence you will actually hold. One a week beats four in a burst.'),
      bullet('When we do launch, visibility on what comes in, so the split is calculated off real numbers instead of estimates.'),
      p('That last one matters more than it sounds. Without it there is no way to know what worked, which makes the whole arrangement guesswork for both of us.', { after: 0 }),

      h1('Not included'),
      bullet('Video editing. You keep whoever you use, or we sort that separately.'),
      bullet('Being on camera. That part is yours and it is the part nobody can do for you.'),
      bullet('Ad spend. Everything here is organic. Paid comes later, if it comes at all.'),
      p('', { after: 60 }),

      h1('Timeline'),
      p('Week 1: packaging delivered and the offer structured. Week 2: content bank and the capture path live. Weeks 3 and 4: tracking wired, first packaged uploads out, adjustments off what the numbers say.', { after: 0 }),
    ],
  }],
});

Packer.toBuffer(doc).then((b) => {
  fs.writeFileSync(process.argv[2], b);
  console.log('wrote', (b.length / 1024).toFixed(1) + ' KB');
});

/** FITFO packaging, two-page cut. Same design tokens as the long version. */
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  LevelFormat, PageOrientation, ImageRun, VerticalAlign, TabStopType,
} = require('docx');
const fs = require('fs');
const path = require('path');

const shot = (id) => fs.readFileSync(path.join(__dirname, 'sm_' + id + '.jpg'));

const INK = '1A1A1A', MUTED = '464E5C', ACCENT = '4A53D9', RULE = 'D5D5DD', HEAD_FILL = 'F2F3F7';
const SERIF = 'Georgia', MONO = 'Consolas';
const T = { title: 32, h1: 25, body: 21, small: 18, caption: 16 };

const MARGIN_X = 1728, MARGIN_Y = 1080;
const CONTENT_W = 12240 - MARGIN_X * 2;

const p = (text, o = {}) => new Paragraph({
  spacing: { after: o.after ?? 140, line: o.line ?? 300 },
  children: [new TextRun({ text, font: SERIF, size: o.size ?? T.body, color: o.color ?? INK, bold: o.bold })],
});

const h1 = (text, o = {}) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: o.before ?? 300, after: 150 },
  keepNext: true,
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 8 } },
  children: [new TextRun({ text, font: SERIF, size: T.h1, bold: true, color: INK })],
});

const bullet = (text) => new Paragraph({
  numbering: { reference: 'b', level: 0 },
  spacing: { after: 90, line: 300 },
  children: [new TextRun({ text, font: SERIF, size: T.body, color: INK })],
});

/* one rebuild = the literal title, then a single line of direction */
const rebuild = (n, title, direction) => [
  new Paragraph({
    spacing: { before: 190, after: 60 },
    keepNext: true,
    indent: { left: 340, hanging: 340 },
    children: [
      new TextRun({ text: n + '  ', font: SERIF, size: T.small, bold: true, color: ACCENT }),
      new TextRun({ text: title, font: MONO, size: T.small, color: INK }),
    ],
  }),
  new Paragraph({
    spacing: { after: 0, line: 290 },
    indent: { left: 340 },
    children: [new TextRun({ text: direction, font: SERIF, size: T.small, color: MUTED })],
  }),
];

const cell = (runs, width, header) => new TableCell({
  width: { size: width, type: WidthType.DXA },
  verticalAlign: VerticalAlign.CENTER,
  margins: { top: 55, bottom: 55, left: 130, right: 130 },
  shading: header ? { type: ShadingType.CLEAR, fill: HEAD_FILL, color: 'auto' } : undefined,
  children: runs,
});

const COL = [5500, CONTENT_W - 5500];

const row = (title, id, note) => new TableRow({
  cantSplit: true,
  children: [
    cell([
      new Paragraph({
        spacing: { after: 45, line: 275 },
        children: [new TextRun({ text: title, font: SERIF, size: T.caption, bold: true, color: INK })],
      }),
      new Paragraph({
        spacing: { after: 0, line: 260 },
        children: [new TextRun({ text: note, font: SERIF, size: T.caption, color: MUTED, italics: true })],
      }),
    ], COL[0]),
    cell([new Paragraph({
      spacing: { after: 0 },
      children: [new ImageRun({ type: 'jpg', data: shot(id), transformation: { width: 132, height: 74 } })],
    })], COL[1]),
  ],
});

const table = new Table({
  columnWidths: COL,
  width: { size: CONTENT_W, type: WidthType.DXA },
  rows: [
    new TableRow({
      tableHeader: true, cantSplit: true,
      children: [
        cell([new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: 'Your title', font: SERIF, size: T.caption, bold: true, color: INK })] })], COL[0], true),
        cell([new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: 'What YouTube picked for you', font: SERIF, size: T.caption, bold: true, color: INK })] })], COL[1], true),
      ],
    }),
    row('How to survive bad price action + Risk management plan', '5BgJn9bih1I', 'A real risk box, buried under browser chrome.'),
    row('How to survive losing weeks', '7VdiPFUmppI', 'Bedroom, mid-word.'),
    row('I tripled my net worth in 2 months', '6uefLe209xA', 'Payout page. Your 48.8x, by accident.'),
    row('You make trading harder than it has to be', 'ucwCv32cvyU', 'Bedroom, plain wall.'),
    row('How to deal with losing weeks and bounce back (-$20,000)', 'T_kKoskedtA', 'Bedroom, mid-blink. No sign of a $20k loss.'),
  ],
});


const BUILT = [(CONTENT_W / 2) - 40, (CONTENT_W / 2) + 40];
const builtCell = (file, cap, width) => new TableCell({
  width: { size: width, type: WidthType.DXA },
  verticalAlign: VerticalAlign.TOP,
  margins: { top: 0, bottom: 0, left: 0, right: 150 },
  borders: {
    top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
    left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
  },
  children: [
    new Paragraph({
      spacing: { after: 60 },
      children: [new ImageRun({ type: 'jpg', data: fs.readFileSync(path.join(__dirname, file)), transformation: { width: 228, height: 128 } })],
    }),
    new Paragraph({
      spacing: { after: 0, line: 260 },
      children: [new TextRun({ text: cap, font: SERIF, size: T.caption, color: MUTED, italics: true })],
    }),
  ],
});

const builtPair = new Table({
  columnWidths: BUILT,
  width: { size: CONTENT_W, type: WidthType.DXA },
  borders: {
    top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
    left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
    insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
  },
  rows: [new TableRow({
    cantSplit: true,
    children: [
      builtCell('after-payout.jpg', 'Your payout video. Account IDs and dates kept, because they are what make it checkable.', BUILT[0]),
      builtCell('after-chart.jpg', 'Your risk plan video. Green target, red stop, the 3.99 ratio still readable at phone size.', BUILT[1]),
    ],
  })],
});

const doc = new Document({
  creator: 'Pulsify',
  title: 'FITFO, packaging',
  numbering: {
    config: [{
      reference: 'b',
      levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 340, hanging: 200 } } } }],
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
        spacing: { after: 90 },
        children: [new TextRun({ text: 'FITFO, packaging', font: SERIF, size: T.title, bold: true, color: INK })],
      }),
      new Paragraph({
        spacing: { after: 240 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 12 } },
        children: [new TextRun({ text: 'Built for you, July 2026. Everything here comes from your five live uploads.', font: SERIF, size: T.small, color: MUTED })],
      }),

      p('You have never made a thumbnail. All five below are frames YouTube picked for you on upload. The one that did 48.8x is the one where the frame happened to land on your payout page. The other four landed on your bedroom.'),
      p('That is the whole finding. You already ran the test, you just did not choose the result.', { after: 220 }),

      table,

      p('', { after: 60 }),
      p('Your titles are good, and that is the part most people cannot fix. You write for someone already in the seat and already down, not for beginners who want to get rich. What is missing is the other half of the pair, and three of these five are the same video wearing different hats.'),

      h1('The five, rebuilt'),
      p('Three of them need no photoshoot. The thumbnail is already inside your recording, just buried under browser chrome.', { color: MUTED, after: 40 }),

      ...rebuild('1', 'how i lost $20k in one week (full breakdown)',
        'Screen recording. The drawdown on your platform filling the frame, browser and taskbar cropped out, face in a small inset bottom right. No text on it.'),
      ...rebuild('2', '5 funded accounts, $2k payouts each (full breakdown)',
        'Screen recording. Payout page cropped hard, PAID column scaled until it reads at phone size, account IDs and dates kept because they make it checkable. You already got this one right by accident.'),
      ...rebuild('3', 'the risk plan that gets me 4r on nq (step by step)',
        'Screen recording. Crop to the risk box alone, ratio still legible, toolbars gone, face inset bottom left.'),
      ...rebuild('4', 'stop trading after a red week, do this instead (copy me)',
        'Raw photo. At the desk rather than on the bed, room tidied and not replaced. This one takes the psychology so the $20k video keeps the numbers.'),
      ...rebuild('5', "you don't need more setups, you need one (full breakdown)",
        'Screen recording. Your clean chart with one setup marked, nothing else on screen.'),

      p('', { after: 120 }),
      p('Keep all five quiet on text, because a real number and a real face already do the work. On the video, confirm the promise the title made inside the first thirty seconds, run the body off bullets you talk from rather than read, and never finish on "that is everything for this video."', { after: 40 }),


      h1('Two of them, already built'),
      p('Both of these came out of the frames above. Nothing generated, nothing added, no text. Cropped out the browser, the sidebar and the taskbar, then put your own webcam frame back in the corner where it belongs.', { color: MUTED, after: 90 }),
      builtPair,
      new Paragraph({ spacing: { before: 190, after: 0, line: 300 }, children: [new TextRun({ text: 'That is the whole job. The thumbnail was in the recording the entire time.', font: SERIF, size: T.body, color: INK })] }),

      h1('Three more, if you want them'),
      p('Angles already sitting in what you do every week. Titles and thumbnail ideas only, the take is yours.', { color: MUTED, after: 40 }),

      ...rebuild('1', 'why i run 5 funded accounts instead of one (full breakdown)',
        'Thumbnail: your account list, all five visible at once, face inset. Nobody explains the multi-account decision, and everyone chasing a payout wonders about it.'),
      ...rebuild('2', 'my full nq session, start to finish (step by step)',
        'Thumbnail: the chart mid-session, clock visible, nothing staged. Filmed while you work rather than recapped after, which is less effort and more authority.'),
      ...rebuild('3', 'what i actually do with the payouts (full breakdown)',
        'Thumbnail: the transfer screen, or you at the desk, nothing else in frame. The honest answer here is usually boring, and boring lands in a niche full of rented Lamborghinis.'),

    ],
  }],
});

Packer.toBuffer(doc).then((b) => {
  fs.writeFileSync(process.argv[2], b);
  console.log('wrote', (b.length / 1024).toFixed(1) + ' KB');
});

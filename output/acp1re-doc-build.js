/** acpire funnel teardown, two-page cut.
 *  Same design tokens and structure as output/fitfo-doc-build-short.js.
 *  Deviation from the standard: the evidence table is text on both sides rather
 *  than text plus screenshot, because this wound is verbal. The evidence is his
 *  own captions set against where those captions actually lead. */
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  LevelFormat, PageOrientation, VerticalAlign,
} = require('docx');
const fs = require('fs');

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
  pageBreakBefore: o.pageBreak,
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 8 } },
  children: [new TextRun({ text, font: SERIF, size: T.h1, bold: true, color: INK })],
});

/* one rebuild = the literal deliverable, then a single line of direction */
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

const COL = [4900, CONTENT_W - 4900];

/* left: his literal words, mono because he can paste them back and check.
   right: where that instruction actually lands. */
const row = (said, where) => new TableRow({
  cantSplit: true,
  children: [
    cell([new Paragraph({
      spacing: { after: 0, line: 275 },
      children: [new TextRun({ text: said, font: MONO, size: T.caption, color: INK })],
    })], COL[0]),
    cell([new Paragraph({
      spacing: { after: 0, line: 275 },
      children: [new TextRun({ text: where, font: SERIF, size: T.caption, color: MUTED, italics: true })],
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
        cell([new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: 'What you tell them to do', font: SERIF, size: T.caption, bold: true, color: INK })] })], COL[0], true),
        cell([new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: 'Where it actually takes them', font: SERIF, size: T.caption, bold: true, color: INK })] })], COL[1], true),
      ],
    }),
    row('join my discord and apply to learn from me',
        'A public Discord invite. There is nothing to apply to. They are already in.'),
    row('hit me a dm to apply for my group',
        'Your inbox. No questions, no order, and only as fast as you happen to be online.'),
    row('learn how i trade - discord in bio',
        'The same public link. Same room, same welcome, whoever they are.'),
    row('invite only trading floor',
        'Your Empire Trading bio. The account is private and the door to it is a link anyone can click.'),
  ],
});

const doc = new Document({
  creator: 'Pulsify',
  title: 'acpire, the door',
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
        children: [new TextRun({ text: 'acpire, the door', font: SERIF, size: T.title, bold: true, color: INK })],
      }),
      new Paragraph({
        spacing: { after: 240 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 12 } },
        children: [new TextRun({ text: 'Built for you, July 2026. Everything below is your own copy, quoted as written.', font: SERIF, size: T.small, color: MUTED })],
      }),

      p('You tell people to apply. You wrote it twice, in your own captions, without anybody suggesting it. Then your bio hands them a public Discord invite, and Empire Trading calls itself an invite only trading floor behind a door that opens for anyone who taps the link.'),
      p('That is the whole finding. The positioning is already selective. The plumbing is not.', { after: 220 }),

      table,

      p('', { after: 60 }),
      p('The positioning is the part most traders never get right, and you already have it. The niche is narrow enough to be real: NQ futures and prop firms, not trading in general. The voice holds across every post, looting the markets, robbing the nasdaq, the trading floor. That is an identity, and it is worth more than the follower count attached to it.'),

      h1('What it costs you'),
      p('A funded trader with capital and a beginner with two hundred dollars arrive at the same door and get the same welcome. Nothing separates them on the way in, and nothing tells you which one you are talking to once they are inside.'),
      p('The word apply is the expensive part. It sets an expectation that the next screen breaks, and it breaks it at the exact moment someone has decided they want in. That is the highest intent they will ever have and it is spent on a link.'),
      p('The DM route makes you the bottleneck, so speed to lead is capped at how often you open Instagram. And Discord keeps nothing you own. No email, no record, no way to reach the ones who join quietly and never speak.', { after: 40 }),

      h1('The rebuild', { pageBreak: true }),
      p('The room does not move. Only the door changes.', { color: MUTED, after: 40 }),

      ...rebuild('1', 'bio link -> application, not invite',
        'One link, same place in the bio. It opens a short form instead of a Discord invite. Everything you already post keeps working, and it starts sorting people on the way through.'),
      ...rebuild('2', 'six questions, in this order',
        'Capital available to trade. Funded or still evaluating. How long they have been trading. The one thing blocking them right now. What they have already spent on education. Why now. The last three qualify; they also hand you the exact language for your next month of reels.'),
      ...rebuild('3', 'approved -> invite. declined -> something free.',
        'Nobody gets rejected into nothing. A declined applicant is a future one, and the free thing keeps them close enough to come back when they are funded.'),
      ...rebuild('4', 'name the framework',
        'You wrote no salary, no ceiling, just the work, the framework, and the compound effect. You never said what the framework is. Name it and the room gets sold on a mechanism instead of a mood, which is also what lets you raise the price.'),
      ...rebuild('5', 'put the students next to the ask',
        'You have a highlight called students sitting fourth in the row, behind a circle most people never tap. Your own P&L is the most common thing in this niche. Somebody else winning with your framework is the rarest.'),

      p('', { after: 120 }),
      p('Nothing here asks you to change what you post. The reels, the room and the voice all stay. The only thing that changes is what happens in the three seconds after somebody decides they want in.', { after: 40 }),

      h1('Three more, if you want them'),
      p('Angles that fall out of the application answers rather than out of a content calendar.', { color: MUTED, after: 40 }),

      ...rebuild('1', 'the blocker reel',
        'Whatever answer to question four comes back most often, that is a reel, in their words. You will not have to guess what it should be about.'),
      ...rebuild('2', 'what i turned down this week',
        'You run an invite only floor. Saying no out loud is the cheapest proof that invite only is real, and almost nobody in this niche is willing to do it.'),
      ...rebuild('3', 'the framework, in ninety seconds',
        'Once it has a name, one reel that explains it end to end. That becomes the thing you pin, and the thing the application sits under.'),
    ],
  }],
});

Packer.toBuffer(doc).then((b) => {
  fs.writeFileSync(process.argv[2], b);
  console.log('wrote', (b.length / 1024).toFixed(1) + ' KB');
});

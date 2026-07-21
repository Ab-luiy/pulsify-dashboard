/**
 * FITFO packaging asset.
 * Design decisions, all deliberate:
 *  - Georgia throughout (one family, weight + size contrast). Not Calibri: the Word
 *    default is why v1 read as a template. Georgia exists in Word, Google Docs and macOS.
 *  - Consolas only for literal strings the reader will copy (titles, thumbnail text).
 *    That is functional, not decorative.
 *  - Measure capped at 5.8in ~= 72ch at 11pt. v1 ran ~95ch, which was the biggest
 *    readability defect.
 *  - Thumbnails sized to 2.3in so all five fit one page and read at roughly the size
 *    they appear in a feed. v1 fitted two per page and left a third of page 1 blank.
 *  - Accent used under 10% of surface, brand blue darkened to #4A53D9 for small-text
 *    contrast on white (5.95:1).
 */
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  LevelFormat, PageOrientation, ImageRun, Footer, PageNumber, PageBreak,
  VerticalAlign, TabStopType,
} = require('docx');
const fs = require('fs');
const path = require('path');

const shot = (id) => fs.readFileSync(path.join(__dirname, 'sm_' + id + '.jpg'));

/* ---- tokens ---- */
const INK = '1A1A1A';
const MUTED = '464E5C';
const FAINT = '6B7280';
const ACCENT = '4A53D9';
const RULE = 'D5D5DD';
const HEAD_FILL = 'F2F3F7';

const SERIF = 'Georgia';
const MONO = 'Consolas';

const T = { title: 36, h1: 30, h2: 24, body: 22, small: 19, caption: 17 };

/* Letter, 1.35in side margins -> 5.8in measure */
const MARGIN_X = 1944;
const MARGIN_Y = 1584;
const CONTENT_W = 12240 - MARGIN_X * 2;

/* ---- helpers ---- */
const p = (text, o = {}) => new Paragraph({
  spacing: { after: o.after ?? 170, line: o.line ?? 320 },
  keepNext: o.keepNext,
  children: [new TextRun({
    text, font: SERIF, size: o.size ?? T.body,
    color: o.color ?? INK, bold: o.bold, italics: o.italics,
  })],
});

const h1 = (text, o = {}) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: o.before ?? 380, after: 180 },
  keepNext: true,
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 10 } },
  children: [new TextRun({ text, font: SERIF, size: T.h1, bold: true, color: INK })],
});

const h2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 330, after: 130 },
  keepNext: true,
  children: [new TextRun({ text, font: SERIF, size: T.h2, bold: true, color: INK })],
});

const bullet = (text, o = {}) => new Paragraph({
  numbering: { reference: 'bullets', level: 0 },
  spacing: { after: o.after ?? 110, line: 310 },
  children: [new TextRun({ text, font: SERIF, size: T.body, color: o.color ?? INK })],
});

/* label + value, hanging indent so wrapped lines align under the value */
const field = (label, value, { mono = false } = {}) => new Paragraph({
  spacing: { after: 110, line: 310 },
  indent: { left: 1580, hanging: 1580 },
  children: [
    new TextRun({ text: label, font: SERIF, size: T.small, color: ACCENT, bold: true }),
    new TextRun({ text: '\t', font: SERIF, size: T.small }),
    new TextRun({
      text: value,
      font: mono ? MONO : SERIF,
      size: mono ? T.small : T.body,
      color: INK,
    }),
  ],
  tabStops: [{ type: TabStopType.LEFT, position: 1580 }],
});

const cellText = (runs, { width, header = false, align = VerticalAlign.CENTER }) => new TableCell({
  width: { size: width, type: WidthType.DXA },
  verticalAlign: align,
  margins: { top: 105, bottom: 105, left: 150, right: 150 },
  shading: header ? { type: ShadingType.CLEAR, fill: HEAD_FILL, color: 'auto' } : undefined,
  children: runs,
});

/* ---- the audit table: five rows, one page ---- */
const COL = [4900, CONTENT_W - 4900];

const auditRow = (title, id, note) => new TableRow({
  cantSplit: true,
  children: [
    cellText([
      new Paragraph({
        spacing: { after: 70, line: 290 },
        children: [new TextRun({ text: title, font: SERIF, size: T.small, bold: true, color: INK })],
      }),
      new Paragraph({
        spacing: { after: 0, line: 270 },
        children: [new TextRun({ text: note, font: SERIF, size: T.caption, color: MUTED, italics: true })],
      }),
    ], { width: COL[0] }),
    cellText([
      new Paragraph({
        spacing: { after: 0 },
        children: [new ImageRun({ type: 'jpg', data: shot(id), transformation: { width: 198, height: 111 } })],
      }),
    ], { width: COL[1] }),
  ],
});

const auditTable = new Table({
  columnWidths: COL,
  width: { size: CONTENT_W, type: WidthType.DXA },
  rows: [
    new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: [
        cellText([new Paragraph({
          spacing: { after: 0 },
          children: [new TextRun({ text: 'Your title', font: SERIF, size: T.caption, bold: true, color: INK })],
        })], { width: COL[0], header: true }),
        cellText([new Paragraph({
          spacing: { after: 0 },
          children: [new TextRun({ text: 'What YouTube picked for you', font: SERIF, size: T.caption, bold: true, color: INK })],
        })], { width: COL[1], header: true }),
      ],
    }),
    auditRow('How to survive bad price action + Risk management plan', '5BgJn9bih1I', 'Auto-frame. A real risk box, buried under the browser and the taskbar.'),
    auditRow('How to survive losing weeks', '7VdiPFUmppI', 'Auto-frame. Bedroom, caught mid-word.'),
    auditRow('I tripled my net worth in 2 months', '6uefLe209xA', 'Auto-frame. Payout page. Your biggest video, by accident.'),
    auditRow('You make trading harder than it has to be', 'ucwCv32cvyU', 'Auto-frame. Bedroom, plain wall, nothing to read.'),
    auditRow('How to deal with losing weeks and bounce back (-$20,000)', 'T_kKoskedtA', 'Auto-frame. Bedroom, mid-blink. No sign of a $20k loss inside.'),
  ],
});

const rebuild = (heading, title, pattern, todo, text, why, note) => [
  h2(heading),
  field('Title', title, { mono: true }),
  field('Thumbnail', pattern),
  field('What to do', todo),
  field('Text on it', text),
  field('Why it pairs', why),
  ...(note ? [p(note, { after: 220 })] : [p('', { after: 60 })]),
];

const skeleton = (title, bullets) => [
  new Paragraph({
    spacing: { before: 330, after: 130 },
    keepNext: true,
    children: [new TextRun({ text: title, font: MONO, size: T.small, bold: true, color: INK })],
  }),
  ...bullets.map((b, i) => bullet(b, { after: i === bullets.length - 1 ? 40 : 110 })),
];

const doc = new Document({
  creator: 'Pulsify',
  title: 'FITFO, content packaging and video structure',
  numbering: {
    config: [{
      reference: 'bullets',
      levels: [{
        level: 0,
        format: LevelFormat.BULLET,
        text: '•',
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 360, hanging: 210 } } },
      }],
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
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ children: [PageNumber.CURRENT], font: SERIF, size: T.caption, color: FAINT })],
        })],
      }),
    },
    children: [
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: 'FITFO, content packaging and video structure', font: SERIF, size: T.title, bold: true, color: INK })],
      }),
      new Paragraph({
        spacing: { after: 300 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 16 } },
        children: [new TextRun({
          text: 'Built for FITFO, July 2026. Everything here comes from your five live uploads. No generic advice, nothing you have not already done on camera.',
          font: SERIF, size: T.small, color: MUTED,
        })],
      }),

      h1('What I looked at', { before: 0 }),
      auditTable,
      p('', { after: 120 }),
      p('You have never made a thumbnail. All five are frames YouTube picked on upload, which means the single highest-leverage thing on the channel has been on autopilot the whole time.'),

      h1('What is already working'),
      p('Your titles are good, and that is the part most people cannot fix.'),
      p('"How to survive losing weeks" is what a funded trader actually says in his own head on a red afternoon. Almost everyone in this niche writes for beginners who want to get rich, and that audience does not buy anything and does not stay. You write for someone already in the seat and already down. Keep that.'),
      p('The other thing working: you have real proof and you use it casually rather than as a flex. That is rarer than you think and it is worth building the whole channel around.'),

      h1('What is costing you'),
      p('Nothing reads at phone size. Ninety-plus percent of your impressions are a thumbnail about the width of a thumb. Three of yours are a bedroom, and the two screen recordings carry a browser window, a sidebar, a taskbar and a weather widget all competing with the thing you actually want seen.'),
      p('The pair is half missing. A title and a thumbnail are one unit. The thumbnail says the short emotional thing, the title says the full context, and together the viewer gets the whole message. Right now the title is doing all of it alone and the thumbnail is doing nothing.'),
      p('Three of your five videos are the same video. Surviving losing weeks, dealing with losing weeks, and surviving bad price action are one idea in three hats. Two of them make the same promise, so they compete with each other and the weaker one drags the channel average down.'),
      p('Two titles have a specific fixable problem. The plus sign in the risk-management title welds two promises together, so the viewer commits to neither. And "You make trading harder than it has to be" is true, but it names nothing concrete the viewer walks away with, so there is no reason to click today rather than never.'),

      new Paragraph({ children: [new PageBreak()] }),

      h1('The five, rebuilt', { before: 0 }),
      p('The good news first: you do not need to shoot anything new for three of these. Your screen recordings already contain the right thumbnail, it is just buried under browser chrome. The job is cropping and a light retouch, not a photoshoot.'),
      p('Two layouts cover everything on this channel. Screen recording means the real interface fills the frame with your face in a small corner inset, exactly like a webcam overlay. Raw photo means you in your real room, cleaned up, nothing added. Both stay quiet on text, because a real number and a real face already do the work, and loud text is what makes a channel read as a guru channel.', { after: 240 }),

      ...rebuild('1. Your -$20,000 video',
        'how i lost $20k in one week (full breakdown)',
        'Screen recording',
        'The drawdown on your platform filling the frame, browser tabs and taskbar cropped out, your face in a small inset bottom right.',
        'None, or "still funded" small and lowercase in a corner.',
        'The title gives the loss, the screen proves it is real.',
        'The number was already your strongest asset and it was sitting in brackets at the very end, which is exactly where a phone cuts the title off.'),

      ...rebuild('2. Your payout video',
        '5 funded accounts, $2k payouts each (full breakdown)',
        'Screen recording',
        'Your payout page as it already appears, cropped hard: kill the browser window, sidebar, URL bar, taskbar and weather widget, then scale the PAID column until it reads at phone size. Keep the account IDs and dates, they are what make it checkable. Face inset bottom right.',
        'None.',
        'The title gives the payout, the ledger is the proof, nothing else needed.',
        'This is the one you already got right by accident. Your biggest video is this exact layout, chosen for you at random by YouTube. Doing it on purpose is the whole play. Show the number without flinching, because a ledger with account IDs and dates on it is something a stranger can go and check, and that is what makes it land instead of grate. The only thing that would ruin it is putting a watch or a car next to it. A number on its own is transparency. A number next to a lifestyle shot is a sales pitch, and your audience can tell the difference instantly.'),

      ...rebuild('3. Your risk management video',
        'the risk plan that gets me 4r on nq (step by step)',
        'Screen recording',
        'Crop to the risk box alone, green target block and red stop block, the ratio still legible. Toolbar, sidebar and taskbar gone. Face inset bottom left so it does not cover the box.',
        'None, or "chop" small and lowercase.',
        'The title gives the method and the ratio, the chart shows the setup surviving.',
        'Your existing frame is the best of the five by accident. There is a real risk box on a real chart in it, buried under the interface. Crop to the box and it works.'),

      ...rebuild('4. Your losing weeks video',
        'stop trading after a red week, do this instead (copy me)',
        'Raw photo',
        'You at the desk rather than on the bed, screens off or red and out of focus behind you. Room tidied, not replaced. No zoom, no reframing, just cleaner.',
        'None, or a plain question in a speech bubble.',
        'The title breaks the default behaviour, the photo shows someone who has actually had that week.',
        'This one takes the psychology so the -$20,000 video can keep the numbers. Two different promises instead of one repeated one.'),

      ...rebuild('5. Your simplification video',
        "you don't need more setups, you need one (full breakdown)",
        'Screen recording',
        'Your clean chart with the single setup marked, full frame, nothing else on screen. Face inset small.',
        'None.',
        'The title makes the claim, the empty chart is the evidence.',
        'One note on the two photo thumbnails: get off the bed. A bedroom with a closet in shot is the fastest way to read as an amateur at 120px, and you are not one. Same room is fine, just sit at the desk and tidy what is behind you.'),

      new Paragraph({ children: [new PageBreak()] }),

      h1('How to structure the videos', { before: 0 }),
      p('Not scripts. Bullets you read and then talk off, because the second this is written as sentences you will perform it, and a trader performing lines is the fastest way to lose a trader watching.'),

      h2('The first thirty seconds'),
      p('Confirm, do not set up. The opening confirms the exact promise the title made. "What\'s up guys, welcome back" is the version that loses people.'),
      p('Show the thing. If the thumbnail says "still funded", the account is on screen inside thirty seconds. If it says "chop", the chart is up. A hook that talks about a number without showing it breaks the promise the thumbnail made.'),
      p('Three jobs, nothing else: confirm the promise, signal briefly why you are the one saying it, open a loop that only closes later.'),
      p('Keep it short. Your audience is money-motivated and time-poor. The long empathetic intro is for a different niche.'),

      h2('The body'),
      p('Every video runs the same shape regardless of length: the problem, the struggle, the discovery, the result.'),
      p('Five to nine bullets. Each one a thing you know cold. Read the bullet, look up, talk.'),
      p('Open a loop early and close it before the end. An unresolved loop costs you the next video, not just this one.'),
      p('Reference your mechanism in every video, indirectly. Your mechanism is whatever repeatable thing keeps five accounts alive at once. Name it once, then let it show up inside stories rather than pitching it. When someone eventually asks what you do, they should already know.'),
      p('Where you can, film while doing the work rather than sitting down to record it afterwards. Same information, noticeably higher authority, and it kills the ideation problem that has you making the same video three times.'),

      h2('The close'),
      p('Three calls to action in every video, doing different jobs:'),
      bullet('Buried in the story. "the rule I run across all five accounts", told as narrative, never as an ask. This one does the trust work.'),
      bullet('Mid-video, one line, framed as optional for whoever wants the next step.'),
      bullet('Last sixty to ninety seconds, explicit, tells the viewer exactly what to do.'),
      p('Never end on "that\'s everything for this video." Give two doors: one for the viewer who is ready now, one for the viewer who needs another video first, and hand that second viewer a specific next title rather than a shrug.'),

      new Paragraph({ children: [new PageBreak()] }),

      h1('The five skeletons', { before: 0 }),
      p('Your material, in the order it should come out. Leave the page whenever you want.'),

      ...skeleton('how i lost $20k in one week', [
        'Open on the drawdown on screen, then the loop: every decision that got you there, and the rule you wrote on the Monday after',
        'The week before it went wrong: size, cadence, what was working',
        'The first red day and what you told yourself that morning',
        'The decision that turned one red day into a red week',
        'What it cost, shown on the platform',
        'The rule you wrote afterwards',
        'The following week under that rule',
        'What you would tell someone sitting in week two of a drawdown right now',
      ]),

      ...skeleton('5 funded accounts, $2k payouts each', [
        'Open on the cadence, accounts on screen, loop on the one rule that does most of the work',
        'Why five accounts instead of one large one',
        'What is identical across all five',
        'The daily risk cap per account',
        'What happens the day one goes red',
        'The payout cadence and what you do with the money',
        'The mistake that blows accounts at exactly this stage',
      ]),

      ...skeleton('the risk plan that gets me 4r on nq', [
        'Open with the chart up, box drawn, ratio named in the first sentence',
        'The conditions that have to be true before you even look',
        'Where the entry goes',
        'Where the stop goes, and the reasoning most people get wrong',
        'How the target gets set',
        'What you do when it moves against you immediately',
        'The version of this setup that does not work, and the filter that catches it',
      ]),

      ...skeleton('stop trading after a red week, do this instead', [
        'Open on the Monday after a red week being what actually kills funded accounts, and the routine you run instead of trading it',
        'What that Monday feels like, honestly',
        'What you used to do',
        'The routine now, hour by hour',
        'When you are allowed back on full size',
        'How you tell the difference between ready and forcing',
      ]),

      ...skeleton("you don't need more setups, you need one", [
        'Open on trading one setup, everything you deleted, what happened to the numbers after',
        'What your chart looked like before',
        'Everything you removed, named specifically',
        'The one setup that survived and why that one',
        'What you gave up by simplifying, stated honestly',
        'How long before the numbers moved',
        'How someone else picks their one',
      ]),

      h1('Three things I could not do without you'),
      bullet('Your real payout cadence and total for that two-month window, so the numbers in video 2 match your ledger exactly rather than approximately.'),
      bullet('The drawdown screenshot as it appeared on the platform, for video 1.'),
      bullet('What you actually cut from your chart, for video 5. Without it that title is a template instead of your story.'),
      p('Three of the five are shootable on numbers you have already made public. The other two need the list above.', { after: 0 }),
    ],
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(process.argv[2], buf);
  console.log('wrote', process.argv[2], (buf.length / 1024).toFixed(1) + ' KB');
});

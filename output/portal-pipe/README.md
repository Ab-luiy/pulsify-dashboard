# The portal pipe — plain English

This folder is the "pipe" that makes the landing page feed the client's dashboard
automatically, so you never log into Wistia and Typeform separately.

## What's here

- `portal-demo.html` — a **visual demo** of how it looks: applications + how far each
  person watched the VSL, in one screen. (Uses fake sample data so you can see the layout.
  Click the buttons to watch new applications/watch-events appear live.)
- `functions/event.js` — the pipe. It catches two things and saves them:
  1. a **Typeform** application (when someone submits the form)
  2. a **Wistia** watch event (as someone watches the video)
- `functions/leads.js` — the reader. The dashboard calls this to get everything for one
  client in one go.
- `schema.sql` — the two simple tables the data is saved into.

## How the real version gets switched on (the blanks to fill)

You don't need to understand the code. The setup, once the accounts exist:

1. **Make the accounts:** a Wistia account (upload the VSL) and a Typeform (the application).
2. **Deploy this folder** to Cloudflare Pages (free) and attach a free D1 database.
3. **Point Typeform at the pipe:** in Typeform → Connect → Webhooks, paste the pipe's URL
   (`https://<your-page>/event?client=frank`). Now every application flows in.
4. **Send Wistia watch events to the pipe:** a tiny snippet on the landing page listens to
   the Wistia player and posts play/progress/end to the same URL.
5. The dashboard reads `leads.js` and shows it all. Done.

Everything is scoped by a `client` tag (e.g. `frank`), so each client only ever sees their
own leads — which is what makes this work for more than one client later.

## Cost

- Wistia + Typeform: small monthly fees (their plans).
- The pipe itself (Cloudflare Pages + Functions + D1): free at this scale.

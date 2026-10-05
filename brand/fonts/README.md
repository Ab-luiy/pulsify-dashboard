# Fonts

Story and carousel designs use Helvetica (founder decision 2026-10-05). Real Helvetica / Helvetica Neue is a licensed Monotype font and is not installed on this PC (only Arial is).

To switch to the real thing: put the licensed font files here (for example HelveticaNeue-Regular, -Bold, -BoldItalic as .otf or .ttf, plus the license receipt). Templates load them through one CSS variable, so adding the files re-renders every slide in Helvetica with no other change.

Until then renders use Arial (nearly identical at story size). Do not download Helvetica from free-font sites; those copies are unlicensed.

## Status 2026-10-05
Installed on this PC by the founder: Helvetica (Regular, Bold, Oblique, Bold Oblique), plus Helvetica Light, Compressed and Rounded. Verified in headless Chrome: font-family Helvetica renders the real Helvetica (not Arial), and the stack "Helvetica Neue", Helvetica, Arial resolves to it. Use Regular for body, Bold for headlines, Bold Oblique for the one emphasised phrase. The font files are NOT copied into the vault or committed (licence); templates use the system-installed font by name, so a render must run on a machine where it is installed.

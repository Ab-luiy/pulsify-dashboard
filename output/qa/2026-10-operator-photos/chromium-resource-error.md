# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: shell.spec.ts >> notifications bell >> no badge and no title prefix when everything is read
- Location: tests\shell.spec.ts:29:7

# Error details

```
Error: page.goto: net::ERR_NO_BUFFER_SPACE at http://127.0.0.1:3200/app
Call log:
  - navigating to "http://127.0.0.1:3200/app", waiting until "load"

```

# Test source

```ts
  1   | import { expect, test, type Page } from "@playwright/test";
  2   | import { mockShellApi } from "./fixtures/shell";
  3   | 
  4   | const bell = (page: Page) => page.getByRole("button", { name: /^Notifications/ });
  5   | const panel = (page: Page) => page.getByRole("dialog", { name: "Notifications" });
  6   | const palette = (page: Page) => page.getByRole("dialog", { name: "Command palette" });
  7   | const paletteInput = (page: Page) => palette(page).getByRole("combobox");
  8   | 
  9   | /** Loads /app and waits for hydration (the bell only knows the count once the client has fetched). */
  10  | async function gotoApp(page: Page) {
  11  |   await page.goto("/app");
  12  |   await expect(bell(page)).toHaveAccessibleName("Notifications, 3 unread");
  13  | }
  14  | 
  15  | async function openBell(page: Page) {
  16  |   await bell(page).click();
  17  |   await expect(panel(page)).toBeVisible();
  18  | }
  19  | 
  20  | test.describe("notifications bell", () => {
  21  |   test("badge, accessible name and document title show the unread count", async ({ page }) => {
  22  |     await mockShellApi(page);
  23  |     await gotoApp(page);
  24  |     await expect(bell(page)).toHaveAccessibleName("Notifications, 3 unread");
  25  |     await expect(page.getByTestId("bell-badge")).toHaveText("3");
  26  |     await expect(page).toHaveTitle(/^\(3\) /);
  27  |   });
  28  | 
  29  |   test("no badge and no title prefix when everything is read", async ({ page }) => {
  30  |     await mockShellApi(page, { empty: true });
> 31  |     await Promise.all([page.waitForResponse("**/api/notifications**"), page.goto("/app")]);
      |                                                                             ^ Error: page.goto: net::ERR_NO_BUFFER_SPACE at http://127.0.0.1:3200/app
  32  |     await expect(bell(page)).toHaveAccessibleName("Notifications");
  33  |     await expect(page.getByTestId("bell-badge")).toHaveCount(0);
  34  |     await openBell(page);
  35  |     await expect(panel(page)).toContainText("Nothing here yet");
  36  |     await expect(page).not.toHaveTitle(/^\(\d+\)/);
  37  |   });
  38  | 
  39  |   test("panel lists rows by day with tabs and filters", async ({ page }) => {
  40  |     await mockShellApi(page);
  41  |     await gotoApp(page);
  42  |     await openBell(page);
  43  |     const list = panel(page);
  44  |     await expect(list.getByRole("heading", { name: "Notifications" })).toBeVisible();
  45  |     await expect(list.getByText("Today", { exact: true })).toBeVisible();
  46  |     await expect(list.getByText("Yesterday", { exact: true })).toBeVisible();
  47  |     await expect(list.getByText("Earlier", { exact: true })).toBeVisible();
  48  |     await expect(list.getByText("Outreach reply")).toBeVisible();
  49  |     await expect(list.getByText("Inbound", { exact: true })).toBeVisible();
  50  |     await expect(list.getByText("3 min ago")).toBeVisible();
  51  |     await expect(list.getByRole("button", { name: /Kai Trades signed the contract/ })).toBeVisible();
  52  | 
  53  |     await list.getByRole("tab", { name: /Unread/ }).click();
  54  |     await expect(list.getByRole("tab", { name: "Unread 3" })).toHaveAttribute("aria-selected", "true");
  55  |     await expect(list.getByRole("button", { name: /Kai Trades signed the contract/ })).toHaveCount(0);
  56  |     await expect(list.getByRole("button", { name: /Maya Chen, @maya.trades sent a message/ })).toBeVisible();
  57  | 
  58  |     await list.getByRole("tab", { name: "All" }).click();
  59  |     const filters = list.getByRole("group", { name: "Filter notifications" });
  60  |     await filters.getByRole("button", { name: "Money" }).click();
  61  |     await expect(filters.getByRole("button", { name: "Money" })).toHaveAttribute("aria-pressed", "true");
  62  |     await expect(list.getByRole("button", { name: /\$2,000 received/ })).toBeVisible();
  63  |     await expect(list.getByRole("button", { name: /sent a message/ })).toHaveCount(0);
  64  |     await filters.getByRole("button", { name: "Messages" }).click();
  65  |     await expect(list.getByRole("button", { name: /sent a message/ })).toHaveCount(2);
  66  |     await filters.getByRole("button", { name: "Funnel" }).click();
  67  |     await expect(list.getByRole("button", { name: /New application/ })).toBeVisible();
  68  |     await expect(list.getByRole("button", { name: /Call booked/ })).toBeVisible();
  69  |   });
  70  | 
  71  |   test("a row expands in place and marks itself read", async ({ page }) => {
  72  |     const { calls } = await mockShellApi(page);
  73  |     await gotoApp(page);
  74  |     await openBell(page);
  75  |     const row = panel(page).getByRole("button", { name: /\$2,000 received/ });
  76  |     await row.click();
  77  |     await expect(row).toHaveAttribute("aria-expanded", "true");
  78  |     const item = panel(page).getByRole("listitem").filter({ hasText: "$2,000 received" });
  79  |     await expect(item.getByText("Amount")).toBeVisible();
  80  |     await expect(item.getByText("$2,000.00")).toBeVisible();
  81  |     await expect(item.getByText("stripe", { exact: true })).toBeVisible();
  82  |     await expect(item.getByRole("button", { name: "Open payment" })).toBeVisible();
  83  |     await item.getByRole("button", { name: "Mark read" }).click();
  84  |     await expect(item.getByRole("button", { name: "Mark read" })).toHaveCount(0);
  85  |     expect(calls.find((call) => call.method === "POST")?.body).toEqual({ client: "", ids: ["ntf_pay1"], all: false });
  86  |     await expect(bell(page)).toHaveAccessibleName("Notifications, 2 unread");
  87  |     await expect(page).toHaveTitle(/^\(2\) /);
  88  |   });
  89  | 
  90  |   test("mark all read clears the badge and disables itself", async ({ page }) => {
  91  |     const { calls } = await mockShellApi(page);
  92  |     await gotoApp(page);
  93  |     await openBell(page);
  94  |     await panel(page).getByRole("button", { name: "Mark all read" }).click();
  95  |     await expect(bell(page)).toHaveAccessibleName("Notifications");
  96  |     await expect(panel(page).getByRole("button", { name: "Mark all read" })).toBeDisabled();
  97  |     expect(calls.find((call) => call.method === "POST")?.body).toEqual({ client: "", ids: [], all: true });
  98  |     await expect(page).not.toHaveTitle(/^\(\d+\)/);
  99  |     await panel(page).getByRole("tab", { name: /Unread/ }).click();
  100 |     await expect(panel(page)).toContainText("You are all caught up");
  101 |   });
  102 | 
  103 |   test("mute and unmute a sender", async ({ page }) => {
  104 |     const { calls } = await mockShellApi(page);
  105 |     await gotoApp(page);
  106 |     await openBell(page);
  107 |     await panel(page).getByRole("button", { name: /Maya Chen, @maya.trades sent a message/ }).click();
  108 |     await panel(page).getByRole("button", { name: "Mute @maya.trades" }).click();
  109 |     await expect(panel(page).getByText("Muted. New messages from this person stay in the inbox without a notification.")).toBeVisible();
  110 |     expect(calls.filter((call) => call.method === "POST").at(-1)?.body).toEqual({ mute: { handle: "maya.trades", muted: true } });
  111 |     await panel(page).getByRole("button", { name: "Unmute @maya.trades" }).click();
  112 |     await expect(panel(page).getByRole("button", { name: "Mute @maya.trades" })).toBeVisible();
  113 |     expect(calls.filter((call) => call.method === "POST").at(-1)?.body).toEqual({ mute: { handle: "maya.trades", muted: false } });
  114 |   });
  115 | 
  116 |   test("Open on a conversation goes to the tracker thread and marks it read", async ({ page }) => {
  117 |     const { calls } = await mockShellApi(page);
  118 |     await gotoApp(page);
  119 |     await openBell(page);
  120 |     await panel(page).getByRole("button", { name: /Maya Chen, @maya.trades sent a message/ }).click();
  121 |     await panel(page).getByRole("button", { name: "Open @maya.trades" }).click();
  122 |     await page.waitForURL(/\/app\/outreach\?thread=conv_maya$/);
  123 |     expect(calls.find((call) => call.method === "POST")?.body).toEqual({ client: "", ids: ["ntf_dm1"], all: false });
  124 |   });
  125 | 
  126 |   test("Open on a client lands in Client brain on that client", async ({ page }) => {
  127 |     await mockShellApi(page);
  128 |     await gotoApp(page);
  129 |     await openBell(page);
  130 |     await panel(page).getByRole("button", { name: /Kai Trades signed the contract/ }).click();
  131 |     await panel(page).getByRole("button", { name: "Open Kai Trades" }).click();
```
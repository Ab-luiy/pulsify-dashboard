import "dotenv/config";
import { Composio } from "@composio/core";

const USER_ID = process.env.COMPOSIO_USER_ID ?? "owner";
const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY!.trim() });
const session = await composio.create(USER_ID, { toolkits: ["instagram"], manageConnections: true });

async function tryCall(slug: string, args: any) {
  try {
    const r: any = await session.execute(slug, args);
    console.log(`\n=== ${slug} ${JSON.stringify(args)}`);
    console.log(JSON.stringify(r?.data ?? r, null, 1).slice(0, 2500));
    return r?.data;
  } catch (e) { console.log(`\n=== ${slug} FAILED: ${e}`); }
}

// 1. conversations with explicit fields
await tryCall("INSTAGRAM_LIST_ALL_CONVERSATIONS", { limit: 2, fields: "id,participants,updated_time,message_count" });

// 2. messages with explicit fields
const cid = "aWdfZAG06MzQwMjgyMzY2ODQxNzEwMzAxMjQ0Mjc2MDI1OTc3ODQxNjExMTg2";
await tryCall("INSTAGRAM_LIST_ALL_MESSAGES", { conversation_id: cid, limit: 3, fields: "id,created_time,from,to,message" });

// 3. single conversation
await tryCall("INSTAGRAM_GET_CONVERSATION", { conversation_id: cid, fields: "participants,messages" });

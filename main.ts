import { Bot } from "npm:@skyware/bot";
import { Jetstream } from "npm:@skyware/jetstream";

const AIRTABLE_PATH = Deno.env.get("AIRTABLE_PATH");
const AIRTABLE_TOKEN = Deno.env.get("AIRTABLE_TOKEN");
const JETSTREAM_ENDPOINT = Deno.env.get("JETSTREAM_ENDPOINT");
const BLUESKY_USERNAME = Deno.env.get("BLUESKY_USERNAME");
const BLUESKY_PASSWORD = Deno.env.get("BLUESKY_PASSWORD");

function getAirtableRecords() {
  return fetch(`https://api.airtable.com/v0/${AIRTABLE_PATH}?filterByFormula=bluesky_did`,
    {headers: {Authorization: `Bearer ${AIRTABLE_TOKEN}`}}
  ).then(res=>res.json()).then(body => body.records.map(record => record.fields));
}

const airtableRecords = await getAirtableRecords();

console.log(`${airtableRecords.length} records successfully fetched from airtable`)

const didToRecords = new Map(
  airtableRecords.map(record => [record.bluesky_did, record]));

const jetstream = new Jetstream({
  wantedCollections: ["app.bsky.feed.post"],
  // TODO: Persistent timestamp cursor, for catching up after reboot?
  wantedDids: airtableRecords.map(record => record.bluesky_did),
  endpoint: JETSTREAM_ENDPOINT
});

const bot = new Bot();
await bot.login({identifier: BLUESKY_USERNAME, password: BLUESKY_PASSWORD});

jetstream.onCreate("app.bsky.feed.post", (op) => {
  if (!op.commit.record.reply) {
    const uri = `at://${op.did}/${op.commit.collection}/${op.commit.rkey}`;
    const rootRef = {cid: op.commit.cid, uri};
    bot.post({
      text: didToRecords.get(op.did).post,
      external: didToRecords.get(op.did).url,
      replyRef: {
        root: rootRef, parent: rootRef
      }
    }).then(post => console.log(`replied to ${uri}: ${post.uri}`))
      .catch(console.error);
  }
});

jetstream.start();

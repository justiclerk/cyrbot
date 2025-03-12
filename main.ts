import { Bot } from "npm:@skyware/bot";
import { Jetstream } from "npm:@skyware/jetstream";
import ms from "npm:ms";

const AIRTABLE_PATH = Deno.env.get("AIRTABLE_PATH")!;
const AIRTABLE_TOKEN = Deno.env.get("AIRTABLE_TOKEN")!;
const JETSTREAM_ENDPOINT = Deno.env.get("JETSTREAM_ENDPOINT");
const BLUESKY_USERNAME = Deno.env.get("BLUESKY_USERNAME")!;
const BLUESKY_PASSWORD = Deno.env.get("BLUESKY_PASSWORD")!;
const REFRESH_INTERVAL = Deno.env.get("REFRESH_INTERVAL");

const airtableEndpoint = `https://api.airtable.com/v0/${AIRTABLE_PATH}?filterByFormula=bluesky_did`;

interface RepFields {
  bluesky_did: string,
  post: string,
  url?: string
}

interface AirtableResponse {
  records: Array<{fields: RepFields}>,
  offset?: string
}

async function getAirtableRecords() {
  const records: Array<RepFields> = [];

  let response: AirtableResponse = await fetch(airtableEndpoint, {
    headers: {Authorization: `Bearer ${AIRTABLE_TOKEN}`}
  }).then(res=>res.json());
  records.push(...response.records.map(record => record.fields));

  while (response.offset) {
    response = await fetch(airtableEndpoint + `&offset=${response.offset}`, {
      headers: {Authorization: `Bearer ${AIRTABLE_TOKEN}`}
    }).then(res=>res.json());
    records.push(...response.records.map(record => record.fields));
  }

  return records;
}

let airtableRecords: Array<RepFields> = [];
let didToRecords: Map<string, RepFields>;

async function updateAirtableRecords() {
  airtableRecords = await getAirtableRecords();

  console.log(`${airtableRecords.length} records successfully fetched from airtable`)

  didToRecords = new Map(airtableRecords.map(record => [record.bluesky_did, record]));
}

console.log(`initializing records`)
await updateAirtableRecords();

const bot = new Bot();
await bot.login({identifier: BLUESKY_USERNAME, password: BLUESKY_PASSWORD});

const jetstream = new Jetstream({
  wantedCollections: ["app.bsky.feed.post"],
  // TODO: Persistent timestamp cursor, for catching up after reboot?
  wantedDids: airtableRecords.map(record => record.bluesky_did),
  endpoint: JETSTREAM_ENDPOINT
});

jetstream.onCreate("app.bsky.feed.post", (op) => {
  const repRecord = didToRecords.get(op.did);

  if (repRecord && !op.commit.record.reply) {
    const uri = `at://${op.did}/${op.commit.collection}/${op.commit.rkey}`;
    const rootRef = {cid: op.commit.cid, uri};

    console.log(`post detected: ${uri}`)
    bot.post({
      text: repRecord.post,
      external: repRecord.url || undefined,
      replyRef: {
        root: rootRef, parent: rootRef
      }
    }).catch(err => {
      console.error(err);

      // workaround for:
      // - https://github.com/skyware-js/bot/issues/26
      // - https://github.com/skyware-js/bot/issues/27
      console.log(`retrying reply to ${uri} without external embed`);
      return bot.post({
        text: repRecord.post,
        replyRef: {
          root: rootRef, parent: rootRef
        }
      });

    }).then(post => console.log(`replied to ${uri}: ${post.uri}`))
    .catch(console.error);
  }
});

jetstream.start();

async function refreshRecords() {
  console.log(`${REFRESH_INTERVAL} passed, refreshing records`)
  await updateAirtableRecords();
  jetstream.updateOptions({wantedDids: airtableRecords.map(record => record.bluesky_did)});
}

if (REFRESH_INTERVAL) {
  setInterval(refreshRecords, ms(REFRESH_INTERVAL));
}
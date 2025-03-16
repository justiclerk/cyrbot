import { Bot } from "npm:@skyware/bot";
import { Jetstream } from "npm:@skyware/jetstream";
import ms from "npm:ms";

const AIRTABLE_BASE_ID = Deno.env.get("AIRTABLE_BASE_ID")!;
const AIRTABLE_TABLE_ID = encodeURIComponent(Deno.env.get("AIRTABLE_TABLE_ID")!);
const AIRTABLE_API_KEY = Deno.env.get("AIRTABLE_API_KEY")!;
const AIRTABLE_ENDPOINT_URL = Deno.env.get("AIRTABLE_ENDPOINT_URL") || "https://api.airtable.com";
const BLUESKY_USERNAME = Deno.env.get("BLUESKY_USERNAME")!;
const BLUESKY_PASSWORD = Deno.env.get("BLUESKY_PASSWORD")!;
const JETSTREAM_ENDPOINT_URL = Deno.env.get("JETSTREAM_ENDPOINT_URL");
const REFRESH_INTERVAL = Deno.env.get("REFRESH_INTERVAL");

const listRecordsBaseUrl = `${AIRTABLE_ENDPOINT_URL}/v0/${
  AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}?filterByFormula=bluesky_did`;

interface RepFields {
  bluesky_did: string,
  post: string,
  url?: string
}

interface AirtableResponse {
  records: Array<{fields: RepFields}>,
  offset?: string
}

let airtableRecords: Array<RepFields> = [];
let didToRecords: Map<string, RepFields>;

// deno-lint-ignore no-explicit-any
function okJson (res: Response): Promise<any> {
  if (res.ok) return res.json();
  else throw new Error(`response not ok: ${res.status} ${res.statusText}`);
}

async function getAirtableRecords() {
  const records: Array<RepFields> = [];

  try {
    let response: AirtableResponse = await fetch(listRecordsBaseUrl, {
      headers: {Authorization: `Bearer ${AIRTABLE_API_KEY}`}
    }).then(okJson);
    records.push(...response.records.map(record => record.fields));

    while (response.offset) {
      response = await fetch(listRecordsBaseUrl + `&offset=${response.offset}`, {
        headers: {Authorization: `Bearer ${AIRTABLE_API_KEY}`}
      }).then(okJson);
      records.push(...response.records.map(record => record.fields));
    }
  } catch (err) {
    // if any fetch fails, report the error and reuse the previous records
    console.error(`failure fetching records from airtable:`)
    console.error(err);

    return airtableRecords;
  }

  console.log(`${records.length} records successfully fetched from airtable`)
  return records;
}

async function updateAirtableRecords() {
  airtableRecords = await getAirtableRecords();

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
  endpoint: JETSTREAM_ENDPOINT_URL
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

      // embeds have a history of being @skyware/bot's weak point
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
  console.log(`${ms(ms(REFRESH_INTERVAL), {long: true})} passed, refreshing records`);
  await updateAirtableRecords();
  jetstream.updateOptions({wantedDids: airtableRecords.map(record => record.bluesky_did)});
}

if (REFRESH_INTERVAL) {
  setInterval(refreshRecords, ms(REFRESH_INTERVAL));
}

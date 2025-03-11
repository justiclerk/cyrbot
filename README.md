# cyrbot

Bluesky automation for posting politicians' contact information. See it in action: [@callyourreps.us](https://bsky.app/profile/callyourreps.us)

## Deploying

cyrbot is designed to pull its backing data of accounts to monitor and reply to from an [Airtable](https://airtable.com/) with `bluesky_did`, `post`, and (optionally) `url` fields on each record (containing the [account DID](https://docs.bsky.app/docs/advanced-guides/resolving-identities), post text to reply with, and URL of the representative's website, respectively). Any records in the table without a `bluesky_did` field will be safely ignored.

## Configuring

cyrbot is configured with a few basic parameters:

- `AIRTABLE_PATH`: The combined base ID and table name to fetch records from. This is a string that looks like `appJXQTKySpQuFGlJ/tblYaV8h440FTTNCs`.
- `AIRTABLE_TOKEN`: The [personal access token](https://airtable.com/developers/web/guides/personal-access-tokens) used to fetch the records. This is a string that looks like `patp2ypLmTyoppKmv.382ea2e6827d071ab16b08258699820d018f4b3661630aa904ad4d21e815a177`.
- `BLUESKY_USERNAME`: The handle (ie. `callyourreps.us`) of the Bluesky account to post from.
- `BLUESKY_PASSWORD`: The password (an [app password](https://bsky.app/settings/app-passwords) is recommended) to use to log into the Bluesky account for posting.
- `JETSTREAM_ENDPOINT` (optional): The [Jetstream](https://docs.bsky.app/blog/jetstream) endpoint to connect to for discovering new posts to reply to. If undefined, this will use the [@skyware/jetstream](https://skyware.js.org/docs/jetstream/types/JetstreamOptions/) default (`wss://jetstream1.us-east.bsky.network/subscribe`).

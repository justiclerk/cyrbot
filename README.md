# Call Your Reps Bot

Bluesky automation for posting politicians' contact information. See it in action: [@callyourreps.us](https://bsky.app/profile/callyourreps.us)

## Configuration

cyrbot is designed to pull its backing data of accounts to monitor and reply to from an [Airtable](https://airtable.com/) with `bluesky_did`, `post`, and (optionally) `url` fields on each record (containing the [account DID](https://docs.bsky.app/docs/advanced-guides/resolving-identities), post text to reply with, and URL of the representative's website, respectively). Any records in the table without a `bluesky_did` field will be safely ignored.

## Setup

cyrbot is configured with a few basic parameters defined in the process's [environment](https://12factor.net/config):

- `AIRTABLE_BASE_ID`: The base ID for the table to fetch records from. This is a string that looks like `appJXQTKySpQuFGlJ`.
- `AIRTABLE_TABLE_ID`: The ID (or name) of the table to fetch records from. This is a string that looks like `tblYaV8h440FTTNCs` (or the name of the table).
- `AIRTABLE_TOKEN`: The [personal access token](https://airtable.com/developers/web/guides/personal-access-tokens) used to fetch the records. This is a string that looks like `patp2ypLmTyoppKmv.382ea2e6827d071ab16b08258699820d018f4b3661630aa904ad4d21e815a177`.
- `AIRTABLE_ENDPOINT_URL` (optional): The endpoint to use for querying the Airtable API (`https://api.airtable.com` by default).
- `BLUESKY_USERNAME`: The handle (ie. `callyourreps.us`) of the Bluesky account to post from.
- `BLUESKY_PASSWORD`: The password (an [app password](https://bsky.app/settings/app-passwords) is recommended) to use to log into the Bluesky account for posting.
- `JETSTREAM_ENDPOINT_URL` (optional): The [Jetstream](https://docs.bsky.app/blog/jetstream) endpoint to connect to for discovering new posts to reply to. If undefined, this will use the [@skyware/jetstream](https://skyware.js.org/docs/jetstream/types/JetstreamOptions/) default (`wss://jetstream1.us-east.bsky.network/subscribe`).
- `REFRESH_INTERVAL` (optional): a length of time (in [ms](https://www.npmjs.com/package/ms)-compatible format) to wait before periodically refreshing records from Airtable. (If undefined, records will only be fetched on startup.)

## Deployment

This automation is packaged as an OCI-compliant (Docker) container at `ghcr.io/justiclerk/cyrbot:main`. To run it on a Linux system with [Podman](https://podman.io/) installed, you can copy the unit file from `examples/cyrbot.container` in this repository to `/etc/containers/systemd`, then create a `/etc/cyrbot.env` with your corresponding deployment parameters as described in "Setup" above (it should wind up resembling `examples/cyrbot.env`). Once configured, running `systemctl daemon-reload && systemctl start cyrbot.service` as root (or restarting the system) should start the automation (check `journalctl -u cyrbot.service` for confirmation).

## Forking

The code powering cyrbot is released under a [CC0](https://creativecommons.org/publicdomain/zero/1.0/) Public Domain dedication, waiving all legal intellectual-property claims such as copyright [to the greatest extent legally permissible](https://wiki.creativecommons.org/wiki/CC0_FAQ) under international law. Under these terms, anyone who wishes to copy and/or modify this code, for any purpose, may do so freely (consult the text of the `LICENSE` file for details).

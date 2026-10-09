# YouTube and Spotify: live evidence inspection

Date: 2026-10-08 (Africa/Nairobi). Read alongside `HANDOFF-2026-10-08.md`.

## Status and scope

The user authorized proceeding with evidence inspection, selected signing in themselves, and selected dedicated local Chrome. Reclaim MCP attached successfully. YouTube was already signed in when checked; Spotify required login, which the user completed. Spotify login was checked with `wait_for_login`, then confirmed by the profile control being present and the login button absent.

This is an inspection of actual captured authenticated browser responses, **not successful zkTLS verification**. No provider draft, replay, secret-free replay, proof, provider publication, or application implementation was performed. No Git staging, commit, push, or PR operation was performed. Existing application changes were preserved.

- Reclaim mode: `old`, selected by default; no persisted mode. Old-devtools credential presence was true, Builder credential presence false. Credential validity for proof/publication has not been tested.
- Browser mode: `dedicated`, port 9222.
- Tab ID: `54F86DA1DC2057217C0A38B68A541E19`.
- Capture ID: `64aa3aee-3736-4555-96c4-0fa06025fc69` (one capture navigated across both platforms).
- Browser remained open at the end of inspection. Handles are session-specific and may expire.
- This report intentionally excludes cookies, authorization values, account identifiers, raw history, and comment text. Retrieve necessary evidence through the capture tool rather than exporting credential-bearing requests.

## Findings at a glance

| Activity | Live result | What is still unestablished |
| --- | --- | --- |
| YouTube subscriptions | My Activity returned dated `Subscribed to` entries linked to channel URLs; YouTube itself returned current subscribed state | Original-ever subscription versus resubscription semantics; completeness; proof compatibility |
| YouTube likes | My Activity returned `Liked` entries with timestamps, video URLs, creator channel URLs | Re-like semantics; full pagination; proof compatibility |
| YouTube watch activity | My Activity returned timestamped `Watched` entries, including YouTube Music, with video and channel URLs | Listening/watch duration, completion, exhaustive coverage, attribution on shared devices |
| YouTube comments | Five entries with timestamps and URLs containing video and comment IDs | Original versus edited timestamp semantics; Brand-account behavior |
| Spotify liked songs | Actual current flow used `fetchPlaylist` and `fetchPlaylistContents`; each item includes `addedAt`, `addedBy`, track and artist URIs | Secret-free accessibility, repeat-save semantics, cross-account resistance, proof compatibility |
| Spotify artists | `libraryV3` filtered to Artists returned artist URIs and `addedAt` | Whether date is original follow or latest library addition; account binding in the proof |
| Spotify saved albums | Mixed library response returned album URIs, artists, and `addedAt` | Dedicated album-filter validation and repeat-save semantics |
| Spotify playback | Recently-played endpoint returned context URI, last-played timestamp, last-played track URI | This is a last-event summary per context, not a complete listening-event ledger |

## YouTube: exact captured sources

### Identity and current status

- `96201.824`: POST `https://www.youtube.com/youtubei/v1/account/account_menu?prettyPrint=false`.
  - `actions[0].openPopupAction.popup.multiPageMenuRenderer.header.activeAccountHeaderRenderer` contains account name, handle, and `manageAccountTitle.runs[].navigationEndpoint.browseEndpoint.browseId` for the selected YouTube channel.
  - `responseContext.mainAppWebResponseContext.datasyncId` contains a numeric account component followed by `||` in this account. `loggedOut` is false.
- `99DE61F69CAA45E89886E33E4663C9CA`: GET `https://www.youtube.com/feed/channels`.
  - Captured HTML embeds `var ytInitialData = ...` as JSON.
  - 65 channel renderers were found in the returned initial response.
  - Path: `contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].shelfRenderer.content.expandedShelfContentsRenderer.items[i].channelRenderer`.
  - Each inspected item pairs `channelId` with `subscribeButton.subscribeButtonRenderer.subscribed: true` and matching button `channelId`.
  - No subscription start date was established from this renderer.
- `8C5B88E2DEADA8D01074D39061F8C9E3`: GET `https://www.youtube.com/playlist?list=LL`.
  - Initial data contains `header.playlistHeaderRenderer` with `playlistId: LL`, `privacy: PRIVATE`, and owner channel endpoint. Displayed total was 455.
  - Video entries use `lockupViewModel` in this version of the site, rather than the older expected `playlistVideoRenderer` shape.
  - Publication-age labels are not like dates.
- `D8058DC6F02A08BF44E791A7755302D2`: GET `https://www.youtube.com/feed/history`. Page observed with relative day groupings; deeper timestamp inspection used My Activity instead.

### My Activity: dated evidence in the actual HTTP response

These were captured GET HTML responses. The structured activity is embedded in `AF_initDataCallback` data arrays. It was parsed from the **captured response body**, not inferred from DOM text. An inspected Details dialog corroborated the first like/watch times displayed in EAT.

| Activity | Request ID | Page | Embedded dataset | Returned rows |
| --- | --- | --- | --- | --- |
| Watch/search history | `00CBA0E84D8D345938FE70A755409B8F` | `/product/youtube?hl=en&utm_medium=web&utm_source=youtube&pli=1` | `ds:5` | 100 |
| Likes/dislikes | `9244A347CE2A92B75161F4F7F0AA7E5D` | `/page?page=youtube_likes&continue=...&hl=en` | `ds:3` | 100 |
| Subscriptions | `B476F6422360CE11BFFBF6E542014ADB` | `/page?page=youtube_subscriptions&continue=...&hl=en` | `ds:3` | 65 |
| Comments | `3B462A43C47792F40BFB201B8E707911` | `/page?hl=en&utm_medium=web&utm_source=youtube&page=youtube_comments` | `ds:3` | 5 |

All page paths above are on `https://myactivity.google.com`.

For watch, like, and subscription records, in the observed dataset:

- `data[0][i][4]`: numeric timestamp; interpreting as Unix microseconds agrees with displayed time in the checked examples.
- `data[0][i][9][2]`: activity text, e.g. `Watched`, `Liked`, `Subscribed to`. Search records also appear in history and must be excluded when evaluating watch support.
- `data[0][i][9][3]`: target URL. Watch/like records point to a video; subscription records point to a channel.
- `data[0][i][32][0][3]`: creator channel URL for inspected watch/like records.
- `data[0][i][5]`: opaque activity token. Stability and suitability for deduplication are untested; do not assume it is a durable event ID.
- `data[1]`: nonempty continuation string for history, likes, and subscriptions. Full history was not paginated. Returned counts are not claims of completeness.

Observed boundaries (UTC; source precision retained in the numeric field):

- History first returned: `2026-10-08T08:21:56.061Z`; last returned: `2026-10-06T18:40:15.286Z`.
- Likes first returned: `2026-10-07T16:21:41.536Z`; last returned: `2026-09-03T13:18:03.263Z`.
- Subscriptions newest returned: `2026-09-14T13:31:25.509Z`; oldest returned: `2022-10-21T13:23:01.720Z`.
- Comments newest returned: `2025-11-10T10:39:09Z`; oldest returned: `2023-03-22T14:44:39Z`.

Comment records differ: `[9][0]` contains comment text; `[32][0]` contains the `Commented on` label and target title, while `[32][0][3]` is a watch URL with `v` and `lc` query parameters for video and comment identity. Do not apply the watch/like tuple interpretation blindly to comments.

### Source-account linkage lead

All four captured My Activity response bodies contain a top-level page configuration `S06Grb` whose value equals the numeric component of the captured YouTube account-menu `datasyncId`. Other observed page configuration keys also repeat that account identifier. The selected channel ID was not found in the subscription My Activity HTML.

This is a concrete candidate linkage between My Activity's Google account and the selected YouTube account response. It is **not yet a proven cross-account-safe join**. Establish the configuration field's semantics, bind it in each proof, and test Personal/Brand channels, alternate Google accounts, mixed-account captures, and conflicting extracted values before relying on it. Merely loading both requests in one browser/capture does not establish this binding.

The page states that history auto-delete is set to 36 months for this account. This does not establish retention for every interaction category. Details also warn that shared devices or multiple signed-in accounts can cause another account's activity to appear. Report source-recorded account activity, not a guarantee about the human who watched it.

## Spotify: exact captured sources

GraphQL requests below are POSTs to `https://api-partner.spotify.com/pathfinder/v2/query`. Operation names and variables were read from captured request bodies, not guessed from older source code.

### Identity

- `96657.1245`, operation `profileAttributes`, variables `{}`.
- `data.me.profile` includes `accountId`, `uri`, `username`, name and avatar fields.
- Stable source user URI is available. No display-name-only identity is needed.

### Liked songs: the live route differs from the original research lead

Navigating to `https://open.spotify.com/collection/tracks` produced:

- `96657.2094`: operation `fetchPlaylist`, variables include a user-specific `spotify:playlist:...` URI, offset 0, limit 25.
- `96657.2229`: operation `fetchPlaylistContents`, same playlist URI, offset 25, limit 50.
- Initial response: `data.playlistV2.name: Liked Songs`, `format: liked-songs`, `content.totalCount: 1053`.
- `attributes` includes `reporting.uri` in the form `spotify:user:<source-user>:collection`, plus `owner_username`.
- `ownerV2.data.uri` matches `profileAttributes.data.me.profile.uri`.
- `content.items[i].addedAt.isoString`: item added timestamp.
- `content.items[i].addedBy.data.uri`: adding user; checked first item matches authenticated profile.
- `content.items[i].itemV2.data.uri`: track URI.
- `content.items[i].itemV2.data.artists.items[j].uri`: track artist URI(s).
- `itemV3` also exists; do not assume every item has identical wrappers/type.
- Album `date.isoString`, track duration, and public `playcount` are metadata, not this user's activity date, listening duration, or play count.

The first returned save date was `2026-09-05T18:17:18Z`; the next-page first item was `2026-04-23T20:53:54Z`. Pagination was observed, not exhausted. This flow did **not** produce the hypothesized `fetchLibraryTracks` operation.

The response includes playlist sharing information. **Authenticated retrieval and matching owner/addedBy do not establish that the data is secret or claimant-bound.** Test the same extraction without secrets and with a different account. Require an independently authenticated source identity tied to the item owner/adder, and preserve the server-supplied `format`/collection relationship so an ordinary playlist named “Liked Songs” cannot substitute for it.

### Artists and albums

- `96657.1319`: `libraryV3`, initial mixed library, offset 0, limit 50; 50 of reported 294 entries returned. Includes 17 artist and 7 album entries in that page.
- `96657.2430`: `libraryV3`, `filters: [Artists]`, offset 0, limit 50; 50 of reported 160 artist entries returned. This was triggered by selecting the Artists library filter.
- Paths: `data.me.libraryV3.items[i].addedAt.isoString`, `.playedAt.isoString` (nullable), `.item._uri`, `.item.data.__typename`.
- First inspected artist item had added time `2026-08-30T18:02:19Z` and played time `2026-08-31T10:46:19.205Z`.
- Album entries also have artist information and separate album release dates.

These are current-library entries with source-provided added dates. Follow/unfollow/refollow and save/remove/resave behavior was deliberately not tested by modifying real account activity. Do not call these original-ever follow dates yet. The library response does not itself expose the same explicit profile identity examined above; a secure same-account join remains a proof requirement.

### Playback context summaries

- `96657.1703`: GET `https://spclient.wg.spotify.com/recently-played/v3/user/<source-user>/recently-played?format=json&offset=0&limit=50&filter=default%2Ccollection-new-episodes&market=from_token`.
- `playContexts` contained 7 entries, each with `uri`, `lastPlayedTime` (Unix milliseconds), and `lastPlayedTrackUri`.
- Contexts included playlists, artists, and an album. This records the last-played track/time per returned context, not every stream or repeat listen, and does not establish duration or completion.
- `96657.1705`, operation `fetchEntitiesForRecentlyPlayed`, resolves supplied context URIs to metadata. It cannot alone prove the claimant played those contexts.
- The Queue UI was empty and exposed no full-history tab in the inspected state. No complete per-track listening endpoint was validated.

## Constraint analysis and remaining validation

Reclaim `analyze_request_constraints` returned `concerns: []` for requests `96201.824`, `99DE61F69CAA45E89886E33E4663C9CA`, `8C5B88E2DEADA8D01074D39061F8C9E3`, `00CBA0E84D8D345938FE70A755409B8F`, `9244A347CE2A92B75161F4F7F0AA7E5D`, `B476F6422360CE11BFFBF6E542014ADB`, `3B462A43C47792F40BFB201B8E707911`, `96657.1245`, `96657.1319`, `96657.2094`, and `96657.1703`. Empty concerns are a heuristic result, not proof feasibility or security approval.

Next authorized scope should be provider **experiments** if the user elects to continue beyond inspection. Do not silently publish providers or implement the application. The strongest concrete candidates are dated YouTube My Activity interactions and Spotify collection saves; neither platform needs replacing based on evidence availability.

Required experiments include authenticated versus secret-free replay, actual proof extraction of a structurally related subject/action/target/date tuple, multiple users/targets, mixed-account rejection, context/target tampering, pagination and missing-history behavior, duplicate-event semantics, and the end-user Reclaim Verifier runtime. Keep signature and request-hash validation enabled. Large HTML bodies and unstable numeric tuple schemas need proof/runtime tests and version pinning.

No deliberate new likes, follows, subscriptions, comments, or playback were created. YouTube homepage requests did include incidental autoplay-preview playback telemetry; exclude session-generated activity from any historical-support demonstration. Spotify playback controls were not used.

No tests were run because only this evidence report was added; no application code was changed.

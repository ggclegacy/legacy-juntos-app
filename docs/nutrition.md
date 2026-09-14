# Nutrition workspace

## Delivered

Macros is a private workspace for either identity with Today, Diary, Kitchen and Progress views. The emerald/gold material system includes responsive macro surfaces, a photo-first entry point and a shared editable meal composer.

- Meals contain frozen food snapshots and gram quantities. Only eaten meals count; planned meals are separate. Corrections append revisions; remove hides a meal and restore is available. Repeat opens a fresh editable copy.
- Coach or personal targets have an effective date and separate training/rest values. There are no default prescriptions or automatic adaptations. Adding a version can deliberately restate history from its selected effective date.
- Custom foods accept label values for a known gram basis, including decimal commas. Preparation, source and amount method remain visible. USDA food search rejects entries missing any required macro rather than filling them with zero.
- Recipe portions divide ingredient totals by the weighed finished batch. Logged portions keep the old recipe nutrition even if the recipe is edited. Uniform-mixture assumption is disclosed.
- A local food library is assembled from saved foods and previously used food snapshots. Portion ideas conservatively fit one food to remaining macros; they are not complete meal planning or dietary advice.
- Daily training/rest context, completeness and water counter; seven-day diary; private JSON export including revision history. Unlogged days display a dash and are not averaged as zero.
- Barcode camera uses lazily loaded ZXing with manual entry fallback, valid GS1 check digits and exact normalized GTIN matching. Camera streams stop when the scanner closes. Camera permission is same-origin only.
- Photo/text recognition and nutrition-label extraction have authenticated server routes, explicit provider consent, bounded input, timeouts and validation. They return editable drafts and never save or change targets. Re-running recognition replaces the previous generated batch to avoid double logging.

## Setup

Apply migrations 001–005 in order to the configured Supabase project. `005_nutrition.sql` creates owner-only append-only `nutrition_events`; no partner, shared-AI or coach access is granted. The API additionally validates complete payloads and authenticates active workspace membership. SQL independently enforces ownership, membership, allowed kinds, size, contiguous revisions and one day identity per owner/workspace/date. Direct database clients must use the API for full payload validation.

Set server-only `USDA_API_KEY` for FoodData Central search and barcode product lookup. USDA's data is CC0; the UI retains source IDs and nutrition snapshots. Brazil-specific packaged-food coverage is not assured. Unknown barcodes use label/manual entry; no unlicensed Brazilian table is copied.

For AI, set `OPENAI_API_KEY`, `OPENAI_MODEL` to an account-enabled model supporting image input, and `NUTRITION_AI_ENABLED=true`. Photo/text drafts also need USDA. Label extraction can work without USDA. Responses uses `store:false`; this is not a guarantee of zero provider retention. Review the configured account's actual data controls before real nutrition photos are submitted.

Serve over HTTPS for phone cameras (localhost is secure only on that same device). The camera/label picker resizes supported images to a 1024px JPEG and strips original metadata. Photos stay in component memory and the submitted request, not diary storage. HEIC support depends on browser decoding; JPEG/PNG is the fallback. Food notes and names are untrusted data, never AI instructions. No AI tools or hidden health/protocol records are supplied. Retrieval is by food query, never another person's private history. Identity is revalidated before an AI response is returned.

Search/analysis currently use the foundation's shared 30-per-account-per-clock-hour request quota; each analysis can make up to 12 food searches. Separate nutrition quota/cost accounting and result caching are future work.

## Sample versus connected storage

Sample mode has clearly marked illustrative foods, independent sessionStorage diaries per sample identity, and functional manual logging, targets, recipes and progress. It does not simulate image/text recognition or call paid providers. This storage is for fictional information, can be evicted, and is not authenticated privacy. Closing the tab may lose its sample history.

Connected mode uses authenticated requests and owner-only RLS; nutrition content is not persisted in browser storage. Saves retain a stable request ID for retry, and stale revisions are rejected. There is no offline write queue or background sync. Failed saves preserve the open draft. Export files are sensitive user-controlled downloads; full restore/import is not implemented. Append-only corrections retain old values; permanent account erasure needs the deployment's administrative deletion process.

## Accuracy boundaries and remaining work

Food photographs cannot measure hidden oil, preparation losses or exact portions. The AI proposes database matches and estimated grams; users must review matches, amounts and omitted ingredients. First database candidates are proposals, not verified matches. Labels also require human review. No precision percentage or invented confidence score is shown. Calories retain the source's energy value rather than forcing 4/4/9 equality because label rounding and food energy conventions differ.

No direct voice recording is implemented: the text field supports phone-keyboard dictation. No coach portal, automatic target import, wearable sync, adaptive expenditure model, micronutrient completeness, restaurant guarantee, meal-photo history, grocery ordering, full Portuguese localization, or multi-food optimization is claimed. Macro totals are private and are not automatically linked into health AI or shared dashboards.

Before production use: configure real credentials, run hosted two-account auth/RLS checks, validate real device camera scanning and multilingual food/photo/label samples against weighed reference meals, monitor failures and provider costs, and test backups/restores. Automated tests cover deterministic math, API guards, actual PostgreSQL RLS and desktop/mobile sample workflows; they cannot establish real-world AI estimation accuracy.

The research and provider/licensing rationale are in [nutrition-research.md](nutrition-research.md).

The current client fetches paginated events but holds the complete private history for local calculations. Before multi-year/high-volume use, add server-side day views, indexed food search, and incremental history loading. The camera library is loaded only when scanning starts.

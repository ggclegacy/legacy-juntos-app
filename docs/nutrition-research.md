# Legacy Juntos — Nutrition and Macro Intelligence

## Product direction

Create a nutrition workspace that makes accurate logging easier and turns the remaining daily targets into practical meal choices. Photo logging is the primary entry point, supported by natural-language input, barcodes, label scanning, weighed ingredients, and reusable recipes. Every pathway produces the same editable meal draft before anything enters the diary.

This specification draws on official product documentation, developer APIs, food-composition authorities, and original research reviewed on September 13, 2026. Product comparisons describe documented capabilities, not hands-on competitive testing. No provider has been benchmarked on Kamilla's food or contracted. Recommendations and release targets below are proposed engineering decisions, not established product performance.

Both accounts receive identical capabilities. Kamilla's existing coach can remain the source of prep targets without supplying an entire meal plan. Targets, food preferences, and diaries stay individual; recipes and review packets may be explicitly shared. No actual calorie or macro prescription is assumed.

## Competitive findings

| Reference | Documented strength | Design implication for Legacy Juntos |
|---|---|---|
| MacroFactor | Photo and photo-plus-text input create editable food entries; its logger also supports barcode and label capture.[1][2] | Use one reviewable meal composer. Preserve corrections and make frequent foods fast to reuse. |
| Cronometer | Photo and voice logging use established nutrition databases rather than relying entirely on generated nutrient values.[3] | Separate recognizing a food from looking up its composition. Preserve missing micronutrients as unknown. |
| RP Diet Coach | Its July 2026 scanner combines meal photos, barcode recognition, and nutrition-label scanning with editable ingredients.[4] | A camera with three clear modes is now a credible baseline, not a unique differentiator. Integrate it with coach-defined targets and meal preparation. |
| MyFitnessPal | Meal Scan offers photo-assisted logging; its current documentation specifies English-language availability.[5] | Portuguese input and Brazilian product matching need explicit implementation and testing, not merely translated buttons. |
| SnapCalorie | Offers photo/description analysis and a developer API returning food components, portions, and nutrition.[6] | Include it in a provider evaluation, while independently testing its marketing claims and data sources. |
| LogMeal | Provides food recognition and quantity estimation, including image sequences and depth-oriented workflows.[7] | Consider richer capture later, without making special hardware or a native depth SDK a prerequisite for V1. |

The strongest opportunity is the combination of fast capture, transparent uncertainty, preparation-aware measurement, coach-controlled targets, and personal meal reuse. It would be inaccurate to claim that no existing app already combines photos, barcodes, and macros.

## Accuracy model

A photograph contains visible appearance, not a direct measurement of nutrient content. Food identification, quantity estimation, recipe composition, database matching, and consumed amount can each introduce error. Hidden oil, sauces, mixed dishes, ingredients beneath other foods, and leftovers are particularly important design cases.

Nutrition5k includes measured components and depth/video information from a specific cafeteria setting; benchmark results from it cannot establish accuracy for arbitrary phone photos or Brazilian dishes.[8] A 2025 CVPR workshop paper found benefits from decomposing a meal into components before estimating nutrients, but its evaluated samples do not justify a universal accuracy percentage.[9]

Use a visible provenance label: **label + entered amount**, **database + weighed amount**, **saved recipe**, **photo estimate**, or **manual estimate**. User confirmation means the entry was reviewed, not that the nutrients were laboratory verified. Even weighed food and package labels have uncertainty.

Do not display invented confidence percentages. Initially, show the assumptions that matter: “portion estimated,” “oil not specified,” or “brand not confirmed.” Numerical ranges should be introduced only after calibration demonstrates what those ranges mean. Never label a low-quality result precise merely because it contains decimal places.

## Logging workflows

### Photo logging

The primary action is a large camera button. Capture or upload an image, optionally add a short description, and receive an editable list of recognizable components. Each component shows the selected food, preparation state, proposed amount, nutrition source, and macro contribution. The user can replace a match, change grams, remove an item, or specify how much was actually eaten.

Ask one high-value clarification when needed: cooked versus dry rice, added oil, sweetened versus unsweetened açaí, or the product used in a shake. Do not interrupt every meal with a questionnaire. Offer an optional second angle or known plate dimension; neither should be presented as eliminating uncertainty. Scale readings supplied by the user take precedence over visual guesses.

For repeated prep meals, offer a match to a saved recipe or meal template. Confirm that it is the same recipe and portion instead of blindly re-estimating each photograph. Support “photographed now, log later” drafts with explicit retention settings. A before/after pair can help record leftovers, but the consumed fraction still needs review.

### Type or speak

Accept entries such as “150 g cooked chicken, 120 g cooked rice, and 10 g olive oil.” Support Portuguese, English, decimal commas, grams, ounces, household measures, and multiple foods in a single sentence. Convert speech into a visible transcript before food resolution. A sentence mentioning a planned dinner should create a plan, not record consumption.

The parser produces structured components and quantities. A lookup layer resolves candidate foods; deterministic arithmetic calculates macros. Corrections such as “the rice was weighed dry” update the affected component rather than appending another meal. Uncertain tablespoon weights or missing serving sizes require a food-specific conversion or clarification.

### Barcode and nutrition label

Barcode scanning identifies a product; it does not measure the serving eaten or guarantee the database entry matches the current package. Match product, brand, market, and package size; then ask for the amount consumed. Preserve barcode digits and leading zeros, validate supported formats, and offer manual code entry when scanning fails.

When no trustworthy match exists, scan the nutrition panel and serving information. Extract calories, protein, carbohydrate, fat, serving size, and optional micronutrients into a review form. Distinguish per-serving, per-100-g, per-100-mL, and per-package columns. FDA guidance emphasizes serving size and servings per container.[10] Brazilian labeling conventions require separate handling rather than US-only parsing.[11]

A private custom food can be saved after review. Do not publish the user's package photo to a community database automatically. Rechecking an updated label creates a new food version without changing historical meals.

### Manual and quick entry

Search, recent foods, favorites, copied meals, and quick-add macros remain first-class paths. They must work when an AI provider is unavailable. A quick-added meal has known macro totals but may lack ingredient or micronutrient detail; do not manufacture the missing data.

## Kitchen and meal preparation

Build reusable recipes from ingredients, a label, or pasted recipe text. Confirm the ingredient amounts and preparation details before calculating. Save the total finished batch weight and allow logging a weighed portion or a documented number of servings.

For a reasonably uniform batch, the portion fraction is consumed batch weight divided by finished batch weight. Multiply that fraction by the recipe's ingredient-derived totals. For separately portioned chicken, rice, and vegetables, track component weights instead of assuming every gram of the tray has identical composition. Added water changes finished weight, while discarded fat or cooking liquid may change retained nutrients; record assumptions rather than promising exact retention.

Support tare/container weights, recipe versions, planned versus eaten portions, batch splitting between Neil and Kamilla, and “repeat this meal with a different amount.” Shared recipes do not imply shared diaries. Add meal templates, grocery-list generation, and ingredient substitutions. Grocery lists remain internal plans, not automatically placed orders.

Brazilian support should recognize distinctions such as feijão preparations, cooked rice, farofa ingredients, pão de queijo recipes, tapioca products, and sweetened versus plain açaí. These examples define test cases and search vocabulary, not one universal composition for each dish. TBCA supplies valuable Brazilian reference material, but its published restrictions mean reproduction, modification, and integration rights must be reviewed before importing it.[12]

## Targets, coaching, and practical guidance

Provide versioned daily targets for calories, protein, carbohydrate, and fat, with optional training/rest-day schedules and meal-level allocations. Capture who supplied the target and when it takes effect. Let a person enter a coach's numbers without requiring an algorithmic diet plan. Resolve inconsistent calorie and macro targets explicitly; do not silently rewrite one to fit the other.

During coached prep, AI can help select foods and organize meals within the chosen targets. It must not secretly revise those targets from weight changes or compensate for a logged overage by prescribing restriction the next day. Outside prep, optional adaptive guidance may be introduced as a reviewable proposal after validation and sufficient reliable history.

A **“Build my next meal”** feature should generate a few choices from saved foods and recipes, considering remaining targets, preferences, available ingredients, and practical portion limits. Calculate candidate macros with the same nutrition engine used for logging. Explain trade-offs when an exact match is unrealistic. The language model can suggest combinations; it should not perform the final arithmetic or invent food values.

Track complete, partial, and unlogged days distinctly. MacroFactor explicitly describes partial logging as a source of error for expenditure estimates.[13] Do not infer low intake from an incomplete diary. Weight trend, training performance, sleep, hunger, and digestion can provide context, but not prove that a macro change caused an outcome. Avoid automatically adding wearable exercise calories to a coach's prescription.

Weekly reviews can summarize target history, recorded averages, missing days, estimated versus weighed entries, and the user's questions. Include optional fiber, water, and available micronutrient views without assuming missing values are zero. Avoid food morality scores, public streaks, or competitive weight-loss comparisons. The IOC's REDs consensus supports designing for adequate fueling and qualified review of health/performance concerns; the app should not diagnose REDs or compute a definitive risk score from diary entries.[14]

## Provider architecture and selection

| Layer | Proposed implementation | Decision gate |
|---|---|---|
| Generic foods | USDA FoodData Central search/detail adapters; Foundation/FNDDS or other appropriate entries based on food and preparation. | Dataset identity and nutrient semantics remain visible. FDC data are CC0.[15] |
| Brazilian/branded coverage | Evaluate a licensed regional source, plus private label-derived foods. | Test actual grocery products and Brazilian meals, not advertised database size. |
| Photo/text analysis | Evaluate fatsecret and SnapCalorie against a multimodal component-extraction baseline. | Compare correction burden, missing ingredients, macro errors, latency, privacy terms, and rights to retain results. |
| Barcodes | Decode on device, resolve through a server adapter, then confirm the package and serving. | Require a tested fallback on the actual iPhone/Android browsers. |
| Labels | Separate OCR/vision extraction with deterministic validation and user review. | Test regional labels and column selection independently of food-photo recognition. |
| Calculation | Local/server deterministic functions operating on normalized quantities. | No language-model arithmetic in committed totals. |

fatsecret documents image recognition, natural-language processing, and regional selection including Brazil/Portuguese.[16][17] Its image endpoint explicitly excludes plain nutrition-label images, so it cannot serve as the only camera endpoint.[18] Its documentation also restricts long-term storage of most returned values.[19] Obtain suitable contractual rights before depending on it for immutable historical nutrient snapshots; storing identifiers and re-fetching changing values is not equivalent to preserving the original diary calculation.

SnapCalorie's API supports description/image analysis and exposes separate nutrition, UPC, and label documentation. Its responses include portion and per-100-g fields, with source URLs in the documented example.[6] Use server-side requests with credentials in the body or authorized headers rather than placing keys and private descriptions into logged URLs. Validate source URLs and nutrient fields; their presence is not proof of accuracy or licensing suitability.

Open Food Facts is a possible secondary product source, with provenance, attribution/licensing review, and rate-limit-aware access. Its API documentation cautions against using search as unrestricted typeahead.[20] Keep its source lineage separate and do not assume all returned products are complete or reviewed. Its public contribution workflow must not be confused with private food logging.

No provider should be declared the accuracy winner without a representative test. Start with rights-compatible generic data and private labels; select the commercial recognition/regional provider after a bounded evaluation. Native depth capture is a later option if it measurably reduces error enough to justify extra interaction and platform complexity.

## Implementation in the current application

The existing Next.js/React app and Supabase account model are suitable for this workspace. Add a dedicated nutrition module and owner-scoped tables rather than placing meals in shared generic notes or protocol medication records.

The current `next.config.ts` denies camera access. The implementation must intentionally permit same-origin camera use, request access only when the user starts scanning, and stop camera tracks when the scanner closes. `getUserMedia` requires an appropriate secure context and permission; test the installed PWA on a physical phone, not just localhost on a computer.[21] Keep upload/manual entry available when permission is denied or unanswered.

Native `BarcodeDetector` has limited browser availability.[22] Feature-detect it and provide a bundled decoder such as ZXing's browser library, loaded only when needed.[23] Do not assume Web Bluetooth scales or device LiDAR will work in the existing PWA. Barcode decoding should happen locally, so only the resulting code reaches product lookup.

Proposed data groups are food-source references and permitted food versions; personal foods; recipes and recipe versions; meal drafts; committed meals and items; target versions; day-completeness records; capture jobs; media; and scoped sharing grants. Each meal item retains quantity, unit, preparation state, source identity, calculation version, and the nutrient snapshot where storage rights permit. Preserve explicit missing values. Keep calories and macros as sourced fields; use plausibility checks rather than forcing every record to exactly match a simplistic energy formula.

Use adapters such as `searchFoods`, `resolveBarcode`, `analyzeMealPhoto`, `parseMealText`, and `extractLabel`. Separate their output schemas from the diary schema. A provider result cannot commit a meal. The user-reviewed draft is recalculated and atomically committed server-side with an idempotency key and expected-account check. Edits, retries, interrupted uploads, and restored drafts must not double-log food.

Meal photos remain in a private bucket or transient capture storage, with short-lived authorization, image decoding/re-encoding, metadata removal, bounded file/pixel sizes, and retention controls. Do not use the original-report vault's download-only handling as a substitute for a safe image-processing pipeline. Treat text inside images and recipes as untrusted data, not instructions to the AI. Do not expose nutrition records to shared AI unless explicitly included by the owner.

Persistent offline drafts require explicit trusted-device opt-in and account-scoped storage. Make pending versus synced states clear. A declined or failed analysis must leave a usable draft and a manual route. Cross-link nutritional supplements such as protein powders to protocol records if useful, but count a consumed item only once in nutrition totals.

## Premium interface

Use four destinations: **Today, Diary, Kitchen, Progress**, with a persistent **Log food** action offering Photo, Speak/type, Barcode, Label, and Search. Coach targets and review live within Today and Progress instead of becoming another complicated navigation system.

Today shows a legible calorie summary, three refined macro indicators, the current target source, and the next useful action. The camera review keeps the actual meal image visible beside editable components. Emerald glass, warm gold, obsidian depth, and restrained motion establish continuity with the app. Do not cover the food photo with decorative effects or hide quantities behind gestures. Portuguese food names and familiar measures should feel native to the workflow.

## Validation and build sequence

First build the deterministic food/portion engine, private diary, custom foods, coach-entered targets, and repeatable meals. Next deliver a complete camera journey—capture, analysis, correction, confirmation, and saved meal—alongside barcode and label fallbacks. Then add batch recipes, practical meal suggestions, and weekly reviews. Adaptive coaching and depth capture come after validation, not as initial promises.

Create a consented test set of roughly 100–200 meals spanning weighed prep plates, mixed Brazilian dishes, restaurant food, packaged products, shakes, sauces, leftovers, poor lighting, and occlusion. This is a proposed initial engineering corpus, not enough to establish clinical validity. Reference nutrition should come from weighed ingredient recipes or verified package records, with reference limitations documented; it is not laboratory analysis of every meal.

Measure food identification and omitted components separately from portion error, calorie error, and protein/carbohydrate/fat errors. Compare raw predictions with user-corrected entries. Report median and tail errors, not just a favorable average; percentage errors become unstable near zero. Separate Brazilian and US product coverage, scan failures, correction taps, time to log, and provider cost. Establish go/no-go thresholds with the coach and users before choosing a provider.

Test raw/cooked ambiguity; cups without conversion factors; grams versus milliliters; multiple label columns; decimal commas; duplicate barcodes; reformulated products; recipe yield changes; planned versus eaten meals; incomplete days; midnight/time zones; retries; cross-account access; and deletion. Release photo logging as an estimate until the measured evidence supports stronger language. The product should earn trust by making uncertainty easy to correct, not by claiming that a camera can replace a food scale in every situation.

## Sources

[1] [MacroFactor — AI Food Logging](https://help.macrofactorapp.com/en/articles/258-ai-food-logging), current help documentation.

[2] [MacroFactor — How to Log Food](https://help.macrofactorapp.com/en/articles/215-how-to-log-food-in-macrofactor), current help documentation.

[3] [Cronometer — Photo and Voice Logging](https://cronometer.com/features/photo-voice-logging.html).

[4] [RP Strength — AI Food Scanner update](https://rpstrength.com/blogs/articles/diet-coach-app-update-our-ai-food-scanner-is-finally-here), July 6, 2026.

[5] [MyFitnessPal — Meal Scan FAQ](https://support.myfitnesspal.com/hc/en-us/articles/360045761612-Meal-Scan-FAQ), current help documentation.

[6] [SnapCalorie — Analysis API](https://snapcalorie.github.io/docs/analysis/), developer documentation.

[7] [LogMeal — Food Quantity Detection](https://docs.logmeal.com/docs/guides-features-quantity-estimation), developer documentation.

[8] Thames et al., [Nutrition5k: Towards Automatic Nutritional Understanding of Generic Food](https://openaccess.thecvf.com/content/CVPR2021/papers/Thames_Nutrition5k_Towards_Automatic_Nutritional_Understanding_of_Generic_Food_CVPR_2021_paper.pdf), CVPR 2021.

[9] Khlaisamniang et al., [Decomposing Food Images for Better Nutrition Analysis](https://openaccess.thecvf.com/content/CVPR2025W/MTF/html/Khlaisamniang_Decomposing_Food_Images_for_Better_Nutrition_Analysis_A_Nutritionist-Inspired_Two-Step_CVPRW_2025_paper.html), CVPR Workshops 2025.

[10] [FDA — How to Understand and Use the Nutrition Facts Label](https://www.fda.gov/food/nutrition-facts-label/how-understand-and-use-nutrition-facts-label).

[11] [Anvisa — Rotulagem nutricional](https://www.gov.br/anvisa/pt-br/assuntos/alimentos/rotulagem/rotulagem-nutricional/).

[12] [TBCA — Brazilian food-composition reference](https://www.tbca.net.br/) and [regional database terms displayed on the site](https://www.tbca.net.br/base-dados/busca_regiao.php).

[13] [MacroFactor — What Is Partial Logging?](https://help.macrofactorapp.com/en/articles/241-what-is-partial-logging).

[14] Mountjoy et al., [2023 IOC consensus statement on Relative Energy Deficiency in Sport](https://doi.org/10.1136/bjsports-2023-106994), British Journal of Sports Medicine, 2023.

[15] [USDA FoodData Central — API Guide](https://fdc.nal.usda.gov/api-guide/).

[16] [fatsecret — Localization](https://platform.fatsecret.com/docs/guides/localization).

[17] [fatsecret — Natural Language Processing](https://platform.fatsecret.com/docs/v1/natural.language.processing).

[18] [fatsecret — Image Recognition v2](https://platform.fatsecret.com/docs/v2/image.recognition).

[19] [fatsecret — Storable Data](https://platform.fatsecret.com/docs/guides/storable-data).

[20] [Open Food Facts — API documentation](https://openfoodfacts.github.io/openfoodfacts-server/api/).

[21] [MDN — MediaDevices.getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).

[22] [MDN — Barcode Detection API](https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API).

[23] [ZXing — Browser library](https://github.com/zxing-js/browser/blob/master/README.md).

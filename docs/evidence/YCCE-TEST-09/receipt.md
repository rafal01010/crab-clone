# YCCE-TEST-09 verification receipt

- Base revision: `5404a3026a8125f2ca38f8a02983ebe3100f4324`. The reviewed state is the working tree, including earlier uncommitted implementation.
- Evidence: [source and runtime comparison](../../verification/checkpoint09.md). The available source excerpts are not pinned to version 1.2.1. Estimates, conflicts, and provisional identities remain labeled.
- Runtime: the shared Match fixture covers 52 resource, size, and defense scenarios. The combined foundation and checkpoint 02 through 09 run passed 288 tests with four skips. The skips cover three foundation production-host cases and an intentional failure demonstration. The run includes the checkpoint 08 browser scenario.
- Browser: `node --test tests/scenarios/checkpoint09-browser.test.js` passed with four clients on the production host. The fixture seeds the initial build and food. Collection, a food-earned upgrade, pointer interaction, and attack input use the running client. Local artifacts are `test-results/checkpoint09/combined-build.webm`, `combined-build.png`, and `attack-reach.png`.
- Other checks: `npm run build`, `npm run typecheck`, targeted ESLint and Prettier checks, and `git diff --check` passed. The build reported its existing large-chunk warning.
- Repairs: the upgrade list now accepts pointer input. The client attack cue compensates for its parent mesh scale. Two earlier fixtures now account for the expanded catalogue.
- Limits: source-version fidelity and the estimates listed in the comparison remain unverified. The browser screenshot shows the reach cue but does not measure its world-space endpoint. Live coatings and other corrosion cross-field interactions remain assigned to YCCE-TEST-10.
- Review: the user authorized completion without a separate approval. An independent coverage review identified missing provenance, elimination, heatwave, queued-refill, and bot-contact evidence; the final matrix includes those cases.

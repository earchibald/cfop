# Changelog: Smart Cube Horizons

This file is the record of what happened to each finding. The published page
embeds it. An agent reads it with the live statuses to find the next steps
(see `README.md`).

Format. One `##` heading per entry: the date, a dot, the document version.
Under it, one line per change:

- `- F-NN: <old status> → <new status>. <why, one sentence>` for a decision an agent recorded from the page.
- `- F-NN: started. <where the work lives>` when an agent begins an approved finding.
- `- F-NN: done. <commit or version>` when the work shipped.
- `- F-NN: edited. <what changed in findings.json>` when the text of a finding changed.
- `- doc: <what changed in the page itself>`.

Statuses are `proposed`, `approved`, `backlog` and `closed`. The page's store
holds the current status; this file holds the history.

## 2026-10-17 · v0.1.0

- doc: First publication. 26 findings in six themes, all `proposed`. Technical facts from an audit of `js/gan.js`, `js/bridge.js`, `js/cubetab.js`, `lab/smack.js` and `mac/Sources/` at commit `f28e61a`, checked by a second reader, and from a sourced research brief (see the Sources section of the page).

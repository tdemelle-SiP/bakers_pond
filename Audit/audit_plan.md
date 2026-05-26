# Dated Documents Audit Plan

**Scope:** every file in `bakers_pond/Dated Documents/` and its subdirectories.

**Goal:** verify accuracy of content vs filename, naming-convention compliance, duplicate detection, missing-attachment detection — all derived from reading each file's actual content, not from filename heuristics or byte-comparison shortcuts.

---

## Protocol

1. **Setup** — `Audit/` infrastructure exists: this plan, `audit_status.md`, `audit_findings.md`, and `cards/`.
2. **Calibration pull** — 10 diverse files audited via parallel agents; each agent writes one card into `Audit/cards/`.
3. **Spot-check** — user picks 2 random cards, opens those source files, and verifies the verbatim quotes in the cards match the source.
4. **Full pull** — remaining files audited via parallel-agent waves of 15-20 inside one `/execute` turn; each agent writes its card.
5. **Spot-check** — user picks 5-10 random cards across the full pull and verifies quotes.
6. **Coordinator pass** — main agent compares quote sets across all cards pairwise and writes duplicate clusters, naming-compliance gaps, and missing-attachment findings into `audit_findings.md`.
7. **Resolve and iterate** — user reviews findings; coordinator applies renames, deletions, or rewrites under `/execute` authorization in subsequent turns.

---

## Anti-shortcut Mechanism

Every claim about a file's content must cite a verbatim quote from that file. Hash matches and filename heuristics are not valid evidence. The spot-check makes faking content cost the same as reading it: a quote mismatch on any spot-checked card rejects the entire batch and forces a re-run.

Per `~/.claude/guidelines/claude-guidelines-dna.md` §1 fourth strand "Cite or it didn't happen": a claim with no witness from the actual content is inferred, not derived.

---

## Evidence Card Schema

Each card lives at `Audit/cards/<filename-without-ext>.md` and follows this format exactly:

```
EVIDENCE CARD
=============

File: <relative path from Dated Documents/>
File-size-bytes: <int>
File-mtime: <YYYY-MM-DD HH:MM, filesystem modified time>
File-ctime: <YYYY-MM-DD HH:MM, filesystem created time>
File-type: <pdf | txt | docx | png | jpg | pub | other>

WITNESS QUOTES (verbatim from file content, exact characters):
  Q1 — opening:  "<first ~80 chars of substantive content, skipping page headers>"
  Q2 — middle:   "<~80 chars from approximately the middle of the content>"
  Q3 — closing:  "<last ~80 chars before signature/footer, or signature itself>"
  Q4 — explicit date or timestamp string in content: "<verbatim, if present>"

DERIVED FIELDS (each cites the supporting quote tag in brackets):
  Document-type: <email | letter | scan | plan | photo | map | minutes | order | settlement | report | exhibit | other>  [Qref]
  Sender/author: <verbatim name as it appears in content, or UNKNOWN>  [Qref]
  Recipient(s):  <verbatim names as they appear in content, or N/A>  [Qref]
  Content-date:  <YYYY-MM-DD or UNKNOWN>  [Qref]
  Content-time:  <HH:MM 24-hour, or UNKNOWN>  [Qref]
  One-sentence subject (derived from content, not from filename): "<...>"  [Qref]
  Parties named in content: <list of person/agency names>
  Case/file numbers cited:  <list, e.g., DEP #338-0594, OADR WET-2016-022, Book 5033 Pg 256>
  Attachments referenced:   <verbatim filenames as listed in content, or NONE>

NAMING COMPLIANCE (check current filename against derived content):
  Current basename: "<filename>"
  Matches yyyy_mm_dd[_HHMM]_descriptor.<ext>: <YES | NO — reason>
  Filename date vs content date: <MATCH | MISMATCH content=<date> filename=<date>>
  Filename sender/recipient reflects content: <YES | NO — mismatch>
  Filename descriptor reflects content substance: <YES | NO — what is off>

BUNDLE CHECK:
  Single document or multi-document bundle: <SINGLE | MULTIPLE>
  If MULTIPLE, list sub-documents with one-line description each and recommend split.

DUPLICATE CANDIDATES (only if any):
  - Candidate filename: "<other file in directory>"
    Overlapping quote pair:
      this-file:  "<Q from this file>"
      candidate:  "<Q from candidate file>"
    Identity verdict: SAME-CONTENT | RELATED-THREAD | DIFFERENT — reason

UNREADABLE / FLAGS:
  Image-only PDF (no text layer):                       <YES | NO>
  Encoded or encrypted (content unparseable):           <YES | NO>
  Partial extraction (only first N pages readable):     <YES | NO — detail>
  Other parsing issue:                                  <NONE | description>

ATTACHMENT TRACE (one row per attachment referenced in this file):
  - Referenced-as:  "<verbatim string from content>"
    Found-in-directory-as: "<directory filename>" | "MISSING from directory"

AGENT NOTES:
  - Anything the agent could not determine, with reason
  - Anything notable about the content that does not fit the schema above
```

---

## Naming Convention Being Audited

Standard: `yyyy_mm_dd[_HHMM]_<sender>_to_<recipient>_<substance_descriptor>.<ext>` for correspondence; `yyyy_mm_dd_<descriptive_name>.<ext>` for non-correspondence; `undated_<descriptive_name>.<ext>` only when no content date is derivable.

HHMM is 24-hour, no separator, inserted after the date prefix when extractable from content (email timestamps). The DOC051126 batch keeps a `_DOC051126` suffix to flag DEP-batch provenance.

---

## Image-Only PDF Sub-Flow

When `pdftotext` returns empty on a PDF (image-only scan), the agent uses `pymupdf` to render pages 1-3 to PNGs in `/tmp/audit_renders/`, then uses the Read tool on the PNGs since the multimodal model transcribes text from images directly. Witness quotes for image-only files are transcribed from the visual rendering and flagged with `[image-transcribed]` to distinguish them from text-layer extraction.

---

## Resume Protocol (for a new context)

A new instance picking up this audit:

1. Read this file (`Audit/audit_plan.md`) for the schema and protocol.
2. Read `Audit/audit_status.md` to identify next unchecked files.
3. Read `Audit/audit_findings.md` for prior cross-file decisions and open questions.
4. Spawn parallel agents per the calibration or full-pull rhythm above, each writing its card to `Audit/cards/`.
5. Update `audit_status.md` checkboxes as cards complete.
6. Append findings to `audit_findings.md` after each spot-check verification.

No prior session knowledge is required beyond what these four artifacts hold.

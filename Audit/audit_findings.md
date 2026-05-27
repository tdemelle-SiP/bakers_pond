# Audit Fix List

## Addressed in this session

### Renames completed (17)

- `2015_12_16-DEP-0594-DEP_Site_Inpection_Record.pdf` → `2015_12_16-DEP-0594-DEP_Site_Inspection_Record.pdf` (typo: Inpection → Inspection)
- `2022_04_12 Civil Tracking Order.pdf` → `2022_01_12 Civil Tracking Order.pdf` (date corrected to issuance date)
- `2023_01_18 WCC Hearing Continued.pdf` → `2023_11_08 WCC Hearing Continued.pdf` (date corrected per content)
- `2025_09_13_1347_TD_email_to_Ahearn question about your letter to the DEP re Mill Pond.pdf` → `2025_09_12_1347_TD_email_to_Ahearn question about your letter to the DEP re Mill Pond.pdf` (date off by one)
- `2025_10_01_1531_TD_email_to_KS_Section 40A Restriction.pdf` → `2025_10_01_1531_TD_email_to_KC_Section 40A Restriction.pdf` (recipient KS → KC)
- `2025_10_01_1626_TD_email_to_KS_1982_MAPC_wetland_maps.pdf` → `2025_10_01_1626_TD_email_to_KC_1982_MAPC_wetland_maps.pdf` (recipient KS → KC)
- `2025_10_15_1446_TD_email_TF_DEP Status Inquiry = FORAD for 42 Mill St.pdf` → `2025_10_15_1446_TD_email_TF_DEP Status Inquiry - FORAD for 42 Mill St.pdf` (= → -)
- `2026_05_15_1415_Marc_to_LaPlante_Mr_DeMelle.txt` → `2026_05_15_1415_Marc_to_DeMelle_Mr_DeMelle.txt` (Marc IS LaPlante; matches pattern of other Marc-to-DeMelle files)
- `2023_09_01 - Response-booklet_Mon_Sep_11_2023_09-01-40.pdf` → `2023_09_08 - Response-booklet_Mon_Sep_11_2023_09-01-40.pdf` (date corrected per content)
- `1909 Walker Atlas of Westwood.md` → `1909_Walker_Atlas_of_Westwood.md` (year-only convention, spaces → underscores)
- `2016_01_13 Conservation Commssion minutes .pdf` → `2016_01_13 Conservation Commission minutes.pdf` (typo + trailing space)
- `2021_02_24 WCC Hearing Contnued.pdf` → `2021_02_24 WCC Hearing Continued.pdf` (typo)
- `2021_03_19 Delapa - Goddard Property owner Application Authorizatoin.pdf` → `2021_03_19 Delapa - Goddard Property owner Application Authorization.pdf` (typo)
- `2020_06_18 Tim McGuire Affadavit of Service to Abutters.pdf` → `2020_06_18 Tim McGuire Affidavit of Service to Abutters.pdf` (typo)
- `2020_06_18-DEP-0706-McGuire_Affadavit.pdf` → `2020_06_18-DEP-0706-McGuire_Affidavit.pdf` (typo)
- `2014_11_Abutters_Notification_Packet_42_Mill_Map28_Lot013_DOC051126.pdf` → `2014_11_10_Abutters_Notification_Packet_42_Mill_Map28_Lot013_DOC051126.pdf` (missing day component added per content)
- `2021 Goddard Continuation Requests.pdf` → `2021_Goddard_Continuation_Requests.pdf` (year-only convention, spaces → underscores)

### Confirmed as-is, no rename needed (4)

- `2022_05_07 Note on SOC Covid Extension` — date is the Covid extension event itself; correct for timeline.
- `2025_10_14_42_Mill_Brook_Erroneous_Lot_Lines_Presentation_Slide.pdf` — leave per user direction.
- `2023_06_29_FOIA_REQUEST FORMALLY FILED` — 0-byte placeholder added to mark timeline event (FOIA request to Conservation Commission), keep.
- `2023_12_19_GEI_site_visit.txt` — 0-byte placeholder added to mark timeline event (GEI site visit), keep.

---

# === Remaining items below this line ===

---

## Substantive Content-vs-Filename Mismatches (remaining)

- `1969_10_07_unspecified_special_permit.pdf` — contains TWO documents (1969 Stivaletta writ-of-attachment + 1967 Murphy 44 Mill St Special Permit Notice). Split into two correctly-dated files.

- `2016_03_19-21 DeMelle - Catrone - Dam Ownership` — multi-day date range and no extension. Decide single canonical date or split. — the question here is really are there multiple relevant points. if this is an email asking a question and then an email answering, that can be grouped. if this is many emails that cover many issues, those would be useful to separate out so that the index can be used to find specific subjects.

- `2019_12_17-DEP-0706-DEP_FORAD_2.pdf` — uses DEP #338-0706 infix but FORAD documents elsewhere reference #338-0594. Verify correct DEP file number. We'll need to investigate.

- `2020_03_19 Delapa NOI.pdf` — labeled "Delapa" but the WPA Form 3 applicant is Salvatore Vinci (corrected to Delapa later). Verify intent. Maybe "Vinci(Delapa)" or something.

- `2022_10_26_42 Mill Street signed MOU 10-26-2022.pdf` — file is a Settlement Agreement, not an MOU. If these are actually different and not interchangeable, it should be updated.

- Ten 2023 `WCC Hearing Continued` files — each PDF is a complete WCC meeting-minutes document with many agenda items, not just a continuance event. Descriptor mismatches across the series. — if these are ten hearings with ten dates, they should be ten files (suspect grouped because all continuances?).

- `2025_09_05_1045_TD_email_to_DEP_Catrone Status inquiry`: recipient is Karon Catrone (WCC), not DEP. DEP content is forwarded. Make sure the content is clear.

- `2025_09_16_1015_Todd_to_DeMelle_Fyi`: descriptor "Todd_to_DeMelle" misleading — Todd self-addressed a broadcast forward. Is this a duplicate? If so, it can be removed.

- `2025_09_16_1503_DD_Goddard_email_KC_WCC_9-17-25 meeting`: combines Sep 16 date with 1503 time that belongs to a Sep 17 forward. Fix (needs date and/or time correction; the right fix is not obvious without opening the file).

- `2025_09_17_0933_KC_WCC_emailResponse_TD 9-17-25 meeting`: content date is Sep 18, filename says Sep 17. Fix (needs date correction; time may also need check).

---

## Bundle Splits (remaining)

Applying the preservation principle in audit_plan.md: intentional bundles stay bundled; only unintentional combinations are split candidates.

### Intentional bundles (preserve as-is, no split)

- `2016_11_21_OADR_DEP_Motion_to_Accept_Settlement_WET-2016-022.pdf` — cover plus 7 attachments is a single court filing.
- `2016_12_14_OADR_DEP_Draft_FORAD_WET-2016-022.pdf` — cover email plus signed WPA Form 4B is the issuance.
- `2016_12_19_OADR_Final_Decision_and_FORAD_WET-2016-022.pdf` — cover transmittal plus Final Decision plus FORAD plus Service List is the issued package.
- `2016_12_19_MassDEP_Final_Decision_with_Attachments_WET-2016-022_DOC051126.pdf` and `-alt` — same issued package in alternate scan form. The same file is in the OADR and in the DEP records — may be worth keeping both to show that.
- `2020_11_18 Nora Loughnane email to Catrone.pdf` — email thread as transmitted. If all the same conversation about the same subject it can be kept together, but the content would be useful to note in the title if it can be.
- `2021_09_08 WCC Hearing Continued.pdf`, `2021_10_13 Minutes`, `2021_10_27 WCC Hearing Continued`, `2021_11_10 Minutes` — each is a single meeting record covering many agenda items. These can be separated out by agenda item; the number of continuances is a notable feature of the history that separating these out helps illustrate.
- `2022_02_07_watsky_ahearn_email.pdf` — email thread as transmitted. Again, if its all one concept/subject, keep it together.
- `2022_03_21 Email Donahoe - Catrone .pdf` — email thread as transmitted.
- `2022_05_06-DEP-0706-DEP_SOC.pdf` and `_Review.pdf` — SOC issuance package and its review record.
- `2022_09_08_DelapavsWCC_Docket007_OCR2.pdf` and `2023_04_24_DelapavsWCC_Docket011_OCR2.pdf` — single court filings.
- `2023_09_08 - Response-booklet_Mon_Sep_11_2023_09-01-40.pdf` — Goddard's intentional response packet with Attachments A–G.
- `2026_04_07_Exhibit_B_Provencal_Correspondence.pdf` — legal exhibit to the formal letter.
- `2026_04_07_Exhibit_C_Part2_Ferrick_Correspondence.pdf` — legal exhibit to the formal letter.
- `2026_05_17_0949_Gmail - 187-26 Pub Rec Req 42 Mill Street, Westwood.pdf` — Gmail thread as saved.
- `DEP-0706-Attachments_A_through_H.pdf` — intentional A-through-H attachment structure.

### High-confidence split candidate

- `1969_10_07_unspecified_special_permit.pdf`: contains two unrelated documents (a 1967 Murphy 44 Mill St Special Permit Notice and a 1969 Stivaletta writ-of-attachment). The two have no transmittal relationship and were scanned together in error. Split into two correctly-dated files.

### Pending provenance check

- `2016_09_19-20 Buckley - Catrone - Palmer`: five emails across two days. Saved as a thread or aggregated later?
- `2021_Goddard_Continuation_Requests.pdf`: year-long aggregation of continuance request emails. Intentional annual filing or post-hoc rollup?
- `DEP-0594-Loose_Map.pdf`, `DEP-0594-Loose_Maps.pdf`, `DEP-0594-Loose_Photos.pdf`, `DEP-0706-Loose_Maps.pdf`: these were probably loose in the DEP files when scanned during the in-person visit. If we can find the document they associate with, all the better. They may be duplicates of maps already present with the associated documents.

---

## Same-Date Duplicate Reviews

**These need to be opened up and read — not shortcuts — we need to know if they're the same and/or if they vary slightly (i.e., one is the document and the other is the signed document).**

### Previously flagged (hashes distinct, content comparison pending)
- **2016-08-25** SORAD trio (3 files).
- **2016-11-21** Settlement Agreement pair (2 files).
- **2016-12-19** Final Decision quintet (5 files).

### New candidates from wave 2
- **2016-01-20**: `2016_01_20-DEP-0594-Goddard_SORAD_request_supplemental.pdf` vs `2016_01_20_Goddard_to_DEP_SORAD_Supplement_338-0594_DOC051126.pdf` — same date, same subject, different filename conventions.
- **2016-01-27**: `2016_01_27 GEC RDA Evaluation.pdf` vs `2016_01_27-DEP-0594-GEC_Report_Summary.pdf` vs `2016_01_27_GEC_Wetland_Evaluation_Summary_Report_42_Mill_DOC051126.pdf` — three GEC files dated 1/27/16.
- **2016-08-03**: `2016_08_03-DEP-0594-SORAD_Goddard request_to_DEP.pdf` vs `2016_08_03_Goddard_to_DEP_SORAD_Supplement_Letter_338-0594_DOC051126.pdf`.
- **2016-09-08**: `2016_09_08-DEP-0594-SORAD_Goddard_appeal.pdf` vs `2016_09_08_Goddard_Appeal_of_SORAD_338-0594_DOC051126.pdf`.
- **2019-12-24**: `2019_12_24-DEP-0594-DEP_Extension.pdf` vs `2019_12_24_MassDEP_FORAD_Extension_Permit_WPA_Form_7_338-0594_DOC051126.pdf`.
- **2020-04-15**: `2020_04_15 Tim McGuire Abutters List.pdf` vs `2020_04_15-DEP-0706-Assessors_Abutters_List.pdf`.
- **2020-06-18**: `2020_06_18 Tim McGuire Affidavit of Service to Abutters.pdf` vs `2020_06_18-DEP-0706-McGuire_Affidavit.pdf`.
- **2021-11-17**: `2021_11_17-DEP-0706-WCC_NoI_Denial_Form5.pdf` vs `2021_11_17_Order_of_Conditions_Denial #338-0706 - #438-0706.pdf`.
- **2021-11-18**: `2021_11_18 WCC Denial of NoI.pdf` vs `2021_11_18-DEP-0706-WCC_NoI_Denial.pdf`.
- **2022-05-06**: `2022_05_06-DEP-0706-DEP_SOC.pdf` vs `2022_05_06-DEP-0706-DEP_SOC_Review.pdf` vs `2022_05_06_Superseding Order of Conditions.pdf` — three SOC files.
- **2026-05-05 14:25**: `2026_05_05_1425_DeMelle_to_Provencal_Supplement_to_April_7_Letter_1974_40A_Restriction.pdf` vs `2026_05_05_1425_Todd_to_Provencal_Thank_you_for_sending_the_April_28_2026.txt` — same outgoing email captured in two formats.
- **Gmail variants**: 6 `Gmail - *.pdf` files at directory root, several of which duplicate already-saved dated `.txt` versions of the same threads.
- **Letter precursors**: `Letter_MassDEP_FINAL.docx` may be a precursor to `2026_04_07_DeMelle_Letter_to_DEP_42_Mill_Street.pdf`; `Letter_Commission_FINAL.docx` similarly.

---

## Filename Convention Adjustments (remaining)

### Year-only convention
- `2016_Wetland_Delineation_Plan_DEP_Settlement_Markups_DOC051126.pdf` — already year-only form, accept as PASS.
- `2016_Wetland_Plan_Zoom_Mill_St_ROW_Annotated_DOC051126.pdf` — already year-only form, accept as PASS.
- `2020_05 WCC Filing Fee Schedule.pdf` — month-only, decide whether `2020_05_<desc>` or `2020_<desc>` applies.

### Missing date prefix
- `Undated message from Abby McCabe.pdf` — capital `Undated` deviates from canonical lowercase `undated_`. Rename to `undated_message_from_Abby_McCabe.pdf`.
- `USGIS Orthophoto View of Locus Site - Lot 2B Mill St.pdf` — also a "USGIS" typo (should be "USGS"). Add date prefix or `undated_` and fix typo.
- `USGS Site Locus - Lot 2B Mill St.pdf` — internal date 2019-12-19 derivable per agent; add date prefix.
- `Letter_Commission_FINAL.docx`, `Letter_MassDEP_FINAL.docx` — add date prefix (likely 2026-04-07 or precursor).
- `DEP-0594-Loose_Map.pdf`, `DEP-0594-Loose_Maps.pdf`, `DEP-0594-Loose_Photos.pdf`, `DEP-0594-Unknown_Detail_Alternate_Wetland_Zones_2016.png`, `DEP-0706-Attachments_A_through_H.pdf`, `DEP-0706-Loose_Maps.pdf`, `DEP-0706-Sketch_Plan_Goldman_Env_Peer_Review.png` — all lack date prefix. Year-only form `yyyy_<descriptor>.<ext>` applies where derivable.
- 6 `Gmail - *.pdf` files — add date prefix per the latest message in each thread.

### Missing file extensions
- `2016_03_19-21 DeMelle - Catrone - Dam Ownership`
- `2016_04_29 Buckley to Abutters`
- `2016_08_30 Buckley to Abutters`
- `2016_09_19-20 Buckley - Catrone - Palmer`
- `2022_05_07 Note on SOC Covid Extension`
- `2023_05_27 DeMelle - Catrone Dam Ownership`
- `2023_06_29_FOIA_REQUEST FORMALLY FILED`
- `2024_11_20_MASS_LEADS_ACT_EXTENSION`
- `2025_07_29 DeMelle email to Catrone`
- `2025_08_10 Request sent to DEP to review files through DEP website`
- `2025_08_11 DeMelle email requesting WCC documents to Catrone`
- `2025_08_15 Initial Response to document request from DEP`

### Typos in current filenames (remaining)
- `1969_02_05_Full_D0Z6.pdf` — opaque descriptor `Full_D0Z6` (likely registry download artifact). Read content and derive a meaningful descriptor.

---

## 0-Byte or Corrupt Files (remaining)

- `2025_07_23_MISSING minutes conservation commission.pdf` — corrupt/empty PDF.
- `2025_08_10 Request sent to DEP to review files through DEP website` — 0-byte.

---

## Image-Only PDFs Requiring Render-and-Verify

A large number of PDFs returned empty from `pdftotext`. The simplified protocol verdicted these on filename alone. For any whose naming you want to verify against content (especially the substantive-mismatch candidates above), a render-and-verify pass via pymupdf + multimodal Read is the resolution path.

---

## Convention Decisions (locked)

1. **Year-only content date:** `yyyy_<descriptor>.<ext>`. No `_00_00` placeholder.
2. **Hyphen-separator infixes** (`-DEP-0706-`, `-DEP-0594-`, `-338-0756-`): LEGACY ACCEPTED, not a FAIL.
3. **Spaces in filenames:** not a FAIL by themselves but flagged in NOTES for optional normalization at user's discretion.

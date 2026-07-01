# Data Change Report
## BharatCares — IGWF Applicants List
### Version Comparison: 27062026 → 29062026

---

## 1. Summary of Changes

| Metric | 27 Jun 2026 | 29 Jun 2026 | Change |
|--------|------------|------------|--------|
| Registered | 1,820 | 2,109 | **+289** |
| Applied (submitted) | 728 | 971 | **+243** |
| Draft (unique, clean) | 1,796 | 1,702 | **−94** |
| Total Unique Applicants | 2,524 | 2,673 | **+149** |
| States Covered | 34 | 34 | — |

**Overall programme health is positive** — registrations, applications, and total unique applicants all grew. The drop in Draft count is explained entirely by data quality issues described below.

---

## 2. Why Did Draft Count Drop by 94?

The Draft count did NOT fall because applicants withdrew. It dropped for two separate technical reasons:

### Reason A — 87 rows removed: Applicants who converted to Applied but stayed in the Draft sheet

When 12 applicants submitted their final application, the portal moved them to the **Applied sheet** but did **not remove** their old draft records from the **Draft sheet**. They were appearing in both sheets simultaneously.

| Person | Draft rows left behind |
|--------|----------------------|
| Dummy/test account (`-`) | 74 rows |
| Real applicant 1 | 3 rows |
| 10 other real applicants | 1 row each |
| **Total** | **87 rows** |

Our dashboard now automatically strips these duplicate rows on load (applied-first deduplication by email).

### Reason B — 7 rows removed: Draft records that simply disappeared

The raw Draft sheet went from 1,796 rows → 1,789 rows (−7). These 7 records are not in the Applied sheet either — they vanished entirely between the two exports.

**Likely reasons:**
- Applicant manually deleted their account
- Admin removed spam/invalid entries
- Portal-side duplicate detection cleaned them up

---

## 3. Bugs Found in the Excel Export

### Bug 1 — Applicants not removed from Draft after applying

**What it is:** When someone submits their final application, the portal adds a new record to the Applied sheet but leaves the old draft record(s) intact in the Draft sheet. There is no cleanup step.

**Impact:** Every future export will contain these ghost draft rows unless the portal is fixed. The count grows over time as more applicants convert.

**How we handled it:** Dashboard deduplicates on load — Applied sheet takes priority; any matching email in Draft is excluded.

**Recommended fix:** The portal should either delete draft records when an application is submitted, or flag them with a status column (e.g. `Status = "Converted"`) so they can be filtered.

---

### Bug 2 — Dummy / test account with 74 draft entries

**What it is:** A single account with all placeholder data (`-`) created 74 separate draft submissions:

| Field | Value |
|-------|-------|
| Name | `- -` |
| Email | `-` |
| Phone | `-` |
| State | `-` |
| Application IDs | SB-2026-3450 through SB-2026-3583 (74 IDs) |

This account also appeared in the Applied sheet, triggering the deduplication above.

**Impact:** Inflated the raw Draft sheet count by 74 rows. Appeared in analytics regions as "Not Specified" noise.

**Recommended fix:** Portal admin should delete this test account and its 74 application records. Add server-side validation to reject submissions with `-` or blank in all required fields.

---

### Bug 3 — Multiple draft records per person (portal creates new record on every save)

**What it is:** The portal does not update an existing draft when an applicant saves progress — it creates a brand-new record with a new Application ID each time. One person therefore has multiple Application IDs in the Draft sheet.

**Evidence:** 12 converted applicants left behind 87 draft rows — an average of 7.3 rows per person (skewed by the dummy account; the 11 real people left 1–3 rows each).

**Impact:**
- Inflates raw Draft sheet row count
- Makes it impossible to identify a single "canonical" draft per person by Application ID alone
- Complicates data analysis

**Recommended fix:** Portal should implement upsert logic — update the existing draft record on save rather than inserting a new one. Use email as the unique key.

---

### Bug 4 — Registered sheet contains 1,048,440 rows (Excel max limit)

**What it is:** The Registered sheet was exported with rows all the way to Excel's maximum row limit (~1,048,576). The vast majority of these rows are blank. Only 2,109 rows contain actual data.

**Impact:** Slows down any tool that reads the sheet naively row-by-row. Caused our server to run out of memory on Render (512MB free tier) when parsing the raw file.

**Recommended fix:** Export only rows with data. Filter blank rows before generating the Excel export. Alternatively, use CSV format for large datasets.

---

### Bug 5 — Applied sheet similarly padded to 1,048,487 rows

Same issue as Bug 4 — Applied sheet contains ~1M rows but only 971 have real data.

---

## 4. What Actually Grew (the Good News)

| Change | Count | Interpretation |
|--------|-------|---------------|
| New registrations | +289 | 289 new students registered between Jun 27–29 |
| New applications submitted | +243 | 243 draft applicants completed and submitted their application |
| Net new unique applicants | +149 | 149 brand-new people entered the programme (not in old file at all) |

The 243 new applied applicants came primarily from:
- Students who had drafts in the old file and finally submitted
- Some students who registered and applied within the 2-day window without a visible draft stage

---

## 5. Data Quality Recommendations

| Priority | Action |
|----------|--------|
| High | Fix portal export to not pad sheets to Excel max rows |
| High | Fix portal to remove/flag draft records when applicant submits |
| High | Delete the dummy test account (74 records, email = `-`) |
| Medium | Implement upsert on draft save (one record per applicant) |
| Medium | Add validation: reject records where Name, Email, Phone are all `-` |
| Low | Add a `DataVersion` or `ExportDate` column to each sheet for traceability |

---

*Report generated: 29 June 2026*
*Analysis by: BharatCares Dashboard — Claude Code*

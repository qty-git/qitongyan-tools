# Windows Desktop Workflow Design

## Goal

Create a new personal Windows-oriented tool for preparing and publishing fashion products without disrupting the existing web image-recognition tool.

The current web project remains usable as-is. The new tool will be developed in a separate GitHub repository, using selected logic from this project as a starting point.

## User Workflow

1. The operator receives a folder of product images named by style number.
2. The operator opens the Windows desktop tool.
3. The tool scans a configured local folder that contains many Excel product information files.
4. The tool builds or refreshes a local style-number index from those Excel files.
5. The operator imports or selects a batch image folder.
6. The tool extracts style numbers from image filenames and matches them to indexed product data.
7. The tool runs the existing AI image-recognition flow to generate product names, Douyin titles, subtitles, and category attributes.
8. The tool merges matched base product data with AI-generated data into a final listing table.
9. The operator reviews missing matches, invalid fields, and AI confidence issues.
10. The tool exports and saves a final master table.
11. A later phase uses the final table to create and publish Douyin product links through API or browser automation.

## Recommended Product Shape

Build a new Windows desktop app instead of extending the existing browser-only web tool.

Recommended stack:

- Electron or Tauri shell for Windows local file access.
- Existing React UI patterns reused where practical.
- Node-side or Rust-side local services for folder scanning, Excel parsing, and file persistence.
- SQLite for local indexes, batch records, and publish results.
- Existing OpenRouter/LLM prompt and recognition logic adapted from the current project.

Electron is the easier first choice because the current project is already React and TypeScript, and Excel/file-system libraries are readily available in Node.

## Repository Strategy

Use two separate repositories:

- Existing repository: keep the current web recognition tool stable.
- New repository: desktop workflow app, copied from the current project only where useful.

This avoids desktop dependencies, file-system permissions, SQLite, and publish automation from disrupting the current web build.

The new repository can begin from a copy of the current project, then remove or adapt browser-only assumptions such as localStorage-only persistence.

## Data Model

The desktop tool should store local data only. No shared cloud database is required.

Core records:

- Product source row: style number, size, color, price, stock, category, supplier/source file, and raw Excel row data.
- Image asset: file path, filename, extracted style number, image group, and match status.
- AI result: generated title, subtitle, product name, extracted attributes, model metadata, and errors.
- Merged listing row: final fields ready for export or publishing.
- Batch: imported folder, scan time, output path, counts, and status.
- Publish result: item id, link, success/failure status, and failure reason.

## File And Excel Scanning

The tool should let the operator configure one or more product-data folders.

Scanning behavior:

- Recursively find `.xlsx`, `.xls`, and optionally `.csv` files.
- Ignore temporary Office files such as files beginning with `~$`.
- Track file path, modified time, and size.
- Only re-parse files that are new or changed.
- Normalize column names through configurable aliases.
- Build a local style-number index in SQLite.

The initial implementation should support common column aliases such as:

- Style number: `款号`, `货号`, `商品货号`, `编码`, `SKU`
- Size: `尺码`, `规格`, `码数`
- Price: `价格`, `售价`, `吊牌价`
- Stock: `库存`, `数量`
- Color: `颜色`, `色号`, `色系`
- Category: `类目`, `大类目`, `商品类目`

If multiple Excel rows match the same style number, the tool should keep all candidates and show a conflict for operator review rather than silently choosing one.

## Style Number Matching

Image filenames are the primary matching key.

Default filename rules:

- Remove extension.
- Treat suffixes like `-1`, `_1`, `主图`, `详情`, and `白底` as image sequence labels when possible.
- Match the remaining base token to the style-number index.

The tool should expose editable matching rules later, but the first version can implement a conservative default and show unmatched images clearly.

## Existing Web Tool Compatibility

The current web tool should not be modified for desktop-only behavior.

Safe reuse from the current project:

- Attribute library format.
- LLM prompt templates.
- OpenRouter model and task concepts.
- Single-image recognition flow.
- Result display and editing concepts.
- CSV/XLSX import/export experience.

Behavior to keep isolated in the new repository:

- Local folder scanning.
- SQLite persistence.
- Windows installer or portable build.
- Batch image-folder import.
- Douyin publishing automation.

## First Implementation Phase

Phase 1 should produce a desktop workflow that stops before automatic Douyin publishing.

Included:

- Windows desktop shell.
- Product-data folder settings.
- Excel folder scan and local style-number index.
- Batch image folder import.
- Style-number extraction and match results.
- AI generation using the existing recognition flow.
- Merged final table.
- Missing/conflict/error review.
- Export to `.xlsx` and/or `.csv`.
- Local batch save and reopen.

Excluded:

- Automatic Douyin login.
- Automatic product publishing.
- Multi-shop collaboration.
- Cloud sync.
- Shared user accounts.

## Future Publishing Phase

After Phase 1 is stable, publishing can be added through one of two paths:

1. Douyin/Doudian Open Platform API:
   - More stable for batch creation.
   - Requires application credentials, authorization, category/attribute mappings, image upload flow, and API permission checks.

2. Browser automation:
   - Easier to trial if API access is not ready.
   - More sensitive to page changes, login state, captcha, and platform risk controls.

The final listing table should be designed so either publishing path can consume it.

## Error Handling

The desktop tool should make errors reviewable instead of blocking the whole batch.

Examples:

- No matching style number found.
- Multiple matching product rows found.
- Required Excel columns missing.
- AI recognition failed.
- Required Douyin listing field missing.
- Export failed because the target file is open.
- Publishing failed for a specific row.

Each batch row should have a status and a human-readable reason.

## Testing Strategy

Use focused tests around the parts most likely to break:

- Filename-to-style-number extraction.
- Excel column alias normalization.
- Duplicate style-number conflict handling.
- Incremental folder scan behavior.
- Merged table field precedence.
- Exported workbook headers and row values.

Manual verification should include a small Windows-like sample:

- Several Excel files in nested folders.
- At least one duplicate style number.
- At least one unmatched image.
- Multiple images for the same style number.
- One successful end-to-end merged export.

## Open Questions

Before implementation, confirm:

- Whether Excel column names are mostly consistent or highly varied.
- Typical image filename patterns.
- Whether one style number can have multiple colors or sizes across rows.
- Which fields must appear in the final master table.
- Whether Phase 1 export should be CSV, XLSX, or both.


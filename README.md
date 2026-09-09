# TPT MCP

A local Model Context Protocol server for preparing and uploading Teachers Pay Teachers listings through an authenticated Chrome browser. Unofficial; not affiliated with or endorsed by TPT.

Built with the official MCP SDK and Playwright. It uses TPT's seller web interface, not an undocumented upload API. A real private draft was uploaded, saved and reopened to verify its files, metadata and rich-text description during development. Public publication and every possible product type have not been independently validated.

## Features

- Validate local product packages and complete listing metadata.
- Upload ZIPs, PDF previews, optional videos and four custom images.
- Enter real paragraphs, bold headings and bullet lists.
- Fill pricing, tax code, grades, subjects, tags, formats and teaching details.
- Use **Upload thumbnails now** for custom uploads and **Auto generate thumbnails from the product file** otherwise. Never submit with **Upload thumbnails later** selected.
- Save private drafts or submit active listings with explicit authorization.
- Record attempts before submission to prevent blind duplicate retries.
- Reopen saved listings and verify metadata and asset references.

## Install

Requires Node.js 22+ and an installed Google Chrome browser.

```sh
git clone https://github.com/grahamwaters/tpt-mcp.git
cd tpt-mcp
npm ci
```

For Codex, register using absolute paths:

```sh
codex mcp add educode-tpt --env TPT_WORKSPACE=/absolute/path/to/product-workspace -- node /absolute/path/to/tpt-mcp/server.mjs
```

For another MCP client, configure a stdio server with `node`, the absolute `server.mjs` path, and `TPT_WORKSPACE` in its environment. Reload the client to discover tools. No HTTP server or API key is required.

## Product workspace

Provide your own assets. This repository includes only schema examples and synthetic test fixtures, not commercial products or seller data.

```text
product-workspace/
  release/upload-ready/
    UPLOAD-MANIFEST.json
    example-product/
      product.json
      listing.json
      example-product.zip
      preview.pdf
      cover.png
      thumb-1.png
      thumb-2.png
      thumb-3.png
```

Start with [the manifest example](examples/UPLOAD-MANIFEST.json) and [the listing example](examples/listing.json). A minimal `product.json` contains the matching `id` and `title`. File paths resolve within `TPT_WORKSPACE`; path traversal and symlink escapes are rejected. The complete listing schema is in [listing.mjs](listing.mjs).

Replace all sample claims and choices with accurate values. Set `review.releaseReady` only after reviewing the actual product and its rights. The example remains blocked from active publication until replaced. Tax code selection must reflect the actual product; the sample is not tax advice.

## Use

1. Call `tpt_open_login` and sign in directly in the dedicated Chrome window. Login persists locally in `.local/browser`. Never share that directory.
2. Call `tpt_list_products` and `tpt_get_product` to review a package.
3. Call `tpt_prepare_product` with its local `id`. It validates `listing.json`, fills the form and selects the assets.
4. Call `tpt_inspect`. Wait for processed-upload receipts and review the actual listing. Use `tpt_category_options` and `tpt_choose_category` to inspect or change current choices.
5. Call `tpt_submit_product` with `id`, `authorized: true` and `active: false` for a private draft. Use `active: true` only with authorization to publish. A caller-supplied flag is not an independent authentication or approval system.
6. Read the saved seller listing's numeric product ID, then call `tpt_verify_saved_product` with `id` and `remoteId`.

`tpt_format_saved_description` repairs formatting in an existing matching listing; submit separately to save. `tpt_product_status` reads the journal. `tpt_close_browser` cancels the browser session while retaining login. After an uncertain submission, inspect the seller account before retrying; the tool deliberately refuses a fresh upload of an already-attempted product.

Only one process can own the dedicated browser profile at a time. Close `npm run login` before opening the browser from MCP. TPT may default to “Upload thumbnails later” when reopening an edit page; the journal records the mode selected at submission.

For terminal use, run `node operator.mjs` and enter JSON tool calls, one per line:

```json
{"name":"tpt_list_products","arguments":{}}
```

## Tests

```sh
npm test
```

Tests use temporary synthetic catalogs and a local intercepted browser fixture. They require Chrome, but no TPT login and no real uploads. They cover MCP communication, path confinement, listing validation, file selection, formatting structure, cancellation and thumbnail-mode behavior.

## Limitations

- This is a browser adapter: TPT UI changes can require selector updates. The seller form was observed in September 2026.
- Automatic standards-tag and store custom-category selection is not implemented. Keep unsupported arrays empty or complete those fields manually; nonempty values currently stop automatic preparation.
- The current preparation flow expects a paid digital ZIP, PDF preview and four custom thumbnail files. Free resources and other product workflows need additional adaptation.
- Verification confirms saved fields and asset references; it does not compare downloaded asset hashes or prove pedagogical quality.
- Publishing an active listing can trigger TPT's normal follower notifications.

Keep browser sessions, credentials and commercial assets private. Review third-party terms and the product's rights before use.

References: [MCP SDK](https://ts.sdk.modelcontextprotocol.io/server), [Playwright file uploads](https://playwright.dev/docs/input#upload-files).

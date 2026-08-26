# ScreenerKit — Compact & Customize the TradingView Screener

**See more columns. Fit more data. No zooming required.**

ScreenerKit is a free, open-source Chromium extension that gives you full control over how TradingView's Stock Screener looks — without touching your chart, without zooming your browser, and without changing any TradingView settings.

If you've ever wished the Screener showed more columns on screen, or that the rows were tighter so you could scan more tickers at a glance — that's exactly what this does.

> **Not affiliated with TradingView.** ScreenerKit applies visual customizations only. It never reads your credentials, intercepts network requests, modifies trading actions, or communicates with external services.

---

## Why ScreenerKit?

TradingView's Screener is powerful, but it wastes a lot of screen space. The Symbol column is wider than it needs to be, rows are tall, and there's no way to adjust density without zooming your entire browser — which also shrinks your chart, toolbar, and everything else.

ScreenerKit fixes that. You get independent control over the Screener layout while the rest of TradingView stays exactly as it is.

**What you can do:**

- **Narrow the Symbol column** (76–220 px) to reclaim horizontal space for data columns
- **Change table density** — switch between Comfortable, Compact, and Dense presets, or fine-tune body font, header font, row height, header height, padding, and sidebar inset individually
- **Add grid lines** — vertical column separators and custom-colored row separators for easier scanning
- **Pin a secondary sort** — group Screener rows by a second column while keeping TradingView's primary sort intact
- **Apply interface themes** — choose true-black OLED or build a fully custom color scheme with seven configurable tokens and live contrast-ratio feedback

All settings persist across sessions and apply instantly.

---

## Install

Works in **Brave**, **Chrome**, **Edge**, **Arc**, and most Chromium browsers.

1. Download or clone this repository.
2. Open your browser's Extensions page (`brave://extensions`, `chrome://extensions`, etc.).
3. Enable **Developer mode**.
4. Click **Load unpacked** and select this project folder.
5. Navigate to TradingView, open the Stock Screener, and click the ScreenerKit icon.

No build step. No dependencies. No account required.

---

## Features

### Compact Symbol Column

The Symbol column defaults to a wide layout that pushes your data columns off screen. ScreenerKit lets you shrink it down to as narrow as 76 px — freeing up room for the columns that actually matter.

The header adapts automatically at different widths so the search control, label, count, and sort button never overlap.

### Table Density

Three built-in presets:

| Preset | Body font | Row height | Padding |
| --- | ---: | ---: | ---: |
| Comfortable | 14 px | 41 px | 12 px |
| Compact | 13 px | 34 px | 8 px |
| Dense | 12 px | 28 px | 4 px |

Or go fully custom — every parameter has its own slider under Advanced.

### Grid Lines

Adds 1 px vertical separators between columns and lets you recolor TradingView's existing row separators. Makes it much easier to scan across wide tables.

### Secondary Sort

TradingView's API only accepts one sort key. ScreenerKit works around this by locally re-ordering the rendered rows by a pinned second column, preserving the primary sort within each group.

- Left-click any column header → **Pin "…" (secondary sort)**
- Click again to flip direction, a third time to unpin
- A colored arrow on the header shows the active pin
- Re-sorts automatically as TradingView loads more rows

### Interface Themes

- **Default** — no changes, TradingView's native dark theme
- **OLED Black** — true-black surfaces for OLED displays, with subtle gray separators and preserved accent colors
- **Custom** — set Page, Surface, Elevated, Border, Text, Muted text, and Accent independently, with a live WCAG contrast-ratio readout

Themes cover TradingView's UI chrome (toolbars, panels, menus, dialogs, controls) without touching chart canvases, indicators, or financial colors.

---

## How It Works

ScreenerKit detects the Screener table through stable, semantic DOM contracts — never hashed class names. It activates only when all of these are present:

- `th[data-field="TickerUniversal"]` at column index 0
- A containing `<table>`
- A `tbody[data-testid="selectable-rows-table-body"]`
- A `tr[data-rowkey]` whose first child is a table cell

If the structure isn't found, every feature fails closed and reports a degraded state. Nothing falls back to guessing.

---

## Development

```sh
npm run check   # syntax check all source files
npm test        # run the test suite
```

For browser-level smoke testing without installing the extension, serve the repo and open `tests/fixture.html`.

After changing source files, hit **Reload** on the extension card in your browser's Extensions page, then reload TradingView.

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Screener table not detected | Open the Stock Screener and press **Refresh detection** in ScreenerKit |
| Unable to initialize | Confirm the active tab is an `https://` TradingView page. Reload the extension, then reopen the popup |
| Column still too wide | Verify the popup reports `active`, then try a smaller width |
| Density won't change | Check that **Table density** reports `active` and the toggle is enabled |
| Grid lines won't appear | Verify the toggle is enabled and the color contrasts with your current theme |
| Sort pin menu missing | Enable **Secondary sort** in ScreenerKit, then reload TradingView |
| Rows don't re-sort | Confirm a column is pinned (colored arrow on header). Scroll to load more rows |
| Theme won't apply | Enable the master toggle and select a non-Default theme |

---

## Scope & Privacy

ScreenerKit is strictly local. It injects CSS and reorders rendered DOM elements in your browser tab. It does not:

- Access your TradingView account, cookies, or stored data
- Intercept or modify network requests
- Send data to any external server
- Alter alerts, orders, or any TradingView application state

Settings are stored in `chrome.storage.local` on your machine.

---

## License

MIT

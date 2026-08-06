# Live DOM investigation — 2026-07-22

## Environment inspected

- TradingView chart at `https://www.tradingview.com/chart/`
- Stock Screener opened in the chart's right-side panel
- Desktop viewport: 2048 × 1118
- Main document; no iframe or shadow root at the identified table

## Findings

The current Stock Screener uses an HTML table with `table-layout: auto` and no `<col>` elements.

- Symbol header: `th[data-field="TickerUniversal"]`, `cellIndex === 0`
- Row container: `tbody[data-testid="selectable-rows-table-body"]`
- Data rows: `tr[data-rowkey]`
- Symbol body cell: the first `td` in each data row
- Observed Symbol cell width: approximately 147 px
- Header wrapper horizontal padding: 20 px left and 16 px right
- Body cell horizontal padding: 20 px left and 12 px right
- Nested ticker link minimum width: 56 px; maximum width: 120 px
- Symbol header and body cells are sticky-positioned

This establishes an auto-table sizing problem compounded by nested minimum widths and substantial padding. It is not a CSS Grid track, a `<col>` width, or an iframe boundary in the inspected layout.

## Implementation decision

A CSS-first Manifest V3 extension was selected because the project also requires persistent adjustable width, toggles, reset, diagnostics, SPA lifecycle handling, and future independent features. JavaScript performs only conservative DOM detection, lifecycle coordination, and settings application. CSS performs the layout change.

## Density measurements

The same verified table contract was measured before adding version 0.2 density controls:

- Body rows: 41 px high
- Header: 50 px high
- Body and header text: 14 px
- Ordinary body cells: 12 px horizontal padding per side
- Symbol body cell: 20 px left and 12 px right padding
- Table cells and table ancestors: zero margin
- Table cells: zero vertical padding
- Visible ticker contents: approximately 24 px high

These measurements are why version 0.2 controls row/header height and horizontal padding rather than exposing ineffective table-margin or vertical-padding sliders. The Dense preset retains a 28 px minimum row so the observed ticker content has room to render.

## Responsive Symbol header

Version 0.2.1 inspected the complete Symbol-header layout after narrow widths caused it to overlap the next header. Its natural minimum was approximately 147 px, composed of:

- 36 px outer horizontal padding
- 34 px search button containing a 28 px icon
- 12 px flex gap
- approximately 45 px for the Symbol label
- 18 px sort button
- a second-row match count

The Symbol feature now assigns regular, compact, narrow, or tiny header modes from the configured column width. It reduces the search control and gaps first while preserving TradingView's two-row label and match-count layout. At the 76–89 px minimum, the sort control yields the limited space instead of hiding the count. All header wrappers are constrained to the verified column width, and long labels ellipsize rather than covering the next column.

## Selected-row highlight

TradingView renders the selected-row outline through an absolutely positioned `tr::after` pseudo-element. Its native height is fixed at 40 px to fit the standard 41 px row, so it exceeded Compact and Dense rows after customization. Version 0.2.2 scopes that pseudo-element through the verified `tr[data-rowkey]` contract and sets its height to the configured row height minus the one-pixel divider. Its corner radius also scales down with the row while remaining capped at TradingView's native 10 px.

## Sidebar table inset

Live inspection found that the blank space before the Screener table does not come from a table cell or table margin. TradingView applies `padding-left: 20px` to the stable content wrapper `[data-qa-id="screener-widget"] > [data-query-type="container"]`. The table and its intervening ancestors have zero left padding.

Version 0.3 added a 0–24 px left-inset setting to the density feature. Comfortable preserves TradingView's 20 px inset, Compact uses 8 px, and Dense uses 0 px. The wrapper keeps border-box sizing, so changing the inset does not enlarge the sidebar. Disabling density removes the marker and variable and restores TradingView's native padding.

Version 0.5.7 addresses colored flags without reserving panel or cell space. TradingView keeps a marker element in every Symbol cell, controls active state with native visibility, and positions its 12–15 px SVG 20 px to the left of the cell content. The compact features structurally select that native marker without generated classes, position it at the sticky Symbol cell edge outside layout flow, and narrow the SVG to 6 px. Native visibility and `currentColor` continue to own flag state and color.

## Selector policy

TradingView's generated class suffixes were observed but are intentionally not encoded. Activation requires the semantic header field, semantic body test ID, row key, and valid first-cell indexes. Partial matches fail closed.

## Screener grid lines

Version 0.4 uses the verified table contract to add internal separators without introducing new DOM nodes. A feature-specific table marker owns one color variable. Header and body cells except the final cell receive a 1 px right border, so the lines remain aligned through the header and rows while the table keeps its native outer edge.

The existing horizontal row rule is owned by body-cell `border-bottom`. The feature changes only `border-bottom-color`, preserving TradingView's width and style, and does not recolor the header's native horizontal separator. Applying borders to cells also preserves the selected-row `tr::after` overlay and allows the sticky Symbol cell to carry the first separator during horizontal scrolling.

The feature is disabled by default for migration safety. Its fixed six-digit hexadecimal color is intentionally theme-independent and resets to `#2a2e39`.

## Validation still required in the user's Brave profile

The implementation must be exercised against the exact compact sidebar/Screener variant from the original screenshot. Specifically verify:

- the header and every rendered row remain aligned;
- horizontal scrolling and the sticky column remain functional;
- long tickers and status badges truncate acceptably at the chosen width;
- sorting, row selection, and column resizing remain usable;
- the setting survives resize, scroll, Screener close/reopen, tab changes, and reload;
- diagnostics return to `active` after DOM replacement.

## Interface theme variables

Live inspection for version 0.5 found stable `data-theme="light"` and `data-theme="dark"` attributes on the document root. TradingView defines semantic custom properties for its platform chrome, including header, page, pane, popup, toolbar, border, text, icon, and active-accent roles. The theme feature overrides those semantic roles from a higher-specificity extension-owned root marker instead of selecting generated component classes.

The seven stored tokens map only to interface roles. Financial/status roles and chart-series colors are deliberately absent, and the chart canvas remains governed by TradingView's own chart settings. Native selection and master disable remove both the marker and the owned style element.

Symbol Search rows were inspected in version 0.5.3 through the stable `[data-name="symbol-search-dialog-content-item"]` contract. Their cells use `--color-container-fill-tertiary-inverse` for the resting fill and `--color-container-fill-primary-neutral-light` for both the bottom separator and hover fill. Active and selected outlines use the corresponding neutral-extra-bold and accent semantic variables. The theme maps those roles instead of encoding the observed generated cell classes.

The Layouts dropdown was inspected in version 0.5.4 through the stable popup-menu and save-layout QA markers. Its list items use TradingView's semantic list-item inputs: resting, hover, active, selected, selected-text, and divider colors. The theme scopes those inputs to the Layouts menu, keeping resting OLED cards black, separators and pressed states gray, and the selected layout light without relying on generated classes.

The Screener Symbol header was re-inspected in version 0.5.5. TradingView exposes the filter-result count through `span[data-matches]`, places the label and count in two grid rows, and identifies the adjacent sort control with `data-qa-id="sort-button-direction"`. The width feature preserves that structure at every supported width, ellipsizes long labels inside the cell, and hides only the sort control at the smallest width when space is constrained.

If that sidebar uses a different semantic table contract, capture the header/body ancestry and extend detection with another evidence-backed adapter rather than weakening the existing checks.

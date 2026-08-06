# TradingView Local Customizer

A personal Chromium extension for local, visual-only TradingView customizations. Version 0.5.7 provides Default, true-black OLED, and Custom interface themes alongside the adjustable Symbol-column width, independent Screener table density controls, and customizable Screener grid lines.

The extension does not read credentials, intercept requests, alter trading actions, load remote code, or communicate with external services. Settings are stored in `chrome.storage.local`.

## Install in Brave

1. Open `brave://extensions`.
2. Turn on **Developer mode**.
3. Choose **Load unpacked**.
4. Select this project directory.
5. Open the extension popup while viewing TradingView. It will initialize itself in an already-open tab if necessary.

Chrome and most Chromium browsers use the equivalent Extensions page and **Load unpacked** action.

## Use

1. Open a TradingView chart and the extension popup.
2. Choose Default, OLED Black, or Custom under **Interface theme**.
3. For Custom, adjust the seven color tokens. A warning appears when text or muted text falls below the recommended 4.5:1 contrast ratio.
4. Display the Stock Screener, enable **Compact Symbol column**, and adjust the width slider.
5. Use **Reset width** to restore the extension default of 100 px.
6. Enable **Screener table density** and choose Comfortable, Compact, or Dense.
7. Expand **Advanced** to tune body font, header font, row height, header height, horizontal padding, or the sidebar's left inset individually.
8. Enable **Screener grid lines** to add vertical column separators and recolor existing row separators with one shared color.
9. Use **Reset color** to restore the grid-line default of `#2a2e39`.
10. Use the master toggle to remove all injected styles immediately.

## Interface themes

The interface theme covers TradingView chrome and transient UI, including Symbol Search and the Layouts dropdown. OLED Black keeps resting layout cards true black, uses subtle gray separators and interaction states, and preserves the light selected-layout treatment.

Themes recolor TradingView's semantic interface surfaces: page gutters, toolbars, side panels, menus, dialogs, tooltips, controls, borders, text, icons, and active accents. They do not override chart canvas backgrounds, candles, plots, indicators, drawings, or financial/status colors such as buy, sell, positive, negative, and warning.

**Default** is selected automatically on new installs and upgrades, so the extension does not change existing appearance until a theme is chosen. OLED Black sets the page, standard, elevated, dialog, popup, and neutral control surfaces to true black while retaining `#2a2a2e` section separators, borders, text, accent, and hover states. Custom values remain stored while switching themes; **Reset custom** restores the original custom-editor values. Selecting Default, disabling the master toggle, or unloading the extension removes the owned root marker and style element.

Symbol Search result rows follow the same OLED treatment: black row surfaces, `#2a2a2e` row separators and hover fill, a light keyboard-active outline, and the configured accent for selected rows.

The supported range is 76–220 px. Very narrow values may truncate long tickers or secondary status badges; this is intentional and reversible. The Symbol header adapts automatically so its search control, label, result count, and sort button do not overlap the next column:

- 140 px and above: full-size header controls.
- 110–139 px: smaller search control and tighter spacing.
- 90–109 px: compact search control; the label and result count remain stacked and clipped to the cell.
- 76–89 px: the label and result count remain visible; the sort control yields the limited space.

Density presets:

| Preset | Body font | Header font | Row | Header | Horizontal padding | Left inset |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Comfortable | 14 px | 14 px | 41 px | 50 px | 12 px | 20 px |
| Compact | 13 px | 13 px | 34 px | 42 px | 8 px | 8 px |
| Dense | 12 px | 12 px | 28 px | 36 px | 4 px | 0 px |

Moving any Advanced slider creates a Custom preset. **Reset density** restores Compact. The left-inset control supports 0–24 px; 0 px makes the table flush with the Screener content edge. Native colored flags are positioned at the Symbol cell edge, outside layout flow, and narrowed to remain visible without adding table padding. Density is disabled by default when upgrading from version 0.1, so existing Symbol-width behavior does not change until the feature is enabled.

Grid lines are disabled by default on new installs and upgrades. When enabled, 1 px separators run between columns through the header and body, but not around the table's outside edge. The selected color also replaces the color of TradingView's existing horizontal row separators without changing their native thickness or style. The header's native horizontal separator is left unchanged.

## Detection and diagnostics

All table features share one conservative detector and activate only when it finds all of these live DOM contracts:

- `th[data-field="TickerUniversal"]` at column index 0;
- a containing HTML `table`;
- a direct `tbody[data-testid="selectable-rows-table-body"]`;
- a direct `tr[data-rowkey]` whose first child is a table cell.

If only part of that structure is present, the extension fails closed and reports a degraded state for each enabled feature. It never falls back to a hashed TradingView class name or a text-only `Symbol` match.

## Development

No install or build step is required.

```sh
npm run check
npm test
```

For a browser-level smoke test without installing the extension, serve the repository and open `tests/fixture.html`. The fixture runs the real feature module against a minimal TradingView-like table contract.

After changing source files, use **Reload** on the extension card in `brave://extensions`, then reload TradingView.

## Troubleshooting

- **Screener table not detected yet:** open the Stock Screener and press **Refresh detection**.
- **Unable to initialize the tab:** confirm the active tab is an `https://` TradingView page. Reload the extension card after updating source files, then reopen the popup.
- **Degraded:** TradingView's DOM contract changed or the table has not completed rendering. Disable the feature and capture the sanitized diagnostics before updating selectors.
- **Column still too wide:** verify the popup reports `active`; then test a smaller width. Do not add hashed class selectors as a quick fix.
- **Density does not change:** verify **Table density** reports `active`, then confirm the feature toggle is enabled. Advanced values are applied when the slider is released.
- **Grid lines do not change:** verify **Grid lines** reports `active`, then confirm the feature toggle is enabled and choose a color that contrasts with the current TradingView theme.
- **Theme does not change:** verify **Interface theme** reports `active`, confirm the master toggle is enabled, and choose a non-default theme.

## Scope

Only local presentation is in scope. Account data, cookies, browser storage owned by TradingView, network requests, alerts, orders, and TradingView application state are out of scope.

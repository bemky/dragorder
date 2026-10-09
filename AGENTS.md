# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, etc.) when working with code in this repository.

## Project

`dragorder` is a zero-dependency, single-file ES module published to npm. The entire library lives in `dragorder.js` (the `main` of `package.json`); `demo.html` is the development harness, loaded directly in a browser — there is no build step, bundler, test suite, or linter.

To preview changes, open `demo.html` in a browser. To release, run `npm publish`.

## Architecture

The library exports one default class, `DragOrder`. Because the HTML5 Drag and Drop API can't be customized enough (placeholders, drag image, cross-container hand-off), this implementation reimplements drag using **pointer events** and `setPointerCapture`. Three DOM nodes are juggled simultaneously during a drag:

- **`selectedItem`** — the original element the user grabbed. Removed from its position via `replaceWith(placeholderItem)`. A zero-width text node `selectedItem.origin` is left in its original spot so a cancel (Escape) can restore it exactly where it came from.
- **`placeholderItem`** — what sits in the list at the current drop position. Built from `options.placeholder` (function/Element/HTML string). Moved between siblings by `insertAdjacentElement('beforebegin' | 'afterend')` based on whether the pointer is moving up/left or down/right relative to `lastPosition`.
- **`dragItem`** — the floating element under the cursor (`position: fixed`). Built from `options.dragholder`. Positioned each `pointermove` via `left/top` (the cursor coords) plus a fixed `marginTop/marginLeft` offset captured at `dragStart` so the grab point on the element stays under the cursor even while the page scrolls.

### Event flow

`pointerdown` on `this.el` → `mouseDown` checks `handleSelector`, captures the pointer, calls `dragStart`. `dragStart` builds the three nodes and calls `dragEnter`, which attaches **window-level** `pointermove` / `pointerup` / `keyup` listeners. `mouseMove` is debounced via a `this.moving` flag (re-entrancy guard, not throttling). `pointerup` → `drop` swaps `placeholderItem` back to `selectedItem` and fires `options.drop(items, item)`. Escape → `dragCancel` restores from the `origin` text node instead.

### Drop-target resolution

`getItem(x, y)` uses `elementsFromPoint(...).reverse()` (innermost-first becomes outermost-last after reverse) and matches against `itemSelector` (or "direct child of `this.el`" if no selector). When the pointer isn't over an item, `getContainer` finds a `parentSelector` match — this is how dragging into an empty list or empty space inside the container still works.

### Cross-instance drops (`foreignDropSelector`)

Each `DragOrder` instance writes itself onto its root element as `el.dragorder = this`. When a drag enters a foreign element matching `foreignDropSelector`, `mouseMove` calls `foreignDragOrder.dragorder.dragEnter(selectedItem, dragItem, placeholderItem)` to hand the three live nodes off to the other instance, then calls `dragLeave()` on the source to detach its window listeners. The destination instance now owns the drag until `pointerup`. This is why `dragEnter` accepts those three params: it's both the local entry point and the foreign hand-off entry point.

### Subtle behaviors worth preserving

- `getBoundingClientRect()` at the bottom of the file recursively unwraps `display: contents` elements (which have no box of their own) by unioning their children's rects. Used to position the drag image correctly for those elements.
- The `TR` branch in the default `dragholder` copies each child cell's width onto the cloned row — without it, detached `<tr>` elements collapse because they're no longer in a table's column-width context.
- `this.el.setPointerCapture(e.pointerId)` is called **after** `options.dragStart` runs, in case the user's callback mutates the DOM and detaches the original target.

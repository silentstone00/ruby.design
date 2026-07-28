# Ruby Design Task List

## Implemented

- [x] React + Vite + TypeScript application shell.
- [x] Voice-command panel with typed-command fallback and command history.
- [x] Browser Web Speech API prototype with clear microphone/network error states.
- [x] Research handoff and current architectural direction in `context.md` and `direction.md`.
- [x] Typed scene graph for frames, rectangles, ellipses, and text.
- [x] Custom SVG canvas is now the active editor path; tldraw is no longer used by the running app.
- [x] iPhone 16 Pro starter frame with device-like corner radius and Dynamic Island detail.
- [x] Rectangle nodes with stored per-corner radius values.
- [x] Inspector with all-corners and individual-corner radius inputs.
- [x] Selection, hover state, and pointer dragging for canvas nodes.
- [x] Basic typed commands: create a shape, move, resize, change color, set text, and set corner radius.
- [x] Reference resolution for commands such as "this", "that", and "selected".
- [x] Local document save/load for the new scene format.
- [x] Basic undo/redo for typed commands and inspector radius edits.
- [x] Transaction-based operation log engine with atomic forward/inverse diffs (`app/document/history.ts`).
- [x] Type-check, production build, and browser verification of the custom canvas path.

## Next: Core Editor

- [x] Make drag interactions one undoable transaction instead of many direct state updates.
- [x] Add resize handles with aspect-ratio locking.
- [x] Add multi-selection, marquee selection, and keyboard modifiers.
- [x] Add pan, zoom, fit-to-selection, and a stable canvas coordinate system.
- [x] Add direct in-place text editing inside SVG canvas nodes.
- [x] Add fill, stroke, opacity, typography, and alignment controls in the inspector.
- [x] Render true ellipse nodes and add line/arrow nodes to the custom renderer.
- [x] Implement grouping, layer ordering, duplication, deletion, and rename.
- [x] Improve selection outlines and add resize/rotation affordances.
- [x] Add keyboard shortcuts for select, delete, duplicate, undo, redo, zoom, and pan.
- [x] Keep in-place text editing aligned with the SVG viewport at different canvas sizes and zoom levels.
- [x] Keep the canvas contained in its grid column while the properties panel scrolls independently.
- [x] Keep sidebar actions reachable by wrapping the toolbar without horizontal scrolling.
- [x] Keep drag, resize, and rotation pointer math stable for nodes nested inside frames.
- [x] Add a contextual left-side Layers panel that shows only the active frame's hierarchy.

## Next: Mobile UI Design

- [x] Add separate custom-frame and iPhone device-frame insertion choices (iPhone 16 and iPhone 16 Pro).
- [ ] Expand the dedicated iPhone frame preset/catalog foundation; defer iPad, Android, and custom devices.
- [x] Support frame child nodes and clipping so screens contain their UI.
- [x] Render nested frames inside their parent clipping coordinate system.
- [x] Render frame names outside the frame boundary as editor labels.
- [x] Reparent dropped nodes into the frame under their center, preserving visual position.
- [x] Add an insert toolbar for frames, text, and rectangles.
- [x] Enable image insertion with asset import, cropping, and image fills.
- [ ] Enable component insertion once the licensed iOS component-library model exists.
- [ ] Build a small native iOS component library: navigation bar, tab bar, button, input, list row, card, sheet, and status bar.
- [ ] Add reusable components, instances, and component-property overrides.
- [x] Add responsive constraints and basic Auto Layout-like stacks.

## Voice and Intelligence

- [x] Replace the browser Web Speech API prototype with a production STT path, starting with Deepgram streaming through a backend (`deepgramAdapter.ts` & `deepgram-token` Edge Function).
- [x] Add a backend that keeps STT and LLM credentials off the client (`supabase/functions/parse-command`).
- [x] Define a strict LLM tool schema that produces validated scene operations (`zod` discriminated union validation).
- [x] Expand reference resolution for spatial phrases such as "the button below the title" (`referenceResolver.ts` spatial geometry solver).
- [ ] Add confirmation/previews for large AI changes and animate accepted changes.
- [x] Build command fixtures and evaluation tests for parsing, reference resolution, and operation results (`vitest` runner in `app/evals/evals.test.ts`).

## Document and Platform

- [x] Replace snapshot-style undo with an operation log containing inverse operations and transactions.
- [x] Fix undo-after-delete dropping restored nodes to the front of the paint order instead of their original stacking position.
- [ ] Replace local data-URL image storage with a durable asset store before large or shared documents.
- [ ] Add document migrations, import/export, and recovery for malformed documents.
- [ ] Add durable backend persistence and document/project management.
- [ ] Add SVG, PNG, and PDF export.
- [ ] Add performance instrumentation, viewport culling, and large-document benchmarks.
- [ ] Evaluate collaboration/CRDT architecture only after the single-user operation model is reliable.

## Later Product Work

- [ ] Prototype preview mode and animated before/after diffs for voice or AI edits.
- [ ] Add share links, comments, and review flows.
- [ ] Add design tokens, styles, variables, and asset management.
- [ ] Add plugin/API surface only after core scene and operation contracts stabilize.

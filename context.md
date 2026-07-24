# Ruby Design Context

## Product

Ruby Design is a voice-first UI design tool. The first product wedge is mobile/iOS screen design, but the long-term intent is a Figma-like editor with a custom document model, reusable components, and AI/voice operations.

Repository: `git@github.com:silentstone00/ruby.design.git`

Branch: `main`
Latest custom-editor milestone: `8282cf7` (`Build custom design canvas interactions`)

## Current Architecture

The active editor no longer uses tldraw. It is a React + Vite + TypeScript application with:

- A custom typed scene graph.
- SVG rendering with in-place `contentEditable` text inside SVG `foreignObject` nodes for direct editing.
- A world-space SVG viewport (`x`, `y`, `zoom`) shared by input, selection, marquee, resizing, rotation, and text editing.
- Frames, rectangles, ellipses, text, lines, and arrows.
- Nested frame children stored as local coordinates through `parentId`, with clipping performed in each parent frame's local nested SVG viewport.
- Selection, multi-selection, marquee selection, drag, resize, aspect-ratio lock, rotation, grouping, layer ordering, duplicate, delete, and rename.
- Browser speech recognition only as a prototype; typed commands remain the reliable input path.

The `tldraw` dependency and spike files are still in the repo for reference, but they are not imported by the active application path.

## What Works Now

- iPhone 16 Pro starter frame, heading, and button. The heading and button are real children of the frame, not independent canvas objects.
- Dragging a node onto a frame reparents it to that frame using local coordinates; dragging it outside all frames detaches it to the canvas without a visual jump.
- Frame insertion has two modes: Custom Frame creates a plain clipped artboard without device chrome; iPhone Frame offers iPhone 16 and iPhone 16 Pro presets, which render device chrome including the Dynamic Island. New frames are top-level screens, not children of the selected screen.
- Frame names render above their frame boundary as editor labels; they are not part of the screen content.
- Insert menu: Frame, Text, Rectangle, and Image create nodes. A selected frame, or a selected child inside a frame, becomes the insertion parent. Component remains disabled until its underlying system exists.
- Image insertion: the Insert menu can import a local image as a native image node. Images retain source dimensions, are clipped by parent frames, support rounded corners, and have normalized crop controls in the inspector. Imported image data is currently stored in the local document as a data URL.
- SVG canvas with zoom, fit-to-selection, wheel zoom, space/middle-mouse pan, plus keyboard viewport controls.
- The SVG viewport tracks the rendered canvas aspect ratio, keeping pointer math and in-place text editing aligned at different zoom levels and panel widths.
- All gesture coordinates resolve through the root canvas SVG, preventing nested text, shapes, images, and frames from jumping when dragged.
- The canvas is contained by the editor grid; the side panel scrolls independently instead of allowing canvas paint to extend underneath it.
- Rectangles with individual corner radii.
- Direct in-place text editing: double-click text or button labels, type directly in the component, `Enter` saves, and `Escape` cancels. The editor has no blank textarea overlay.
- The sidebar toolbar wraps actions into rows and blocks horizontal overflow, keeping its controls reachable at narrow desktop widths.
- A contextual Layers panel appears at the left of the canvas only when a frame or one of its descendants is selected. It lists that frame's nested hierarchy, keeps a dynamic height with a capped scroll area, and stays synchronized with canvas selection.
- Inspector: name, x/y/w/h display, fill, stroke, opacity, corner radius, text color, font size, and text alignment.
- Typed commands: create shapes, move, resize, change color, set text, and set corner radius.
- Save/load to browser localStorage.
- Basic undo/redo via scene snapshots.
- Keyboard shortcuts outside form inputs:
  - `Cmd/Ctrl+A`: select all
  - `Cmd/Ctrl+D`: duplicate
  - `Delete`/`Backspace`: delete
  - `Cmd/Ctrl+Z`: undo
  - `Cmd/Ctrl+Shift+Z`: redo
  - `+`/`-`: zoom
  - Arrow keys: pan; `Shift` makes larger pan steps
  - `0`: fit selection
  - `Escape`: clear selection

## Important Limitations

- Groups are currently flat `groupId` membership; frame nesting is supported, but nested group nodes are not.
- Frame clipping is implemented for SVG-rendered content. The full component model, constraints, scrolling behavior, and Auto Layout semantics are still absent.
- Undo/redo currently stores scene snapshots. Replace it with typed operation transactions and inverse operations before large documents or collaboration.
- The browser Web Speech API often emits `network` errors. Do not treat it as production STT.
- tldraw is legacy spike code, not the editor foundation.
- No backend, auth, collaborative editing, exported files, component library, Auto Layout, or constraints yet. Image assets currently use local data URLs rather than a durable asset store.

## File Map

### Root files

- `package.json`: dependencies and Vite commands (`dev`, `build`, `typecheck`, `preview`).
- `index.html`: Vite HTML entry document.
- `vite.config.ts`: Vite configuration.
- `tsconfig.json`: TypeScript compiler configuration.
- `TASKS.md`: living implementation checklist; use this to choose the next scoped build task.
- `direction.md`: product and technical direction based on the research review.
- `context.md`: this handoff file.

### Application entry and styling

- `app/main.tsx`: React entry point; imports global styling and mounts `App`.
- `app/styles.css`: all application, inspector, SVG selection, resize, rotation, in-place editor, viewport chrome, and responsive toolbar styling.

### Active canvas and editor UI

- `app/canvas/DesignCanvas.tsx`: active SVG editor. Owns viewport state, wheel/keyboard zoom, pan, selection/marquee pointer handling, drag, resize handles, rotation handle, recursive frame-child rendering through local nested SVG clip viewports, and in-place text editing through SVG `foreignObject`.
- `app/canvas/canvasContext.ts`: converts the current scene and selection into a compact context consumed by command parsing and reference resolution.
- `app/ui/App.tsx`: root editor state coordinator. Owns scene state, selection, scene-snapshot undo/redo, persistence actions, frame-aware insertion, duplicate/delete/move actions, drag-drop reparenting, grouping/order actions, and global editing shortcuts.
- `app/ui/Inspector.tsx`: selected-node property inspector; updates scene node properties such as name, paint, opacity, radius, typography, and normalized image crop values.
- `app/ui/LayersPanel.tsx`: contextual canvas overlay that derives and displays the selected frame's descendant tree; selecting a layer selects its canvas node.
- `app/ui/Toolbar.tsx`: top command toolbar. Includes the Insert menu (Frame, Text, Rectangle, Image), wrapping action rows, undo/redo, object actions, layer ordering, save/load, and a print-export placeholder. Component remains disabled until its backend model is implemented.
- `app/ui/TranscriptPanel.tsx`: voice/typed command panel, microphone state, interim transcript, and operation history.

### Document model and persistence

- `app/document/scene.ts`: active scene graph types (`DesignScene`, `DesignNode`, corner radii, image crop state), including `parentId` for local child coordinates and `clipContent` for frames; also holds iPhone preset dimensions and the starter document scene.
- `app/document/schema.ts`: persisted Ruby Design document envelope and schema version.
- `app/document/serialization.ts`: serializes/parses the current custom scene document.
- `app/document/migrations.ts`: validates/migrates persisted document data; legacy tldraw data falls back to a starter custom scene.
- `app/persistence/localStorage.ts`: save/load current custom scene to browser localStorage.

### Operations and command interpretation

- `app/operations/types.ts`: shared command operation types and operation result format.
- `app/operations/applySceneOperations.ts`: active pure operation applier for the custom scene graph. Used for typed/voice commands.
- `app/intelligence/commandParser.ts`: deterministic local parser for simple natural-language commands such as create, move, resize, color, text, and radius.
- `app/referenceResolver/referenceResolver.ts`: resolves deictic targets including `this`, `that`, `it`, `selected`, and `hovered` against canvas context.
- `app/intelligence/toolSchema.ts`: draft LLM tool schema for a future model-backed command parser.
- `app/intelligence/llmClient.ts`: placeholder boundary for a future secure LLM integration; do not put API keys in the browser.
- `app/evals/command-fixtures.jsonl`: command examples and expected operation fixtures; expand this as the parser grows.

### Voice prototype

- `app/voice/sttAdapter.ts`: speech-to-text abstraction and browser Web Speech adapter. It checks microphone permission and turns browser errors into user-facing messages.
- `app/voice/speechRecognition.d.ts`: TypeScript declarations for the non-standard browser SpeechRecognition APIs.
- `app/voice/transcriptStore.ts`: React transcript state for final and interim voice text.
- `app/voice/micCapture.ts`: microphone capture helper used by the voice prototype.

### Legacy tldraw spike: do not use for new editor features

- `app/canvas/TldrawCanvas.tsx`: old tldraw canvas mount and seed document. Not used by `App`.
- `app/canvas/customShapes.ts`: tldraw custom-shape spike support. Not used by the active editor.
- `app/operations/applyOperations.ts`: old operation applier targeting tldraw's `Editor`. Replaced by `applySceneOperations.ts` for active work.

## Suggested Next Work

Follow `TASKS.md`. The highest-value next product work is mobile design support:

1. Expand the dedicated iPhone frame catalog and device chrome. Defer iPad, Android, and custom devices.
2. Define the component-definition and component-instance document model before inserting any iOS library content.
3. Obtain a component source with a license that expressly permits this editor use; do not bundle Apple or Figma resources without license clearance.
4. Build the first small iOS component library: navigation bar, tab bar, and button.
5. Replace data-URL image storage with a durable asset store before large or shared documents.
6. Replace snapshot history with typed operation transactions before broad AI or collaboration work.

## Voice/STT Direction

Keep typed commands available. For production voice input, use a backend-proxied streaming STT provider such as Deepgram; OpenAI Realtime is another viable path when voice interaction and model tool calling need to be closely coupled. Browser Web Speech must remain a temporary demo adapter only.

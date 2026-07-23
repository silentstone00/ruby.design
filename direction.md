# Ruby Design Direction

This file records the current architectural direction after reviewing the research reports and citation audit.

## Product Direction

Ruby Design should become a voice-first design tool for creating and editing app UI, starting with mobile/iOS screens.

The first serious product wedge:

> Voice-first mobile UI design canvas for quickly creating and editing iOS app screens.

Ruby should not try to clone all of Figma on day one. It should first become excellent at:

- Creating frames such as iPhone screens.
- Editing real design properties like radius, fill, shadow, text, position, and size.
- Applying typed AI/voice operations safely.
- Previewing and undoing AI changes.
- Using iOS-style components as structured design nodes.

## New Direction From Now On

### 1. Custom Scene Graph

Use our own document model instead of tldraw's shape model.

The scene graph should include first-class nodes such as:

- `FrameNode`
- `RectNode`
- `TextNode`
- `ImageNode`
- `GroupNode`
- `ComponentInstanceNode`

Important properties must be native to our schema:

- `x`, `y`, `width`, `height`
- `radius` and per-corner radius
- fills
- strokes
- shadows
- opacity
- blur/effects
- constraints
- layout metadata
- parent/child relationships
- layer order

### 2. DOM/SVG/HTML Renderer First

Start with a custom DOM/SVG/HTML renderer, not WebGPU.

Reason:

- Faster to build and debug.
- Native text editing is easier.
- CSS gives us border radius, shadows, backdrop blur, and transitions.
- Real DOM nodes help accessibility and inspection.
- The first Ruby workflow is discrete AI/voice operations, not constant 120fps human dragging across huge files.

Long-term, the scene graph should be renderer-independent so we can add Canvas/WebGL/WebGPU later if measured performance demands it.

### 3. Event-Sourced Operation Log

Use a typed operation log as the source of truth for AI edits, undo/redo, replay, and evals.

Every AI/voice command should become one or more validated operations.

Example:

```ts
type DesignOperation =
  | { type: 'create_node'; node: DesignNode }
  | { type: 'set_prop'; targetId: string; path: string; value: unknown }
  | { type: 'move'; targetId: string; dx: number; dy: number }
  | { type: 'resize'; targetId: string; width?: number; height?: number }
  | { type: 'create_frame'; preset: 'iphone-15' | 'iphone-15-pro' | 'desktop' }
  | { type: 'insert_component'; componentId: string; frameId?: string }
  | { type: 'undo' }
  | { type: 'redo' }
```

Batch each AI command as a transaction. Record inverse operations where possible so undo is reliable.

### 4. Deepgram For STT

Do not rely on the browser Web Speech API.

The browser Web Speech API caused `network` errors and is not reliable enough for this product.

Recommended voice pipeline:

```txt
Microphone audio
  -> Deepgram streaming STT
  -> fast LLM command parser
  -> typed design operations
  -> preview/apply/undo
```

Keep API keys behind a backend endpoint. Do not put provider keys directly in the browser.

### 5. iPhone Frames Early

iPhone/mobile frames are not a later feature. They are central to the first wedge.

Add early presets such as:

- iPhone 15
- iPhone 15 Pro
- iPhone SE
- iPad
- Desktop

Frames should be real scene graph nodes with children, clipping, background, and dimensions.

### 6. Basic iOS Component Library

Add a small component library after the core editor works.

Initial components:

- iOS Status Bar
- Home Indicator
- Navigation Bar
- Tab Bar
- Button
- Search Field
- Text Field
- Switch
- List Row
- Sheet
- Alert

Do not overbuild variants/components before the editor basics are solid.

### 7. Preview And Animated Diffs

AI edits should be observable.

Use preview states and animations:

- Ghost outline before commit.
- Dashed/transparent preview for proposed changes.
- WAAPI or CSS transitions for applied operations.
- Highlight changed objects.
- Easy correction: "undo", "no, the other one", "make it smaller", "a bit more".

This is important because voice/AI edits happen as discrete batches. The user should see what changed.

## Things To Replace Or Remove

### Replace tldraw

tldraw should not be the long-term editor foundation.

Why:

- tldraw is optimized for whiteboard/infinite-canvas use cases.
- Its default shape model does not provide first-class design-tool concepts like per-corner radius.
- It does not naturally model Figma-like frames, constraints, design tokens, variants, and native component libraries.
- Extending it deeply would mean fighting the SDK instead of owning Ruby's editor model.

Current tldraw code can be kept temporarily as a reference/spike, but the next real implementation should replace it.

### Replace Browser Web Speech API

The current browser speech adapter is only a fallback/demo.

It should be replaced with real streaming STT:

- Deepgram first choice for command transcription.
- OpenAI Realtime can be revisited if we want speech + tool calling in one provider later.

### Modify The Current Document Schema

The current schema wraps tldraw snapshots. This must change.

New persistence should store:

- Ruby document metadata.
- Custom scene graph nodes.
- Operation log.
- Assets.
- Migrations.
- Session state separately from document state.

### Modify Operation Handling

The existing operation idea is good, but it currently targets tldraw.

Keep:

- Typed operations.
- Validation.
- Undoability.
- Command history.
- Evals.

Change:

- Operations must target Ruby's custom scene graph.
- Operation application should produce patches/inverse patches.
- Operations should support preview before commit.

### Modify Reference Resolution

The current resolver is basic.

It should evolve to use:

- Selection.
- Hover.
- Recently created nodes.
- Spatial matching.
- Frame containment.
- Layer names.
- Node type.
- Visual properties.
- Confidence thresholds.

Ambiguous edits should preview candidates or ask a clarification.

## Things Not To Use As Core Architecture

### Do Not Use Houdini As Core Renderer

CSS Houdini Paint API is not reliable enough for core rendering.

Reasons:

- Firefox does not support CSS Paint API.
- Safari support is disabled/partial in practice.
- Worklets have sandbox limitations.

Houdini can be reconsidered later as progressive enhancement only.

### Do Not Start With WebGPU

WebGPU/WebGL may be needed later, but not first.

Reasons:

- High engineering cost.
- Harder text editing.
- Harder accessibility.
- Slower iteration.
- We do not yet have measured bottlenecks.

Design the scene graph so a GPU renderer can be added later.

### Do Not Start With CRDT Multiplayer

Use an event-sourced operation log first.

CRDT/multiplayer can come later when collaboration is a real product requirement.

## Research Spikes Needed

### 1. DOM/SVG Renderer Spike

Build a custom renderer that supports:

- Frames.
- Rounded rectangles.
- Text.
- Selection.
- Drag/move.
- Resize.
- Property inspector.
- Zoom/pan.

Measure performance at:

- 100 nodes.
- 500 nodes.
- 1,000 nodes.
- 2,000 nodes.

### 2. `content-visibility` Spike

`content-visibility: auto` is useful but risky with transformed pan/zoom containers.

Test:

- Pan/zoom via CSS transforms.
- Scaled parents above `scale(1)`.
- Clipping bugs.
- Hit testing.
- Selection handles.
- Text editing.

If it is unreliable, use manual viewport culling instead.

### 3. Manual Viewport Culling Spike

Build a fallback where offscreen nodes are not mounted or are simplified.

This reduces:

- Layout cost.
- Paint cost.
- DOM memory pressure.

### 4. Voice Pipeline Spike

Test:

- Deepgram streaming STT.
- Keyterm prompting for design terms.
- Endpointing for short commands.
- Fast LLM parser for JSON operations.
- Latency from speech end to visible edit.

Important terms:

- radius
- opacity
- shadow
- px
- frame
- iPhone
- hex colors
- fill
- stroke

### 5. Undo/Operation Log Spike

Build operation transactions with:

- Patches.
- Inverse patches.
- Replay.
- Undo/redo.
- Command history.
- Eval fixtures.

### 6. iOS Component Library Spike

Define components as node factories.

Example:

```ts
type ComponentDefinition = {
  id: string
  name: string
  category: 'ios' | 'material' | 'web'
  createNodes: () => DesignNode[]
}
```

Start small. Do not build a full design system before the editor basics work.

## Recommended Next Build Sequence

1. Move current tldraw prototype into a clearly marked legacy/spike area or delete it after preserving history in git.
2. Create custom scene graph types.
3. Create document store and operation log.
4. Build SVG/HTML canvas renderer.
5. Add frame presets, starting with iPhone.
6. Add rect node with radius and per-corner radius.
7. Add text node with editable overlay.
8. Add selection, drag, resize, and property inspector.
9. Add undo/redo through operation transactions.
10. Route typed commands to the custom operation system.
11. Add basic iOS components.
12. Add preview/animated diffs for AI operations.
13. Add Deepgram STT backend path.

## Current Decision Summary

Use:

- Custom scene graph.
- DOM/SVG/HTML renderer first.
- Event-sourced operation log.
- Deepgram streaming STT.
- Fast LLM parser.
- iPhone frames early.
- Small iOS component library.
- Preview and animated diffs.

Replace:

- tldraw as core canvas.
- Browser Web Speech API as real STT.
- tldraw snapshot persistence.
- tldraw-targeted operation application.

Avoid for now:

- WebGPU-first renderer.
- Houdini as core rendering.
- CRDT multiplayer.
- Large component system before editor basics.

Core principle:

> Build Ruby's product shape first: a voice-first design editor with real design properties and mobile UI frames. Keep the architecture flexible enough to swap renderers later.

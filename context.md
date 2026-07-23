# Ruby Design Project Context

Ruby Design is intended to become a voice-first design tool, closer to a Figma competitor than a whiteboard app.

## Current Repo

Repo: `git@github.com:silentstone00/ruby.design.git`
Branch: `main`

The current implementation is a React + Vite + TypeScript prototype using tldraw. It was built as an early spike for typed and voice command flow, not as the final editor foundation.

Important folders:

- `app/canvas/` - current tldraw integration.
- `app/document/` - document schema, serialization, migrations.
- `app/operations/` - typed design operation schema and operation applier.
- `app/voice/` - browser speech adapter and transcript state.
- `app/intelligence/` - local command parser and future LLM tool schema.
- `app/referenceResolver/` - resolves references such as "this", "that", and "it".
- `app/ui/` - side panel, toolbar, transcript/history.
- `app/persistence/` - localStorage save/load.
- `app/evals/` - command fixture examples.

## Current Problems

tldraw is likely the wrong long-term foundation.

Reasons:

- Figma-like flexibility is required.
- Need first-class corner radius and per-corner radius.
- Need frames/artboards such as iPhone, desktop, and tablet.
- Need native component libraries like iOS components.
- Need a design-specific schema for constraints, auto-layout, fills, strokes, shadows, effects, components, and variants.
- tldraw's default shape schema does not expose core design-tool concepts cleanly enough.

The mic currently uses the browser Web Speech API. This is not production-ready. It often returns `network` errors because browser speech recognition depends on a remote browser speech service.

## Product Direction

Pivot away from tldraw toward a custom Figma-like editor architecture.

Recommended architecture:

- Custom scene graph.
- Custom renderer, probably SVG/HTML first for MVP.
- Later Canvas/WebGL/WebGPU if performance requires it.
- First-class design node schema.
- Voice operations targeting our own schema.
- iOS/mobile frame and component library.
- Layers panel.
- Property inspector.
- Persistence.
- Later multiplayer.

## Recommended MVP Reset

Build a custom editor with these core nodes:

```ts
type DesignNode =
  | FrameNode
  | RectNode
  | TextNode
  | ImageNode
  | GroupNode
  | ComponentInstanceNode

type FrameNode = {
  id: string
  type: 'frame'
  name: string
  x: number
  y: number
  width: number
  height: number
  preset?: 'iphone-15' | 'iphone-15-pro' | 'ipad' | 'desktop'
  children: string[]
}

type RectNode = {
  id: string
  type: 'rect'
  name: string
  x: number
  y: number
  width: number
  height: number
  radius:
    | number
    | {
        topLeft: number
        topRight: number
        bottomRight: number
        bottomLeft: number
      }
  fills: Paint[]
  strokes: Stroke[]
  shadows: Shadow[]
}

type TextNode = {
  id: string
  type: 'text'
  name: string
  x: number
  y: number
  width: number
  height: number
  text: string
  fontSize: number
  fontWeight: number
  color: string
}
```

## Voice Commands

Keep the typed operation idea, but apply it to the custom schema:

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

Example commands:

- "Create an iPhone 15 screen"
- "Add an iOS status bar"
- "Add a rounded card"
- "Make this radius 24"
- "Use an iOS search field"
- "Add a native tab bar"
- "Make this look like Apple Settings"

## iOS Component Library

Add a component library system:

```ts
type ComponentDefinition = {
  id: string
  name: string
  category: 'ios' | 'material' | 'web'
  createNodes: () => DesignNode[]
}
```

Initial components:

- iPhone 15 Frame
- iOS Status Bar
- iOS Home Indicator
- Navigation Bar
- Tab Bar
- Button
- Search Field
- Text Field
- Switch
- List Row
- Sheet
- Alert

## STT Recommendation

Do not rely on browser Web Speech API.

Use:

- OpenAI Realtime for voice + tool calling, or
- Deepgram for dedicated streaming transcription.

API keys should go through a backend endpoint, not directly in the browser.

## Figma Engineering Reference

Figma is not normal DOM rendering. It uses a custom scene graph and GPU-backed canvas renderer. Historically WebGL, now WebGPU. Their renderer is C++ compiled to WebAssembly for web.

Figma's document model is object/property based:

```ts
Map<ObjectID, Map<Property, Value>>
```

Figma multiplayer is server-authoritative and CRDT-inspired, synced over WebSockets.

References:

- https://www.figma.com/blog/how-figmas-multiplayer-technology-works/
- https://www.figma.com/blog/figma-rendering-powered-by-webgpu/
- https://www.figma.com/blog/building-accessibility-into-a-canvas-based-product/

## Next Task

Replace the tldraw canvas with a custom SVG/HTML MVP editor:

1. Create custom scene graph store.
2. Render frames and nodes in SVG.
3. Add selection and drag/move.
4. Add property inspector for x/y/w/h/radius/fill/text.
5. Add iPhone frame preset.
6. Add basic iOS component library.
7. Route typed voice commands to custom operations.

import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react'
import type { Constraints, CornerRadii, DesignNode, FrameLayout, ImageCrop, LayoutSizing } from '../document/scene'

type InspectorProps = {
  node: DesignNode | null
  parent: DesignNode | null
  onRadiusChange: (radius: CornerRadii) => void
  onUpdate: (patch: Partial<DesignNode>) => void
}

const corners: Array<[keyof CornerRadii, string]> = [
  ['topLeft', 'Top left'],
  ['topRight', 'Top right'],
  ['bottomRight', 'Bottom right'],
  ['bottomLeft', 'Bottom left'],
]

export function Inspector({ node, parent, onRadiusChange, onUpdate }: InspectorProps) {
  if (!node) return null
  const radius = node.radius
  const canRound = node.type === 'rect' || node.type === 'frame' || node.type === 'image'
  const layout: FrameLayout = node.layout ?? { direction: 'none', gap: 12, padding: { top: 16, right: 16, bottom: 16, left: 16 }, align: 'start', justify: 'start' }
  const sizing: LayoutSizing = node.layoutSizing ?? { horizontal: 'fixed', vertical: 'fixed' }
  const constraints: Constraints = node.constraints ?? { horizontal: 'left', vertical: 'top' }
  const isAutoLayoutChild = parent?.type === 'frame' && parent.layout?.direction && parent.layout.direction !== 'none'
  const updateCrop = (patch: Partial<ImageCrop>) => {
    const crop = node.imageCrop ?? { x: 0, y: 0, width: 1, height: 1 }
    const width = clampCrop(patch.width ?? crop.width)
    const height = clampCrop(patch.height ?? crop.height)
    const x = Math.min(clampCrop(patch.x ?? crop.x), 1 - width)
    const y = Math.min(clampCrop(patch.y ?? crop.y), 1 - height)
    onUpdate({ imageCrop: { x, y, width, height } })
  }

  return (
    <section className="inspector" aria-label="Properties">
      <div className="inspector-title"><span>Properties</span><strong>{node.name}</strong></div>
      <label className="node-name">Name<input value={node.name} onChange={(event) => onUpdate({ name: event.currentTarget.value })} /></label>
      <div className="inspector-grid">
        <label>X<input readOnly value={Math.round(node.x)} /></label>
        <label>Y<input readOnly value={Math.round(node.y)} /></label>
        <label>W<input readOnly value={Math.round(node.width)} /></label>
        <label>H<input readOnly value={Math.round(node.height)} /></label>
      </div>
      <div className="appearance-controls">
        {node.type !== 'text' && node.type !== 'image' && <label>Fill<input type="color" value={toColor(node.fill, '#ffffff')} onChange={(event) => onUpdate({ fill: event.currentTarget.value })} /></label>}
        {node.type !== 'image' && <label>{node.type === 'text' ? 'Text' : 'Stroke'}<input type="color" value={toColor(node.type === 'text' ? node.color : node.stroke, '#101828')} onChange={(event) => onUpdate(node.type === 'text' ? { color: event.currentTarget.value } : { stroke: event.currentTarget.value })} /></label>}
        {node.type !== 'text' && node.type !== 'image' && <label>Stroke<input type="number" min="0" max="24" value={node.strokeWidth ?? 0} onInput={(event) => onUpdate({ strokeWidth: Math.max(0, Number(event.currentTarget.value)) })} /></label>}
        <label>Opacity<input type="range" min="0" max="100" value={Math.round((node.opacity ?? 1) * 100)} onInput={(event) => onUpdate({ opacity: Number(event.currentTarget.value) / 100 })} /></label>
      </div>
      {canRound && radius && (
        <fieldset className="radius-controls">
          <legend>Corner radius</legend>
          <label className="radius-all">All<input type="number" min="0" value={radius.topLeft} onInput={(event) => {
            const value = Math.max(0, Number(event.currentTarget.value))
            onRadiusChange({ topLeft: value, topRight: value, bottomRight: value, bottomLeft: value })
          }} /></label>
          <div className="inspector-grid">
            {corners.map(([key, label]) => <label key={key}>{label}<input type="number" min="0" value={radius[key]} onInput={(event) => onRadiusChange({ ...radius, [key]: Math.max(0, Number(event.currentTarget.value)) })} /></label>)}
          </div>
        </fieldset>
      )}
      {node.type === 'image' && <fieldset className="crop-controls">
        <legend>Image crop</legend>
        <div className="inspector-grid">
          <label>Left %<input type="number" min="0" max="100" value={Math.round((node.imageCrop?.x ?? 0) * 100)} onInput={(event) => updateCrop({ x: Number(event.currentTarget.value) / 100 })} /></label>
          <label>Top %<input type="number" min="0" max="100" value={Math.round((node.imageCrop?.y ?? 0) * 100)} onInput={(event) => updateCrop({ y: Number(event.currentTarget.value) / 100 })} /></label>
          <label>Width %<input type="number" min="1" max="100" value={Math.round((node.imageCrop?.width ?? 1) * 100)} onInput={(event) => updateCrop({ width: Number(event.currentTarget.value) / 100 })} /></label>
          <label>Height %<input type="number" min="1" max="100" value={Math.round((node.imageCrop?.height ?? 1) * 100)} onInput={(event) => updateCrop({ height: Number(event.currentTarget.value) / 100 })} /></label>
        </div>
      </fieldset>}
      {node.type === 'frame' && <fieldset className="layout-controls">
        <legend>Auto layout</legend>
        <label>Direction<select value={layout.direction} onChange={(event) => onUpdate({ layout: { ...layout, direction: event.currentTarget.value as FrameLayout['direction'] } })}><option value="none">Free layout</option><option value="vertical">Vertical</option><option value="horizontal">Horizontal</option></select></label>
        {layout.direction !== 'none' && <>
          <div className="inspector-grid">
            <label>Gap<input type="number" min="0" value={layout.gap} onInput={(event) => onUpdate({ layout: { ...layout, gap: Math.max(0, Number(event.currentTarget.value)) } })} /></label>
            <label>Align<select value={layout.align} onChange={(event) => onUpdate({ layout: { ...layout, align: event.currentTarget.value as FrameLayout['align'] } })}><option value="start">Start</option><option value="center">Center</option><option value="end">End</option><option value="stretch">Stretch</option></select></label>
            <label>Distribute<select value={layout.justify} onChange={(event) => onUpdate({ layout: { ...layout, justify: event.currentTarget.value as FrameLayout['justify'] } })}><option value="start">Start</option><option value="center">Center</option><option value="end">End</option><option value="space-between">Space between</option></select></label>
          </div>
          <div className="inset-grid">
            <label>Top<input type="number" min="0" value={layout.padding.top} onInput={(event) => onUpdate({ layout: { ...layout, padding: { ...layout.padding, top: Math.max(0, Number(event.currentTarget.value)) } } })} /></label>
            <label>Right<input type="number" min="0" value={layout.padding.right} onInput={(event) => onUpdate({ layout: { ...layout, padding: { ...layout.padding, right: Math.max(0, Number(event.currentTarget.value)) } } })} /></label>
            <label>Bottom<input type="number" min="0" value={layout.padding.bottom} onInput={(event) => onUpdate({ layout: { ...layout, padding: { ...layout.padding, bottom: Math.max(0, Number(event.currentTarget.value)) } } })} /></label>
            <label>Left<input type="number" min="0" value={layout.padding.left} onInput={(event) => onUpdate({ layout: { ...layout, padding: { ...layout.padding, left: Math.max(0, Number(event.currentTarget.value)) } } })} /></label>
          </div>
        </>}
      </fieldset>}
      {node.parentId && <fieldset className="layout-controls">
        <legend>{isAutoLayoutChild ? 'Auto layout sizing' : 'Constraints'}</legend>
        {isAutoLayoutChild ? <div className="inspector-grid">
          <label>Horizontal<select value={sizing.horizontal} onChange={(event) => onUpdate({ layoutSizing: { ...sizing, horizontal: event.currentTarget.value as LayoutSizing['horizontal'] } })}><option value="fixed">Fixed</option><option value="fill">Fill</option><option value="hug">Hug</option></select></label>
          <label>Vertical<select value={sizing.vertical} onChange={(event) => onUpdate({ layoutSizing: { ...sizing, vertical: event.currentTarget.value as LayoutSizing['vertical'] } })}><option value="fixed">Fixed</option><option value="fill">Fill</option><option value="hug">Hug</option></select></label>
        </div> : <div className="inspector-grid">
          <label>Horizontal<select value={constraints.horizontal} onChange={(event) => onUpdate({ constraints: { ...constraints, horizontal: event.currentTarget.value as Constraints['horizontal'] } })}><option value="left">Left</option><option value="right">Right</option><option value="left-right">Left &amp; right</option><option value="center">Center</option><option value="scale">Scale</option></select></label>
          <label>Vertical<select value={constraints.vertical} onChange={(event) => onUpdate({ constraints: { ...constraints, vertical: event.currentTarget.value as Constraints['vertical'] } })}><option value="top">Top</option><option value="bottom">Bottom</option><option value="top-bottom">Top &amp; bottom</option><option value="center">Center</option><option value="scale">Scale</option></select></label>
        </div>}
      </fieldset>}
      {node.text !== undefined && <fieldset className="typography-controls">
        <legend>Typography</legend>
        <label>Size<input type="number" min="8" max="160" value={node.fontSize ?? 16} onInput={(event) => onUpdate({ fontSize: Math.max(8, Number(event.currentTarget.value)) })} /></label>
        <div className="alignment-buttons" aria-label="Text alignment">
          <button className={(node.textAlign ?? 'center') === 'left' ? 'is-active' : ''} title="Align left" aria-label="Align left" onClick={() => onUpdate({ textAlign: 'left' })}><AlignLeft size={15} /></button>
          <button className={(node.textAlign ?? 'center') === 'center' ? 'is-active' : ''} title="Align center" aria-label="Align center" onClick={() => onUpdate({ textAlign: 'center' })}><AlignCenter size={15} /></button>
          <button className={(node.textAlign ?? 'center') === 'right' ? 'is-active' : ''} title="Align right" aria-label="Align right" onClick={() => onUpdate({ textAlign: 'right' })}><AlignRight size={15} /></button>
        </div>
      </fieldset>}
    </section>
  )
}

function toColor(value: string | undefined, fallback: string) {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback
}

function clampCrop(value: number) {
  return Math.min(1, Math.max(0.01, Number.isFinite(value) ? value : 1))
}

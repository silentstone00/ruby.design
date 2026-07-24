import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react'
import type { CornerRadii, DesignNode } from '../document/scene'

type InspectorProps = {
  node: DesignNode | null
  onRadiusChange: (radius: CornerRadii) => void
  onUpdate: (patch: Partial<DesignNode>) => void
}

const corners: Array<[keyof CornerRadii, string]> = [
  ['topLeft', 'Top left'],
  ['topRight', 'Top right'],
  ['bottomRight', 'Bottom right'],
  ['bottomLeft', 'Bottom left'],
]

export function Inspector({ node, onRadiusChange, onUpdate }: InspectorProps) {
  if (!node) return null
  const radius = node.radius
  const canRound = node.type === 'rect' || node.type === 'frame'

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
        {node.type !== 'text' && <label>Fill<input type="color" value={toColor(node.fill, '#ffffff')} onChange={(event) => onUpdate({ fill: event.currentTarget.value })} /></label>}
        <label>{node.type === 'text' ? 'Text' : 'Stroke'}<input type="color" value={toColor(node.type === 'text' ? node.color : node.stroke, '#101828')} onChange={(event) => onUpdate(node.type === 'text' ? { color: event.currentTarget.value } : { stroke: event.currentTarget.value })} /></label>
        {node.type !== 'text' && <label>Stroke<input type="number" min="0" max="24" value={node.strokeWidth ?? 0} onInput={(event) => onUpdate({ strokeWidth: Math.max(0, Number(event.currentTarget.value)) })} /></label>}
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

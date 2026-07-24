export type CornerRadii = {
  topLeft: number
  topRight: number
  bottomRight: number
  bottomLeft: number
}

export type DesignNode = {
  id: string
  type: 'frame' | 'rect' | 'ellipse' | 'line' | 'arrow' | 'text'
  name: string
  x: number
  y: number
  width: number
  height: number
  fill: string
  color: string
  stroke?: string
  strokeWidth?: number
  opacity?: number
  rotation?: number
  text?: string
  fontSize?: number
  fontWeight?: number
  textAlign?: 'left' | 'center' | 'right'
  radius?: CornerRadii
  preset?: 'iphone-16-pro' | 'iphone-16'
  groupId?: string
}

export type DesignScene = {
  nodes: DesignNode[]
}

export const IPHONE_16_PRO = { width: 402, height: 874 } as const

export function uniformRadius(value = 0): CornerRadii {
  return { topLeft: value, topRight: value, bottomRight: value, bottomLeft: value }
}

export function createStarterScene(): DesignScene {
  return {
    nodes: [
      {
        id: 'frame-iphone-16-pro',
        type: 'frame',
        name: 'iPhone 16 Pro',
        x: 190,
        y: 90,
        width: IPHONE_16_PRO.width,
        height: IPHONE_16_PRO.height,
        fill: '#ffffff',
        color: '#101828',
        stroke: '#cbd5e1',
        strokeWidth: 1,
        preset: 'iphone-16-pro',
        radius: uniformRadius(54),
      },
      {
        id: 'welcome-title',
        type: 'text',
        name: 'Welcome title',
        x: 222,
        y: 176,
        width: 330,
        height: 52,
        fill: 'transparent',
        color: '#101828',
        text: 'Build with your voice',
        fontSize: 28,
        fontWeight: 700,
        textAlign: 'left',
      },
      {
        id: 'primary-button',
        type: 'rect',
        name: 'Primary button',
        x: 222,
        y: 742,
        width: 338,
        height: 54,
        fill: '#2563eb',
        color: '#ffffff',
        text: 'Continue',
        fontWeight: 650,
        textAlign: 'center',
        radius: uniformRadius(14),
      },
    ],
  }
}

export function isDesignScene(value: unknown): value is DesignScene {
  return typeof value === 'object' && value !== null && Array.isArray((value as DesignScene).nodes)
}

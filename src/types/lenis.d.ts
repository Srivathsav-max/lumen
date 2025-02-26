declare module 'lenis' {
  interface LenisOptions {
    wrapper?: HTMLElement | Window
    content?: HTMLElement
    lerp?: number
    duration?: number
    orientation?: 'vertical' | 'horizontal'
    gestureOrientation?: 'vertical' | 'horizontal'
    smoothWheel?: boolean
    smoothTouch?: boolean
    wheelMultiplier?: number
    touchMultiplier?: number
  }

  export default class Lenis {
    constructor(options?: LenisOptions)
    
    destroy(): void
    raf(time: number): void
    stop(): void
    start(): void
    on(event: string, callback: (...args: any[]) => void): void
  }
}

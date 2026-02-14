declare interface Window {
  // extend the window
}

declare module '*.md?raw' {
  const content: string
  export default content
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<object, object, any>
  export default component
}

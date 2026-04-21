/**
 * CSS Module Type Declarations
 * Global declaration for all CSS modules
 */

declare module '*.css' {
  const styles: Record<string, string>
  export default styles
}

declare module '*.module.css' {
  const styles: Record<string, string>
  export default styles
}
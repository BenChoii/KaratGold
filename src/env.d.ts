/// <reference types="vite/client" />

// Allow process.env in convex server files that get transitively imported
declare const process: {
  env: Record<string, string | undefined>
}

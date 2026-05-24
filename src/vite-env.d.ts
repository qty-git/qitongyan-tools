/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string
  readonly VITE_QWEN_API_KEY: string
  readonly VITE_DOUBAO_API_KEY: string
  readonly VITE_DOUBAO_VISION_MODEL: string
  readonly VITE_DOUBAO_TEXT_MODEL: string
  readonly VITE_DOUBAO_ENDPOINT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

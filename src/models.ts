export const DEFAULT_BASE_URL = "https://nano-gpt.com/api/v1"

export interface ModelEntry {
  id: string
  name: string
}

export const DEFAULT_MODELS: ModelEntry[] = [
  { id: "openai/gpt-5.1", name: "GPT-5.1" },
  { id: "openai/gpt-5.1-mini", name: "GPT-5.1 Mini" },
  { id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5" },
  { id: "anthropic/claude-opus-4.1", name: "Claude Opus 4.1" },
  { id: "google/gemini-3-pro-preview", name: "Gemini 3 Pro Preview" },
  { id: "xai/grok-code-fast-1", name: "Grok Code Fast 1" },
  { id: "xai/grok-4", name: "Grok 4" },
  { id: "deepseek/deepseek-chat", name: "DeepSeek Chat" },
  { id: "moonshotai/kimi-k2", name: "Kimi K2" },
  { id: "xiaomi/mimo-v2.5-pro", name: "MiMo V2.5 Pro" }
]

export function cloneDefaultModels(): Record<string, Record<string, unknown>> {
  const result: Record<string, Record<string, unknown>> = {}
  for (const model of DEFAULT_MODELS) {
    result[model.id] = { name: model.name }
  }
  return result
}

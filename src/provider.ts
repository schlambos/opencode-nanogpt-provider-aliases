import type { ResolvedProfile } from "./config.js"
import { cloneDefaultModels } from "./models.js"

const MODEL_FETCH_TIMEOUT_MS = 3000
const NANOGPT_NPM = "@ai-sdk/openai-compatible"

type ModelMap = Record<string, Record<string, unknown>>

async function timedFetch(
  url: string,
  init: RequestInit,
  ms: number,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

function getOrCreateRecord(
  parent: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const current = parent[key]
  if (current && typeof current === "object" && !Array.isArray(current)) {
    return current as Record<string, unknown>
  }
  const next: Record<string, unknown> = {}
  parent[key] = next
  return next
}

function normalizeBaseURL(baseURL: string): string {
  return baseURL.replace(/\/$/, "")
}

function modelName(id: string): string {
  const leaf = id.split("/").at(-1) || id
  return leaf
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export async function buildProviderConfig(
  profile: ResolvedProfile,
  models: ModelMap,
): Promise<Record<string, unknown>> {
  return {
    npm: NANOGPT_NPM,
    name: profile.name,
    options: {
      apiKey: profile.apiKey,
      baseURL: profile.baseURL,
    },
    models,
  }
}

async function resolveModels(
  profile: ResolvedProfile,
): Promise<ModelMap> {
  let models = profile.models

  if (!models) {
    try {
      models = await fetchModels(profile)
    } catch (err) {
      console.warn(
        `[opencode-nanogpt-provider-aliases] Failed to fetch models for ${profile.id}:`,
        err,
      )
      models = cloneDefaultModels()
    }
  }

  return models
}

export async function injectProfiles(
  config: Record<string, unknown>,
  profiles: ResolvedProfile[],
): Promise<void> {
  const providers = getOrCreateRecord(config, "provider")
  const resolvedModels = await Promise.all(profiles.map((profile) => resolveModels(profile)))
  const sharedModels = mergeModels(resolvedModels)

  for (const profile of profiles) {
    providers[profile.providerId] = await buildProviderConfig(profile, sharedModels)
  }
}

function mergeModels(models: ModelMap[]): ModelMap {
  const merged: ModelMap = {}
  for (const catalog of models) {
    for (const [id, model] of Object.entries(catalog)) {
      merged[id] ??= model
    }
  }
  return merged
}

async function fetchModels(
  profile: ResolvedProfile,
): Promise<Record<string, Record<string, unknown>>> {
  const modelsUrl = `${normalizeBaseURL(profile.baseURL)}/models`
  const res = await timedFetch(
    modelsUrl,
    {
      headers: {
        Authorization: `Bearer ${profile.apiKey}`,
        "x-api-key": profile.apiKey,
      },
    },
    MODEL_FETCH_TIMEOUT_MS,
  )

  if (!res.ok) {
    throw new Error(`Models fetch failed: ${res.status} ${res.statusText}`)
  }

  const data = (await res.json()) as { data?: Array<{ id?: unknown; name?: unknown }> }
  if (!Array.isArray(data.data)) {
    throw new Error("Invalid models response format")
  }

  const result: Record<string, Record<string, unknown>> = {}
  for (const model of data.data) {
    if (typeof model.id !== "string" || model.id.trim() === "") continue
    const id = model.id.trim()
    result[id] = {
      name: typeof model.name === "string" && model.name.trim() ? model.name.trim() : modelName(id),
    }
  }

  if (Object.keys(result).length === 0) {
    throw new Error("Models response did not include any model ids")
  }

  return result
}

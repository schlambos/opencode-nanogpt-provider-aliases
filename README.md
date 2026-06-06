# opencode-nanogpt-provider-aliases

OpenCode plugin that registers multiple NanoGPT API keys as separate, selectable providers in the OpenCode model picker.

If you configure two profiles, OpenCode sees two independent provider namespaces:

```text
nano-gpt-primary/openai/gpt-5.1
nano-gpt-backup/openai/gpt-5.1
```

This mirrors the `opencode-go-multi-auth` account-alias pattern: every configured profile becomes a distinct OpenCode provider with its own `options.apiKey`. You choose the account by choosing the provider namespace in the model selector.

## Important Notice

This project is not affiliated with NanoGPT, OpenCode, or the OpenCode Go multi-auth plugin.

Using multiple accounts, keys, subscriptions, or identities to bypass rate limits, quotas, subscription limits, payment requirements, anti-abuse controls, account restrictions, or any other access controls may violate NanoGPT's Terms of Service or other applicable policies.

This plugin is not intended to violate NanoGPT's Terms of Service and is not intended to help anyone evade limits, billing, monitoring, fraud prevention, or enforcement. It is intended only to let users who are authorized to use multiple NanoGPT API keys select the desired key explicitly from OpenCode's model picker.

You are responsible for your own actions, accounts, keys, usage, billing, compliance obligations, and interpretation of NanoGPT's current terms and policies. If your intended use is prohibited by NanoGPT or by any other service involved, do not use this tool for that purpose.

## What It Does

- Registers one OpenCode provider per NanoGPT profile.
- Uses provider IDs like `nano-gpt-personal` or `nano-gpt-backup`.
- Pulls each provider's API key either from a direct `apiKey` field or from an environment variable via `apiKeyEnv`.
- Fetches the live NanoGPT model catalog from `/models` for each profile at startup.
- Falls back to a small static model catalog if model discovery fails.
- Leaves account selection explicit: pick `nano-gpt-account-a/model` or `nano-gpt-account-b/model` in OpenCode.

## What It Does Not Do

- It does not rotate keys.
- It does not pool keys.
- It does not fail over from one key to another.
- It does not bypass NanoGPT limits or payments.
- It does not create OpenCode `auth.json` credentials.
- It does not read the legacy `nanogpt-keys.json` storage file at runtime.
- It does not modify the built-in `nano-gpt` provider unless you explicitly configure that provider ID yourself.

## Why This Exists

OpenCode's normal provider configuration is provider-oriented. A single provider namespace usually maps to one credential source. If you have multiple NanoGPT API keys that you are authorized to use, switching between them is awkward unless each key has its own provider namespace.

This plugin makes account selection visible and deterministic:

```text
nano-gpt-personal/xiaomi/mimo-v2.5-pro
nano-gpt-work/xiaomi/mimo-v2.5-pro
```

The request goes through the provider selected in the picker. There is no hidden runtime choice.

## Install

```bash
git clone https://github.com/<owner>/opencode-nanogpt-provider-aliases.git ~/opencode-plugins/opencode-nanogpt-provider-aliases
cd ~/opencode-plugins/opencode-nanogpt-provider-aliases
npm install
npm run build
```

The built plugin entrypoint is `dist/index.js`. OpenCode must be able to load that file from the path referenced by your shim.

## OpenCode Configuration Model

Use an auto-discovered shim file under `~/.config/opencode/plugins/`.

This is the most reliable setup because OpenCode validates `opencode.jsonc` against a strict schema. Custom top-level keys such as `opencodeNanogptProviderAliases` may be rejected in config files. A shim lets normal JavaScript pass the `profiles` array directly to the plugin.

Files in `~/.config/opencode/plugins/` are auto-discovered. Do not also add the shim path to the `plugin` array in `opencode.jsonc`.

## Quick Start With Direct Keys

Create `~/.config/opencode/plugins/nanogpt-provider-aliases.js`:

```js
import plugin from "file:///absolute/path/to/opencode-nanogpt-provider-aliases/dist/index.js"

const profiles = [
  {
    id: "primary",
    name: "NanoGPT Primary",
    apiKey: "sk-nano-...",
  },
  {
    id: "backup",
    name: "NanoGPT Backup",
    apiKey: "sk-nano-...",
  },
]

export default async function (input, _options) {
  return plugin(input, { profiles })
}
```

Because this shim contains raw API keys, restrict file permissions:

```bash
chmod 600 ~/.config/opencode/plugins/nanogpt-provider-aliases.js
```

Restart OpenCode after creating or changing the shim.

## Quick Start With Environment Variables

If you do not want raw keys in the shim, use environment variables:

```js
import plugin from "file:///absolute/path/to/opencode-nanogpt-provider-aliases/dist/index.js"

const profiles = [
  {
    id: "primary",
    name: "NanoGPT Primary",
    apiKeyEnv: "NANO_GPT_PRIMARY_KEY",
  },
  {
    id: "backup",
    name: "NanoGPT Backup",
    apiKeyEnv: "NANO_GPT_BACKUP_KEY",
  },
]

export default async function (input, _options) {
  return plugin(input, { profiles })
}
```

Then export the keys in the shell that launches OpenCode:

```bash
export NANO_GPT_PRIMARY_KEY="sk-nano-..."
export NANO_GPT_BACKUP_KEY="sk-nano-..."
```

Restart OpenCode so the process sees the environment variables.

## Expected Result

Run:

```bash
opencode models
```

You should see model IDs under each configured provider namespace:

```text
nano-gpt-primary/openai/gpt-5.1
nano-gpt-primary/xiaomi/mimo-v2.5-pro
nano-gpt-backup/openai/gpt-5.1
nano-gpt-backup/xiaomi/mimo-v2.5-pro
```

You can use those provider/model IDs in `opencode.jsonc`:

```jsonc
{
  "model": "nano-gpt-primary/openai/gpt-5.1",
  "small_model": "nano-gpt-backup/xiaomi/mimo-v2.5-pro"
}
```

Restart OpenCode after changing default models.

## Profile Schema

Each profile has this shape:

```ts
type Profile = {
  id: string
  name: string
  apiKey?: string
  apiKeyEnv?: string
  providerId?: string
  baseURL?: string
  models?: Record<string, Record<string, unknown>>
}
```

| Field | Required | Default | Description |
|---|---:|---|---|
| `id` | yes | none | Short account identifier. Must start with a lowercase letter and contain only lowercase letters, digits, and hyphens. |
| `name` | yes | none | Provider display name shown by OpenCode. |
| `apiKey` | conditional | none | Raw NanoGPT API key for this profile. Required unless `apiKeyEnv` is set. |
| `apiKeyEnv` | conditional | none | Environment variable holding this profile's NanoGPT API key. Required unless `apiKey` is set. |
| `providerId` | no | `nano-gpt-${id}` | Explicit provider ID override. Must match the same lowercase provider ID rules. |
| `baseURL` | no | `https://nano-gpt.com/api/v1` | NanoGPT OpenAI-compatible API base URL. |
| `models` | no | live `/models` result | Static model map override. If provided, the plugin skips live model discovery for that profile. |

If both `apiKey` and `apiKeyEnv` are set, `apiKey` wins.

## Provider IDs

By default, provider IDs are generated as:

```text
nano-gpt-${id}
```

Examples:

| Profile `id` | Provider ID | Model picker example |
|---|---|---|
| `primary` | `nano-gpt-primary` | `nano-gpt-primary/openai/gpt-5.1` |
| `backup` | `nano-gpt-backup` | `nano-gpt-backup/openai/gpt-5.1` |
| `team-a` | `nano-gpt-team-a` | `nano-gpt-team-a/xiaomi/mimo-v2.5-pro` |

Use `providerId` only if you need a custom namespace:

```js
const profiles = [
  {
    id: "primary",
    providerId: "nanogpt-primary",
    name: "NanoGPT Primary",
    apiKeyEnv: "NANO_GPT_PRIMARY_KEY",
  },
]
```

## Static Model Overrides

By default, the plugin fetches the model catalog from NanoGPT at startup:

```text
GET https://nano-gpt.com/api/v1/models
```

If you want faster startup, deterministic model lists, or a reduced picker, provide a `models` map:

```js
const profiles = [
  {
    id: "primary",
    name: "NanoGPT Primary",
    apiKeyEnv: "NANO_GPT_PRIMARY_KEY",
    models: {
      "openai/gpt-5.1": { name: "GPT-5.1" },
      "openai/gpt-5.1-codex": { name: "GPT-5.1 Codex" },
      "xiaomi/mimo-v2.5-pro": { name: "MiMo V2.5 Pro" },
    },
  },
]
```

The map keys are the model IDs as NanoGPT expects them. Values are OpenCode provider model metadata. `{ name: "..." }` is enough for basic usage.

## Migration From A Single NanoGPT Provider

If you previously used one `nano-gpt` provider entry in `opencode.jsonc`, you can remove it after switching to provider aliases unless you still want the original single provider.

Before:

```jsonc
{
  "provider": {
    "nano-gpt": {}
  }
}
```

After:

```jsonc
{
  "provider": {}
}
```

The alias providers are injected by this plugin at startup. They do not need to be declared in `opencode.jsonc`.

## Migration From A Key-Rotating Multi-Auth Plugin

A key-rotating plugin usually hides multiple keys behind one provider namespace, such as `nano-gpt/*`. This plugin does the opposite: it creates separate picker-visible providers and never switches keys automatically.

Migration steps:

1. Copy each authorized account/key into a profile in the shim.
2. Use the old account labels as profile `id` values if you want familiar provider IDs.
3. Remove the old key-rotating plugin entry from `opencode.jsonc`.
4. Remove any old `"nano-gpt": {}` activation entry if it existed only for that old plugin.
5. Restart OpenCode.
6. Run `opencode models` and choose models under the new `nano-gpt-${id}` namespaces.

Example mapping:

```js
const profiles = [
  {
    id: "account-a",
    name: "NanoGPT Account A",
    apiKey: "sk-nano-...",
  },
  {
    id: "account-b",
    name: "NanoGPT Account B",
    apiKey: "sk-nano-...",
  },
]
```

This yields:

```text
nano-gpt-account-a/...
nano-gpt-account-b/...
```

## Validation Behavior

The plugin validates profiles independently. A bad profile is skipped; valid profiles still register.

Validation failures are written to stderr with the `opencode-nanogpt-provider-aliases` prefix. API key values are not logged.

The plugin checks for:

- Missing or empty `id`
- Missing or empty `name`
- Missing both `apiKey` and `apiKeyEnv`
- Empty or unset environment variable when `apiKeyEnv` is used
- Duplicate `id`
- Duplicate generated or explicit `providerId`
- Malformed `providerId`

Provider IDs must match:

```text
^[a-z][a-z0-9-]*$
```

## Model Discovery Behavior

For each valid profile without a static `models` map, startup model discovery does this:

```text
GET ${baseURL}/models
Authorization: Bearer <profile key>
x-api-key: <profile key>
```

The request timeout is 3000 ms per profile. If NanoGPT is unreachable, slow, or returns an unexpected response, that profile still registers with the fallback catalog in `src/models.ts`.

The plugin does not persist fetched models. Model discovery runs again when OpenCode starts.

## Security Notes

- Direct `apiKey` shims contain raw API keys. Keep them out of git and set file permissions to `0600`.
- Environment variables avoid storing raw keys in the shim, but they must be present in the OpenCode process environment.
- The plugin never intentionally logs raw API keys.
- The plugin does not write API keys to disk.
- The plugin does not read OpenCode `auth.json`.
- Each profile becomes an independent provider config with its own `options.apiKey`.
- Do not commit `~/.config/opencode/plugins/nanogpt-provider-aliases.js` if it contains real keys.

## Git Hygiene

This repository should contain source code, docs, and package metadata only. It should not contain:

- Real NanoGPT API keys
- Personal shim files
- `node_modules/`
- `dist/` unless intentionally publishing built artifacts
- Local logs or probe scripts

Before publishing, a simple secret check is recommended:

```bash
rg "sk-nano-[A-Za-z0-9]" .
```

Only placeholder strings such as `sk-nano-...` should appear.

## Troubleshooting

### The providers do not show up

Check:

- `npm run build` completed successfully.
- The shim imports `dist/index.js` from the correct absolute `file://` URL.
- The shim is in `~/.config/opencode/plugins/`.
- The shim is valid ESM JavaScript.
- OpenCode was restarted after creating the shim.
- `apiKeyEnv` variables are exported in the shell that launched OpenCode, if using env vars.

Syntax-check the shim:

```bash
node --check ~/.config/opencode/plugins/nanogpt-provider-aliases.js
```

### A specific profile is missing

Check that the profile has:

- A valid lowercase `id`
- A non-empty `name`
- Either `apiKey` or `apiKeyEnv`
- A non-empty environment variable if using `apiKeyEnv`
- No duplicate `providerId`

### Model discovery failed

If model discovery fails, the provider should still appear with fallback models. To bypass live discovery, supply a static `models` map in the profile.

### The old `nano-gpt/*` provider still appears

That likely comes from another plugin or a remaining provider entry. Search your OpenCode config:

```bash
rg "nano-gpt|nanogpt" ~/.config/opencode
```

Remove stale plugin entries or provider activation blocks that are no longer needed, then restart OpenCode.

## Development

```bash
npm install
npm run typecheck
npm run build
```

Project layout:

```text
index.ts              package entrypoint
src/index.ts          OpenCode plugin hook
src/config.ts         profile validation and key resolution
src/provider.ts       provider config injection and model discovery
src/models.ts         default NanoGPT base URL and fallback model catalog
```

The package is TypeScript, ESM, and uses `@opencode-ai/plugin` as a peer dependency. No bundler is required.

## API Surface

The default export is an OpenCode `Plugin` function. The shim calls it like this:

```js
export default async function (input, _options) {
  return plugin(input, { profiles })
}
```

The plugin uses the OpenCode `config` hook to mutate the merged config object before providers are consumed:

```ts
config.provider[profile.providerId] = {
  npm: "@ai-sdk/openai-compatible",
  name: profile.name,
  options: {
    apiKey: profile.apiKey,
    baseURL: profile.baseURL,
  },
  models,
}
```

## Changelog

### 0.1.1 - 2026-06-06

- Added direct `apiKey` profile support so existing NanoGPT multi-auth keys can be copied into a provider-alias shim without environment variables.
- Expanded documentation with installation, migration, security, troubleshooting, and Terms of Service responsibility guidance.

### 0.1.0 - 2026-06-06

- Initial release.
- Added NanoGPT provider alias registration using the same profile-driven pattern as `opencode-go-multi-auth`.
- Added dynamic NanoGPT `/models` discovery with a fallback model catalog.
- Documented shim-based configuration for two picker-visible NanoGPT providers.

## License

MIT - see [LICENSE](LICENSE).

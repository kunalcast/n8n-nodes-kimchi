# n8n-nodes-kimchi

[![npm version](https://img.shields.io/npm/v/n8n-nodes-kimchi)](https://www.npmjs.com/package/n8n-nodes-kimchi)
[![npm downloads](https://img.shields.io/npm/dm/n8n-nodes-kimchi)](https://www.npmjs.com/package/n8n-nodes-kimchi)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/kunalcast/n8n-nodes-kimchi/blob/main/LICENSE.md)

This is an n8n community node. It lets you call [Kimchi Inference](https://docs.kimchi.dev/) — Cast AI's serverless, OpenAI-compatible LLM API — from your n8n workflows.

Kimchi hosts open-weight models (Kimi, DeepSeek, Nemotron, GLM, MiniMax) on a per-token tariff, with optional routing to external providers (OpenAI, Anthropic, Gemini) when you need them.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation) · [Operations](#operations) · [Credentials](#credentials) · [Models](#models) · [Compatibility](#compatibility) · [Usage](#usage) · [Build from source](#build-from-source) · [Resources](#resources) · [Version history](#version-history)

---

## Installation

Requires n8n 1.x or 2.x. The package is verified for n8n Cloud and self-hosted.

### Option 1 — Install from the n8n nodes panel (recommended)

1. Open your n8n canvas.
2. In the nodes panel, search for **Kimchi**.
3. Under **More from the community**, select **Install**.

Or via **Settings → Community nodes → Install a community node**, enter `n8n-nodes-kimchi`, and confirm.

### Option 2 — Manual (self-hosted npm install)

```bash
cd ~/.n8n
npm install n8n-nodes-kimchi
# restart n8n
```

### Option 3 — Docker (self-hosted)

Bind-mount the published package into n8n's custom-node directory. The path **must** include `node_modules` between `custom/` and the package name:

```bash
INSTALLED_DIR=$(pwd)/n8n-custom
mkdir -p "$INSTALLED_DIR/node_modules"
cd "$INSTALLED_DIR/node_modules"
npm pack n8n-nodes-kimchi
tar -xzf n8n-nodes-kimchi-*.tgz && mv package n8n-nodes-kimchi && rm n8n-nodes-kimchi-*.tgz

docker run -d --name n8n \
  -p 5678:5678 \
  -v "$INSTALLED_DIR":/home/node/.n8n/custom \
  n8nio/n8n:latest
```

The loader discovers packages under `~/.n8n/custom/node_modules/<package-name>/`. Dropping the package directly at `~/.n8n/custom/<package-name>/` parses the files but fails workflow execution with `Unrecognized node type`.

---

## Operations

The package ships one node, **Kimchi**, exposing two operations.

| Operation | API | Purpose |
|---|---|---|
| **Message a Model** | `POST /openai/v1/chat/completions` | Send a chat completion request to any Kimchi-routed model. |
| **List Models** | `GET /openai/v1/models` | Return every model ID the gateway routes (Kimchi-native plus external-provider passthrough). |

The node is marked `usableAsTool: true`, so an n8n **AI Agent** can pick it as a tool. It accepts expressions for every parameter and returns `{ response, model, usage, raw }` per execution item.

### Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| Operation | options | yes | `messageModel` | One of the two operations above. |
| Model Name or ID | options + free text | yes | `kimi-k3` | Any Kimchi-native model from the dropdown, or type any model ID the gateway routes (e.g. `gpt-4o-mini`, `claude-haiku-4-5`). |
| Prompt | string | yes | — | The user message to send. Only for **Message a Model**. |
| System Prompt | string | no | — | System message prepended to the conversation. |
| Options → Max Tokens | number | no | `1024` | Hard cap on generated output tokens. Reasoning models (e.g. `kimi-k3`) need headroom — below ~200 the response can come back empty. |
| Options → Temperature | number | no | `1` | Sampling temperature, 0–2. |

---

## Credentials

You need a Kimchi Inference API key to use this node.

1. Sign in to the [Cast AI console](https://console.cast.ai/).
2. Generate a Kimchi Inference API key. Keys are prefixed `castai_v1_`.
3. In n8n: **Credentials → New → Kimchi Inference API**.
   - **API Key** — paste your key. Stored encrypted in n8n's credential vault.
   - **Base URL** — defaults to `https://llm.kimchi.dev/openai/v1`. Only change this if you route through a regional endpoint or proxy.
4. Save. n8n tests the credential by calling `GET /models`, which is unmetered.

> **Security note.** The node never logs the key. Credentials use n8n's `httpRequestWithAuthentication` helper, which applies the `Authorization: Bearer <key>` header at request time from the credential vault — it never appears in workflow output, browser payloads, or execution logs.

---

## Models

The dropdown lists the eight **Kimchi-native** models deployed and billed by Cast AI on the Kimchi tariff:

| Model | Notes |
|---|---|
| `kimi-k3` | Reasoning model — allocates part of `max_tokens` to hidden reasoning before producing visible output. Set `max_tokens ≥ 200` or responses can come back empty. |
| `kimi-k2.7` | Kimi family chat model. |
| `nemotron-3-ultra-fp4` | NVIDIA Nemotron 3 Ultra, FP4 quantization. |
| `deepseek-v4.1-flash` | DeepSeek V4.1 Flash. |
| `deepseek-v4-flash` | DeepSeek V4 Flash. |
| `deepseek-v4-flash-0731` | DeepSeek V4 Flash, July 31 revision. |
| `glm-5.2-fp8` | GLM 5.2, FP8 quantization. |
| `minimax-m3` | MiniMax M3. |

The **Model Name or ID** field is free-text — you can also type any other model ID the gateway routes (OpenAI, Claude, Gemini, embedding models). Those route through external providers and incur Kimchi's external-provider surcharge on top of the provider's own token pricing.

Live catalog and per-1M-token pricing: <https://docs.kimchi.dev/docs/model-apis-pricing>

---

## Compatibility

| Component | Supported |
|---|---|
| n8n version | 1.x and 2.x community-node API |
| Node.js | 18+ recommended; 22 LTS tested |
| Hosting | Self-hosted (Docker, npm) and n8n Cloud (verified community nodes) |
| LangChain integration | Not included — see [Usage](#usage) |

This package is a single action node with zero runtime dependencies. It does **not** ship a LangChain chat-model sub-node — n8n Cloud forbids runtime dependencies in community packages, and a sub-node would need `@langchain/openai`. See [Usage](#usage) for the supported AI-agent pattern.

---

## Usage

### Send a chat completion and capture the answer

```
Manual Trigger → Kimchi (Message a Model)
```

Set **Prompt** to `Reply with the single word: pong`, **Model Name or ID** to `kimi-k3`, and run. The output item is:

```json
{
  "response": "pong",
  "model": "kimi-k3",
  "usage": { "completion_tokens": 44, "prompt_tokens": 92, "total_tokens": 136 },
  "raw": { /* full OpenAI-compatible response */ }
}
```

Downstream nodes can reference it via expressions like `{{ $json.response }}`.

### Loop over many prompts

```
Manual Trigger → your list source → Loop Over Items → Kimchi (Message a Model)
```

The node processes each input item independently and emits one output item per input. Use **Batch size** on Loop Over Items if you need to throttle requests.

### Use Kimchi as a tool for an AI Agent

n8n's **AI Agent** node picks up any node marked `usableAsTool: true` (this node qualifies) as a callable tool. Drop **Kimchi** into the agent's tool list and the agent decides when to call it.

To drive the agent's own model from Kimchi, use the built-in **OpenAI Chat Model** sub-node — it accepts arbitrary OpenAI-compatible base URLs. In the OpenAI Chat Model credential, set:

- **Base URL**: `https://llm.kimchi.dev/openai/v1`
- **API Key**: your Kimchi key
- **Model**: any Kimchi model ID from the dropdown above

That routes the AI Agent's reasoning through Kimchi with no extra packages required — supported by stock n8n.

### List the live model catalog inside a workflow

```
Manual Trigger → Kimchi (List Models) → IF / Switch / Set
```

`List Models` returns the raw gateway catalog in the node's output as `{ data: [{ id, object, owned_by, ... }] }`. Useful for gating downstream logic on whether a model is currently live.

---

## Build from source

```bash
git clone https://github.com/kunalcast/n8n-nodes-kimchi
cd n8n-kimchi
npm install
npm run lint
npm run build
```

Outputs land in `dist/`. The publish workflow (`.github/workflows/publish.yml`) runs lint + build + `npm publish --provenance` from GitHub Actions on every semver tag — the provenance attestation is what ties the npm tarball back to a specific commit for n8n verification.

To test against a live n8n locally:

```bash
docker run -d --name n8n \
  -p 5678:5678 \
  -v $(pwd):/home/node/.n8n/custom/node_modules/n8n-nodes-kimchi \
  n8nio/n8n:latest
```

---

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [Kimchi Inference documentation](https://docs.kimchi.dev/)
- [Model APIs and pricing](https://docs.kimchi.dev/docs/model-apis-pricing)
- [Cast AI console](https://console.cast.ai/)
- [Report an issue](https://github.com/kunalcast/n8n-nodes-kimchi/issues)

---

## Version history

### 0.1.0 — 2026-10-22

Initial release.

- `Kimchi` action node with **Message a Model** and **List Models** operations.
- `Kimchi Inference API` credential with unmetered `GET /models` connection test.
- `usableAsTool: true` for AI-agent tool use.
- Model dropdown populated against the live Kimchi catalog (8 native models) with free-text entry for external routing.
- Brand icon, MIT license, zero runtime dependencies.

---

## License

[MIT](https://github.com/kunalcast/n8n-nodes-kimchi/blob/main/LICENSE.md)

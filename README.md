# n8n-nodes-kimchi

n8n community node for [Kimchi Inference](https://docs.kimchi.dev/) by Cast AI — serverless access to open-weight LLMs via an OpenAI-compatible API.

Provides two nodes:

| Node | Type | Description |
|---|---|---|
| **Kimchi** | Action | Message a model (chat completion) or list models. `usableAsTool: true`, so AI agents can call it as a tool. |
| **Kimchi Chat Model** | AI sub-node | Supplies a LangChain `ai_languageModel` for n8n's AI Agent / chains, exactly like the built-in OpenAI Chat Model node. |

## Installation

### Community nodes (self-hosted or n8n Cloud)

In the n8n canvas open the nodes panel → search **Kimchi** → **More from the community** → **Install**.

Or via **Settings → Community nodes** → **Install a community node** → enter `n8n-nodes-kimchi`.

### Manual

```bash
npm install n8n-nodes-kimchi
# restart n8n
```

## Credentials

1. Create a Kimchi Inference API key (prefix `castai_v1_`) in the Cast AI console.
2. In n8n add **Kimchi Inference API** credentials:
   - **API Key** — your key
   - **Base URL** — defaults to `https://llm.kimchi.dev/openai/v1`; override if you use a private region or proxy
3. The credential test calls `GET /models`, which is unmetered.

## Models

Dropdown lists the Kimchi-native models (deployed by Cast AI, billed on the Kimchi tariff). The field is free-text — you can also type any model ID the gateway routes (e.g. `gpt-4o-mini`, `claude-haiku-4-5`); those carry Kimchi's external-provider surcharge.

| Kimchi-native model | Notes |
|---|---|
| `kimi-k3` | Reasoning model — needs `max_tokens ≥ ~200` or responses can come back empty |
| `kimi-k2.7` | |
| `nemotron-3-ultra-fp4` | |
| `deepseek-v4.1-flash` | |
| `deepseek-v4-flash` | |
| `deepseek-v4-flash-0731` | |
| `glm-5.2-fp8` | |
| `minimax-m3` | |

Live catalog and per-1M-token pricing: <https://docs.kimchi.dev/docs/model-apis-pricing>

## Operations

**Kimchi node**
- **Message a Model** — `POST /chat/completions`. Inputs: Model, Prompt, optional System Prompt. Options: Max Tokens (default 1024), Temperature.
- **List Models** — `GET /models`.

Output: `{ response, model, usage, raw }` (or the raw `data` array when listing models).

**Kimchi Chat Model node**
- Supplies `ai_languageModel` for AI Agent / Chain / Tool nodes. Options: Max Tokens, Temperature, Timeout, Max Retries.

## Compatibility

n8n with `n8n-workflow` peer API (1.x and 2.x community-node API). Node.js 18+.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [Kimchi Inference docs](https://docs.kimchi.dev/)

## License

MIT

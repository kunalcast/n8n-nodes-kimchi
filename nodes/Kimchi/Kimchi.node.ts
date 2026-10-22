import type {
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

export class Kimchi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Kimchi',
		name: 'kimchi',
		icon: { light: 'file:../../icons/kimchi.light.svg', dark: 'file:../../icons/kimchi.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description:
			'Chat completions on Kimchi Inference by Cast AI — serverless access to open-weight models via an OpenAI-compatible API',
		defaults: {
			name: 'Kimchi',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'kimchiApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Message a Model',
						value: 'messageModel',
						description: 'Send a chat completion request to a Kimchi model',
						action: 'Message a model',
					},
					{
						name: 'List Models',
						value: 'listModels',
						description: 'List the models available via Kimchi Inference',
						action: 'List models',
					},
				],
				default: 'messageModel',
			},
			{
				displayName: 'Model Name or ID',
				name: 'model',
				type: 'options',
				required: true,
				default: 'kimi-k3',
				displayOptions: {
					show: {
						operation: ['messageModel'],
					},
				},
				typeOptions: {
					allowCustomValue: true,
				},
				options: [
					{ name: 'DeepSeek V4 Flash', value: 'deepseek-v4-flash' },
					{ name: 'DeepSeek V4 Flash 0731', value: 'deepseek-v4-flash-0731' },
					{ name: 'DeepSeek V4.1 Flash', value: 'deepseek-v4.1-flash' },
					{ name: 'GLM 5.2 FP8', value: 'glm-5.2-fp8' },
					{ name: 'Kimi K2.7', value: 'kimi-k2.7' },
					{ name: 'Kimi K3 (Reasoning)', value: 'kimi-k3' },
					{ name: 'MiniMax M3', value: 'minimax-m3' },
					{ name: 'Nemotron 3 Ultra FP4', value: 'nemotron-3-ultra-fp4' },
				],
				description:
					'Kimchi-native model to use. You can also type an external provider model ID (routed via Kimchi at the external-provider surcharge). See <a href="https://docs.kimchi.dev/docs/model-apis-pricing">model APIs and pricing</a>.',
			},
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				required: true,
				default: '',
				typeOptions: {
					rows: 4,
				},
				displayOptions: {
					show: {
						operation: ['messageModel'],
					},
				},
				description: 'The user message to send to the model',
			},
			{
				displayName: 'System Prompt',
				name: 'systemPrompt',
				type: 'string',
				default: '',
				typeOptions: {
					rows: 3,
				},
				displayOptions: {
					show: {
						operation: ['messageModel'],
					},
				},
				description: 'Optional system message prepended to the conversation',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						operation: ['messageModel'],
					},
				},
				options: [
					{
						displayName: 'Max Tokens',
						name: 'maxTokens',
						type: 'number',
						default: 1024,
						typeOptions: {
							minValue: 16,
							maxValue: 128000,
						},
						description:
							'Maximum tokens to generate. Reasoning models (Kimi K3) need headroom — outputs can come back empty below ~200.',
					},
					{
						displayName: 'Temperature',
						name: 'temperature',
						type: 'number',
						default: 1,
						typeOptions: {
							minValue: 0,
							maxValue: 2,
							numberPrecision: 2,
						},
						description: 'Sampling temperature, between 0 and 2',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				const credentials = (await this.getCredentials('kimchiApi', i)) as {
					baseUrl?: string;
				};
				const baseUrl = (credentials.baseUrl || 'https://llm.kimchi.dev/openai/v1').replace(
					/\/+$/,
					'',
				);

				if (operation === 'listModels') {
					const response = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'kimchiApi',
						{
							method: 'GET' as IHttpRequestMethods,
							url: `${baseUrl}/models`,
							headers: { 'Content-Type': 'application/json' },
							json: true,
						} as IHttpRequestOptions,
					);
					returnData.push({
						json: response as INodeExecutionData['json'],
						pairedItem: { item: i },
					});
					continue;
				}

				const model = this.getNodeParameter('model', i) as string;
				const prompt = this.getNodeParameter('prompt', i) as string;
				const systemPrompt = this.getNodeParameter('systemPrompt', i, '') as string;
				const options = this.getNodeParameter('options', i, {}) as {
					maxTokens?: number;
					temperature?: number;
				};

				const messages: Array<{ role: string; content: string }> = [];
				if (systemPrompt) {
					messages.push({ role: 'system', content: systemPrompt });
				}
				messages.push({ role: 'user', content: prompt });

				const body: Record<string, unknown> = {
					model,
					messages,
				};
				if (options.maxTokens) {
					body.max_tokens = options.maxTokens;
				}
				if (options.temperature !== undefined) {
					body.temperature = options.temperature;
				}

				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'kimchiApi',
					{
						method: 'POST' as IHttpRequestMethods,
						url: `${baseUrl}/chat/completions`,
						headers: { 'Content-Type': 'application/json' },
						body,
						json: true,
					} as IHttpRequestOptions,
				)) as {
					choices?: Array<{ message?: { content?: string } }>;
					usage?: Record<string, unknown>;
					model?: string;
				};

				const content = response.choices?.[0]?.message?.content ?? '';

				returnData.push({
					json: {
						response: content,
						model: response.model ?? model,
						usage: (response.usage ?? {}) as Record<string, unknown>,
						raw: response as unknown as Record<string, unknown>,
					} as INodeExecutionData['json'],
					pairedItem: { item: i },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				if ((error as NodeApiError).httpCode) {
					throw new NodeApiError(this.getNode(), error as never, { itemIndex: i });
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}

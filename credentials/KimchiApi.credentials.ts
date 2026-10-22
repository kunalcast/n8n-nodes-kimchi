import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class KimchiApi implements ICredentialType {
	name = 'kimchiApi';

	displayName = 'Kimchi Inference API';

	icon = { light: 'file:../icons/kimchi.light.svg', dark: 'file:../icons/kimchi.dark.svg' } as const;

	documentationUrl = 'https://docs.kimchi.dev/docs/model-apis-pricing';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Your Kimchi Inference API key (starts with "castai_v1_"). Create one in the Cast AI console.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://llm.kimchi.dev/openai/v1',
			description: 'The Kimchi Inference OpenAI-compatible API base URL',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/models',
			method: 'GET',
		},
	};
}

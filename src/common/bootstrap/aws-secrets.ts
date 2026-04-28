import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';

type SecretValue = string | number | boolean | null;
type SecretMap = Record<string, SecretValue>;

let bootstrapPromise: Promise<void> | null = null;

function toBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  return value.toLowerCase() === 'true';
}

function parseSecretPayload(secretString: string): SecretMap {
  const parsed = JSON.parse(secretString) as unknown;

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('AWS secret payload must be a JSON object');
  }

  return parsed as SecretMap;
}

function injectSecretValues(values: SecretMap): void {
  Object.entries(values).forEach(([key, rawValue]) => {
    if (rawValue === null || rawValue === undefined) {
      return;
    }

    if (process.env[key] !== undefined) {
      return;
    }

    process.env[key] = String(rawValue);
  });
}

async function loadSecretsIntoEnv(): Promise<void> {
  const enabled = toBoolean(process.env.AWS_SECRETS_ENABLED, true);
  if (!enabled) {
    return;
  }

  const secretId = process.env.AWS_SECRET_NAME || process.env.AWS_SECRET_ID;
  if (!secretId) {
    return;
  }

  const region = process.env.AWS_REGION;
  if (!region) {
    throw new Error('AWS_REGION must be set to load AWS secrets');
  }

  const client = new SecretsManagerClient({ region });
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretId }),
  );

  if (!response.SecretString) {
    throw new Error(`Secret ${secretId} did not return SecretString`);
  }

  const values = parseSecretPayload(response.SecretString);
  injectSecretValues(values);
}

export async function bootstrapEnvFromAwsSecrets(): Promise<void> {
  bootstrapPromise ??= loadSecretsIntoEnv().catch((error: unknown) => {
    console.error(
      'AWS secrets bootstrap failed; continuing with existing env',
      error,
    );
  });

  return bootstrapPromise;
}

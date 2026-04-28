import app from './app';
import dotenv from 'dotenv';

dotenv.config();
import { bootstrapEnvFromAwsSecrets } from './src/common/bootstrap/aws-secrets';

async function start(): Promise<void> {
  await bootstrapEnvFromAwsSecrets();

  const port = Number(process.env.PORT || 3000);

  app.listen(port, () => {
    console.log(`API running at http://localhost:${port}`);
  });
}

start().catch((error: unknown) => {
  console.error('Failed to bootstrap app server', error);
  process.exit(1);
});

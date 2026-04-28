module.exports = {
  apps: [
    {
      name: 'web-api-landing-rate',
      script: 'dist/server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3002,
        AWS_SECRETS_ENABLED: 'true',
        AWS_SECRET_NAME: 'coastng-web-landing-BE-secrets-prod',
        AWS_REGION: 'us-west-2',
      },
    },
  ],
};

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
      },
    },
  ],
};

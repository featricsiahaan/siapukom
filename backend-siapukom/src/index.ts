import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`SiapUKOM API berjalan di port ${env.port} (${env.nodeEnv})`);
});

async function shutdown(signal: string) {
  console.log(`Menerima ${signal}, mematikan server dengan aman...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

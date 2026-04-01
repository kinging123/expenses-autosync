import Fastify, { type FastifyInstance } from 'fastify';
import { SyncEngine } from '../../../core/SyncEngine';
import pino from 'pino';

const logger = pino({ name: 'WebhookServer' });

export class WebhookServer {
  private fastify: FastifyInstance;

  constructor(private syncEngine: SyncEngine) {
    this.fastify = Fastify({ logger: false });
    this.setupRoutes();
  }

  private setupRoutes() {
    this.fastify.get('/health', async () => {
      return { status: 'ok' };
    });

    // Sub-routers for specific integrations could be registered here
    // Example: this.fastify.register(splitwiseWebhookRoutes(this.syncEngine), { prefix: '/webhooks/splitwise' });
  }

  async start(port: number) {
    try {
      await this.fastify.listen({ port, host: '0.0.0.0' });
      logger.info(`Webhook Server listening on port ${port}`);
    } catch (err) {
      logger.error(err, 'Failed to start Webhook Server');
      process.exit(1);
    }
  }
}

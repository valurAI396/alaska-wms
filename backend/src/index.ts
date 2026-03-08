import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import dotenv from 'dotenv';
import { authRoutes } from './routes/auth';
import { shopifyRoutes } from './routes/shopify';
import { webhookRoutes } from './routes/webhooks';
import { inventoryRoutes } from './routes/inventory';
import { returnsRoutes } from './routes/returns';
import { posRoutes } from './routes/pos';
import { dashboardRoutes } from './routes/dashboard';
import { setupMiraklScheduler } from './jobs/mirakl-sync';

dotenv.config();

const fastify = Fastify({
    logger: true,
});

fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

fastify.register(cors);
fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'super-secret-dev-key',
});

// JWT Protection hook
fastify.addHook('preHandler', async (request, reply) => {
    if (request.url.startsWith('/api/v1/auth') || request.url.startsWith('/api/v1/webhooks')) {
        return;
    }
    try {
        await request.jwtVerify();
    } catch (err) {
        reply.send(err);
    }
});

// Register routes
fastify.register(authRoutes, { prefix: '/api/v1/auth' });
fastify.register(shopifyRoutes, { prefix: '/api/v1' });
fastify.register(webhookRoutes, { prefix: '/api/v1/webhooks' });
fastify.register(inventoryRoutes, { prefix: '/api/v1' });
fastify.register(returnsRoutes, { prefix: '/api/v1' });
fastify.register(posRoutes, { prefix: '/api/v1' });
fastify.register(dashboardRoutes, { prefix: '/api/v1' });

// Health check
fastify.get('/api/v1/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
});

const start = async () => {
    try {
        const port = Number(process.env.PORT) || 3000;
        await fastify.listen({ port, host: '0.0.0.0' });
        console.log(`Server listening on port ${port}`);

        // Start background jobs
        setupMiraklScheduler().catch(err => console.error('Failed to start Mirakl scheduler:', err));
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';

export async function authRoutes(fastify: FastifyInstance) {
    fastify.post('/login', {
        schema: {
            body: z.object({
                email: z.string().email(),
                password: z.string(),
            }),
        },
    }, async (request, reply) => {
        const { email, password } = request.body as any;

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return reply.status(401).send({ message: 'Invalid credentials' });
        }

        const token = fastify.jwt.sign({
            sub: user.id,
            role: user.role,
            name: user.name
        }, { expiresIn: '1d' });

        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        };
    });

    fastify.post('/logout', async (request, reply) => {
        // In a simple JWT setup, logout is handled by client discarding the token.
        // We can add blacklisting here in the future if needed.
        return { message: 'Logged out' };
    });

    fastify.post('/refresh', async (request, reply) => {
        // Refresh token logic would go here.
        return { message: 'Refresh not yet implemented' };
    });
}

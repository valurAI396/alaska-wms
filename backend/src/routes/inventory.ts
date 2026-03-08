import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { Shopify } from '../lib/shopify';

export async function inventoryRoutes(fastify: FastifyInstance) {
    fastify.get('/products', async (request, reply) => {
        const products = await prisma.product.findMany({
            include: {
                inventory: true,
            },
            orderBy: { name: 'asc' },
        });
        return products;
    });

    fastify.get('/inventory/movements', async (request, reply) => {
        const movements = await prisma.inventoryMovement.findMany({
            include: {
                product: { select: { name: true, sku: true } },
                user: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 100, // Limit for performance, add pagination later
        });
        return movements;
    });

    fastify.post('/inventory/adjust', {
        schema: {
            body: z.object({
                sku: z.string(),
                quantityChange: z.number(), // positive for entry, negative for exit
                reason: z.string().min(3),
            }),
        },
    }, async (request, reply) => {
        const { sku, quantityChange, reason } = request.body as any;
        const userId = (request.user as any)?.sub || 'system';

        try {
            const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
                const product = await tx.product.findUnique({
                    where: { sku },
                    include: { inventory: true },
                });

                if (!product || !product.inventory) {
                    throw new Error('Produto não encontrado ou sem inventário inicial');
                }

                const stockBefore = product.inventory.quantity;
                const stockAfter = stockBefore + quantityChange;

                if (stockAfter < 0) {
                    throw new Error('O stock não pode ser negativo');
                }

                // Update local inventory
                const updatedInventory = await tx.inventory.update({
                    where: { id: product.inventory.id },
                    data: { quantity: stockAfter },
                });

                // Log movement
                await tx.inventoryMovement.create({
                    data: {
                        productId: product.id,
                        type: 'ajuste',
                        quantityChange,
                        stockBefore,
                        stockAfter,
                        userId,
                        note: reason,
                    },
                });

                // Sync with Shopify if mapped
                if (product.inventory.shopifyInventoryItemId) {
                    await Shopify.updateInventory(product.inventory.shopifyInventoryItemId, stockAfter);
                }

                return updatedInventory;
            });

            return result;
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });
}

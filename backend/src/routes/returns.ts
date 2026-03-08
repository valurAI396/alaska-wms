import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { Shopify } from '../lib/shopify';
import { Prisma } from '@prisma/client';

export async function returnsRoutes(fastify: FastifyInstance) {
    // Get order by Shopify ID for the scanner
    fastify.get('/orders/by-shopify/:shopifyId', async (request, reply) => {
        const { shopifyId } = request.params as { shopifyId: string };

        const order = await prisma.order.findUnique({
            where: { shopifyOrderId: shopifyId },
            include: {
                items: {
                    include: {
                        product: {
                            include: { inventory: true }
                        }
                    }
                }
            }
        });

        if (!order) {
            return reply.status(404).send({ error: 'Encomenda não encontrada' });
        }

        return order;
    });

    // Process a return
    fastify.post('/returns', {
        schema: {
            body: z.object({
                shopifyOrderId: z.string(),
                items: z.array(z.object({
                    sku: z.string(),
                    quantity: z.number().min(1),
                })),
                reason: z.string(),
                source: z.enum(['shopify', 'decathlon', 'pos']),
            })
        }
    }, async (request, reply) => {
        const { shopifyOrderId, items, reason, source } = request.body as any;
        const userId = (request.user as any)?.sub || 'system';

        try {
            const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
                // 1. Create the Return record
                const returnRecord = await tx.return.create({
                    data: {
                        shopifyOrderId,
                        source,
                        reason,
                        status: 'processed',
                        items: {
                            create: items.map((item: any) => ({
                                sku: item.sku,
                                quantity: item.quantity,
                            }))
                        }
                    }
                });

                // 2. Process each item (Update Stock + Log Movement + Sync Shopify)
                for (const item of items) {
                    const product = await tx.product.findUnique({
                        where: { sku: item.sku },
                        include: { inventory: true }
                    });

                    if (!product || !product.inventory) {
                        throw new Error(`Produto ${item.sku} não encontrado`);
                    }

                    const stockBefore = product.inventory.quantity;
                    const stockAfter = stockBefore + item.quantity;

                    // Update local inventory
                    await tx.inventory.update({
                        where: { id: product.inventory.id },
                        data: { quantity: stockAfter }
                    });

                    // Log inventory movement
                    await tx.inventoryMovement.create({
                        data: {
                            productId: product.id,
                            type: 'devolucao',
                            quantityChange: item.quantity,
                            stockBefore,
                            stockAfter,
                            userId,
                            note: `Retorno de ${source}: ${reason}`
                        }
                    });

                    // Sync back to Shopify
                    if (product.inventory.shopifyInventoryItemId) {
                        await Shopify.updateInventory(product.inventory.shopifyInventoryItemId, stockAfter);
                    }
                }

                return returnRecord;
            });

            return result;
        } catch (error: any) {
            fastify.log.error(error);
            return reply.status(400).send({ error: error.message });
        }
    });

    // List all returns
    fastify.get('/returns', async (request, reply) => {
        const returns = await prisma.return.findMany({
            include: {
                items: true
            },
            orderBy: { createdAt: 'desc' }
        });
        return returns;
    });
}

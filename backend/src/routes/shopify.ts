import { FastifyInstance } from 'fastify';
import { Shopify } from '../lib/shopify';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export async function shopifyRoutes(fastify: FastifyInstance) {
    fastify.post('/inventory/sync-shopify', async (request, reply) => {
        try {
            const products = await Shopify.fetchProducts();

            const syncResults = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
                let created = 0;
                let updated = 0;

                for (const p of products) {
                    for (const v of p.variants) {
                        if (!v.sku) continue;

                        const product = await tx.product.upsert({
                            where: { sku: v.sku },
                            update: {
                                name: p.title + (v.title !== 'Default Title' ? ` - ${v.title}` : ''),
                                price: Math.round(parseFloat(v.price) * 100),
                                shopifyProductId: String(p.id),
                                shopifyVariantId: String(v.id),
                            },
                            create: {
                                sku: v.sku,
                                name: p.title + (v.title !== 'Default Title' ? ` - ${v.title}` : ''),
                                price: Math.round(parseFloat(v.price) * 100),
                                shopifyProductId: String(p.id),
                                shopifyVariantId: String(v.id),
                                category: p.product_type || 'Geral',
                            },
                        });

                        await tx.inventory.upsert({
                            where: { productId: product.id },
                            update: {
                                shopifyInventoryItemId: String(v.inventory_item_id),
                                // We don't overwrite quantity from Shopify unless we want it to be the truth
                                // For the initial sync, it's probably better to take it if it fits.
                            },
                            create: {
                                productId: product.id,
                                quantity: v.inventory_quantity || 0,
                                shopifyInventoryItemId: String(v.inventory_item_id),
                            },
                        });

                        created++;
                    }
                }
                return { created, updated };
            });

            return { success: true, ...syncResults };
        } catch (error: any) {
            return reply.status(500).send({ error: error.message });
        }
    });

    fastify.post('/orders/sync-shopify', async (request, reply) => {
        try {
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            const sinceDate = ninetyDaysAgo.toISOString();

            const orders = await Shopify.fetchOrders(sinceDate);

            let synced = 0;
            for (const o of orders) {
                // Check if already exists
                const existing = await prisma.order.findUnique({
                    where: { shopifyOrderId: String(o.id) },
                });

                if (existing) continue;

                await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
                    const order = await tx.order.create({
                        data: {
                            shopifyOrderId: String(o.id),
                            channel: 'shopify',
                            customerName: o.customer ? `${o.customer.first_name} ${o.customer.last_name}` : 'Unknown',
                            customerEmail: o.contact_email || o.customer?.email,
                            status: o.fulfillment_status || 'paid',
                            totalPrice: Math.round(parseFloat(o.total_price) * 100),
                            shopifyRaw: o,
                            createdAt: new Date(o.created_at),
                        },
                    });

                    for (const item of o.line_items) {
                        const product = await tx.product.findUnique({
                            where: { sku: item.sku },
                        });

                        if (product) {
                            await tx.orderItem.create({
                                data: {
                                    orderId: order.id,
                                    productId: product.id,
                                    sku: item.sku,
                                    name: item.name,
                                    quantity: item.quantity,
                                    unitPrice: Math.round(parseFloat(item.price) * 100),
                                },
                            });
                        }
                    }
                    synced++;
                });
            }

            return { success: true, synced };
        } catch (error: any) {
            return reply.status(500).send({ error: error.message });
        }
    });
}

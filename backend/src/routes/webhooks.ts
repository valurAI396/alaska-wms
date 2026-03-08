import { FastifyInstance } from 'fastify';
import { Shopify } from '../lib/shopify';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import qrcode from 'qrcode';

export async function webhookRoutes(fastify: FastifyInstance) {
    // Use rawBody for HMAC verification
    fastify.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
        try {
            const json = JSON.parse(body as string);
            (req as any).rawBody = body;
            done(null, json);
        } catch (err: any) {
            err.statusCode = 400;
            done(err, undefined);
        }
    });

    fastify.post('/shopify', async (request, reply) => {
        const hmac = request.headers['x-shopify-hmac-sha256'] as string;
        const topic = request.headers['x-shopify-topic'] as string;
        const webhookId = request.headers['x-shopify-webhook-id'] as string;
        const body = (request as any).rawBody;

        if (!Shopify.verifyWebhook(body, hmac)) {
            fastify.log.warn('Webhook HMAC verification failed');
            return reply.status(401).send({ error: 'Unauthorized' });
        }

        // Idempotency check 
        // In a real app, we'd have a processed_webhooks table.
        // For now, let's just log and process.

        const payload = JSON.parse(body);

        try {
            switch (topic) {
                case 'orders/paid':
                    await handleOrderPaid(payload);
                    break;
                case 'orders/cancelled':
                    await handleOrderCancelled(payload);
                    break;
                case 'orders/fulfilled':
                    await handleOrderFulfilled(payload);
                    break;
                case 'refunds/create':
                    await handleRefundCreated(payload);
                    break;
                default:
                    fastify.log.info(`Unhandled webhook topic: ${topic}`);
            }
        } catch (error) {
            fastify.log.error(`Error processing webhook ${topic}: ${error instanceof Error ? error.message : String(error)}`);
            // We return 200 even on error to stop Shopify retries if it's a logic error,
            // but in production we might want to return 500 for temporary failures.
        }

        return { received: true };
    });
}

async function handleOrderPaid(payload: any) {
    const { line_items, name, contact_email, id, total_price, customer } = payload;

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // 1. Create Order record
        const order = await tx.order.create({
            data: {
                shopifyOrderId: String(id),
                channel: 'shopify',
                customerName: customer ? `${customer.first_name} ${customer.last_name}` : 'Unknown',
                customerEmail: contact_email || customer?.email,
                status: 'paid',
                totalPrice: Math.round(parseFloat(total_price) * 100),
                shopifyRaw: payload,
            },
        });

        // Generate QR Code
        const qrData = `SHP-${id}`;
        const qrCodeBase64 = await qrcode.toDataURL(qrData);
        await tx.order.update({
            where: { id: order.id },
            data: { qrCode: qrCodeBase64 },
        });

        for (const item of line_items) {
            const product = await tx.product.findUnique({
                where: { sku: item.sku },
            });

            if (!product) continue;

            // 2. Increment reserved_quantity
            const inventory = await tx.inventory.findUnique({
                where: { productId: product.id },
            });

            if (inventory) {
                const stockBefore = inventory.quantity;
                await tx.inventory.update({
                    where: { id: inventory.id },
                    data: {
                        reservedQuantity: { increment: item.quantity },
                    },
                });

                // 3. Log saida movement (as reserved)
                await tx.inventoryMovement.create({
                    data: {
                        productId: product.id,
                        orderId: order.id,
                        type: 'saida',
                        quantityChange: -item.quantity,
                        stockBefore: stockBefore,
                        stockAfter: stockBefore, // Physically still here
                        userId: 'system', // or a dedicated system user
                        note: `Reserva para encomenda Shopify ${name}`,
                    },
                });
            }

            // Create Order Items
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
    });
}

async function handleOrderCancelled(payload: any) {
    const { id, line_items } = payload;

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const order = await tx.order.findUnique({
            where: { shopifyOrderId: String(id) },
            include: { items: true },
        });

        if (!order) return;

        await tx.order.update({
            where: { id: order.id },
            data: { status: 'cancelled' },
        });

        for (const item of order.items) {
            const inventory = await tx.inventory.findUnique({
                where: { productId: item.productId },
            });

            if (inventory) {
                // Release reserved stock
                await tx.inventory.update({
                    where: { id: inventory.id },
                    data: {
                        reservedQuantity: { decrement: item.quantity },
                    },
                });

                // Log entrada
                await tx.inventoryMovement.create({
                    data: {
                        productId: item.productId,
                        orderId: order.id,
                        type: 'entrada',
                        quantityChange: item.quantity,
                        stockBefore: inventory.quantity,
                        stockAfter: inventory.quantity,
                        userId: 'system',
                        note: `Cancelamento de encomenda Shopify ${id}`,
                    },
                });
            }
        }
    });
}

async function handleOrderFulfilled(payload: any) {
    const { id } = payload;

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const order = await tx.order.findUnique({
            where: { shopifyOrderId: String(id) },
            include: { items: true },
        });

        if (!order) return;

        await tx.order.update({
            where: { id: order.id },
            data: { status: 'fulfilled' },
        });

        for (const item of order.items) {
            const inventory = await tx.inventory.findUnique({
                where: { productId: item.productId },
            });

            if (inventory) {
                const stockBefore = inventory.quantity;
                const newQty = inventory.quantity - item.quantity;

                // Deduct from total quantity and reserved
                await tx.inventory.update({
                    where: { id: inventory.id },
                    data: {
                        quantity: newQty,
                        reservedQuantity: { decrement: item.quantity },
                    },
                });

                // We already logged the saida on 'paid'. 
                // Here we could update the stock_after for tracing purposes.
            }
        }
    });
}

async function handleRefundCreated(payload: any) {
    const { order_id, refund_line_items } = payload;

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const order = await tx.order.findUnique({
            where: { shopifyOrderId: String(order_id) },
        });

        if (!order) return;

        for (const rli of refund_line_items) {
            const { line_item, quantity } = rli;

            const product = await tx.product.findUnique({
                where: { sku: line_item.sku },
            });

            if (product) {
                const inventory = await tx.inventory.findUnique({
                    where: { productId: product.id },
                });

                if (inventory) {
                    const stockBefore = inventory.quantity;
                    const newQty = stockBefore + quantity;

                    await tx.inventory.update({
                        where: { id: inventory.id },
                        data: { quantity: newQty },
                    });

                    // Log devolucao
                    await tx.inventoryMovement.create({
                        data: {
                            productId: product.id,
                            orderId: order.id,
                            type: 'devolucao',
                            quantityChange: quantity,
                            stockBefore: stockBefore,
                            stockAfter: newQty,
                            userId: 'system',
                            note: `Reembolso Shopify processado`,
                        },
                    });

                    // Sync back to Shopify
                    if (inventory.shopifyInventoryItemId) {
                        await Shopify.updateInventory(inventory.shopifyInventoryItemId, newQty);
                    }
                }
            }
        }
    });
}

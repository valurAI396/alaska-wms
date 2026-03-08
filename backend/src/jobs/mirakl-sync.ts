import { Worker, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { Mirakl } from '../lib/mirakl';
import { prisma } from '../lib/prisma';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

export const miraklQueue = new Queue('mirakl-sync', { connection: connection as any });

export const miraklWorker = new Worker('mirakl-sync', async (job) => {
    console.log('Starting Mirakl sync job...');

    try {
        const miraklReturns = await Mirakl.fetchReturns();
        console.log(`Found ${miraklReturns.length} returns on Mirakl.`);

        for (const mReturn of miraklReturns) {
            // Check if already exists in our DB
            const existing = await prisma.return.findFirst({
                where: { shopifyOrderId: mReturn.order_id, source: 'decathlon' }
            });

            if (!existing) {
                await prisma.return.create({
                    data: {
                        shopifyOrderId: mReturn.order_id, // Decathlon orders are synced to Shopify first
                        source: 'decathlon',
                        reason: mReturn.reason_label || 'Retorno Decathlon',
                        status: 'pending',
                        items: {
                            create: mReturn.order_lines.map((line: any) => ({
                                sku: line.offer_sku,
                                quantity: line.quantity,
                            }))
                        }
                    }
                });
                console.log(`Created pending return for Decathlon order ${mReturn.order_id}`);
            }
        }
    } catch (err) {
        console.error('Mirakl Sync Job Failed:', err);
        throw err;
    }
}, { connection: connection as any });

// Schedule the job to run every 30 minutes
export async function setupMiraklScheduler() {
    await miraklQueue.add('poll-mirakl', {}, {
        repeat: {
            every: 30 * 60 * 1000 // 30 minutes
        }
    });
    console.log('Mirakl sync scheduler started.');
}

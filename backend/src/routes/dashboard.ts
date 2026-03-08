import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { startOfDay } from 'date-fns';

export async function dashboardRoutes(fastify: FastifyInstance) {
    fastify.get('/dashboard/stats', async (request, reply) => {
        try {
            const today = startOfDay(new Date());

            // 1. Total SKUs
            const totalSkus = await prisma.product.count();

            // 2. Units in Stock
            const stockAggregation = await prisma.inventory.aggregate({
                _sum: { quantity: true }
            });
            const unitsInStock = stockAggregation._sum.quantity || 0;

            // 3. Low Stock Alerts (threshold < 10 for simplicity)
            const lowStockAlerts = await prisma.product.count({
                where: {
                    inventory: {
                        quantity: { lt: 10 }
                    }
                }
            });

            // 4. POS Sales Today
            const posAggregation = await prisma.posSale.aggregate({
                where: {
                    createdAt: { gte: today }
                },
                _sum: { totalAmount: true }
            });
            const posSalesToday = posAggregation._sum.totalAmount || 0;

            // 5. Monthly Sales Trend (Last 7 days)
            const last7Days = Array.from({ length: 7 }).map((_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - (6 - i));
                return startOfDay(date);
            });

            const salesTrend = await Promise.all(last7Days.map(async (day) => {
                const limit = new Date(day);
                limit.setDate(limit.getDate() + 1);

                const aggregation = await prisma.posSale.aggregate({
                    where: {
                        createdAt: { gte: day, lt: limit }
                    },
                    _sum: { totalAmount: true }
                });
                return {
                    date: day.toISOString(),
                    total: aggregation._sum.totalAmount || 0
                };
            }));

            return {
                totalSkus,
                unitsInStock,
                lowStockAlerts,
                posSalesToday,
                salesTrend
            };
        } catch (error: any) {
            fastify.log.error(error);
            return reply.status(500).send({ error: 'Erro ao carregar estatísticas' });
        }
    });
}

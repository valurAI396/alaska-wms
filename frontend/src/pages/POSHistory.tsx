import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { ShoppingCart, CreditCard, Banknote, Smartphone } from 'lucide-react';

interface PosSale {
    id: string;
    totalAmount: number;
    paymentMethod: string;
    createdAt: string;
    user: { name: string };
    items: { sku: string; quantity: number; price: number }[];
}

export default function POSHistory() {
    const { data: sales, isLoading } = useQuery<PosSale[]>({
        queryKey: ['pos-sales'],
        queryFn: async () => {
            const { data } = await axios.get('/api/v1/pos/sales', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            return data;
        }
    });

    const getMethodIcon = (method: string) => {
        switch (method) {
            case 'card': return CreditCard;
            case 'cash': return Banknote;
            case 'mbway': return Smartphone;
            default: return ShoppingCart;
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-xl font-semibold">Histórico de Vendas POS</h1>

            <div className="card overflow-hidden !p-0">
                <table className="w-full text-left">
                    <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
                        <tr>
                            <th className="px-6 py-3 font-medium">Data</th>
                            <th className="px-6 py-3 font-medium">Venda ID</th>
                            <th className="px-6 py-3 font-medium">Operador</th>
                            <th className="px-6 py-3 font-medium">Método</th>
                            <th className="px-6 py-3 font-medium">Itens</th>
                            <th className="px-6 py-3 font-medium text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {isLoading ? (
                            <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">A carregar vendas...</td></tr>
                        ) : sales?.map((sale) => {
                            const Icon = getMethodIcon(sale.paymentMethod);
                            return (
                                <tr key={sale.id} className="hover:bg-white/[0.01]">
                                    <td className="px-6 py-4 text-xs font-mono">
                                        {format(new Date(sale.createdAt), "dd MMM HH:mm", { locale: pt })}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-bold text-primary">#{sale.id.slice(-6).toUpperCase()}</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm">{sale.user.name}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Icon className="w-3.5 h-3.5" />
                                            <span className="text-[10px] uppercase font-bold">{sale.paymentMethod}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs">
                                            {sale.items.length} artigo(s)
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-success">
                                        €{sale.totalAmount.toFixed(2)}
                                    </td>
                                </tr>
                            );
                        })}
                        {!isLoading && sales?.length === 0 && (
                            <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground italic">Nenhuma venda POS registada hoje.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

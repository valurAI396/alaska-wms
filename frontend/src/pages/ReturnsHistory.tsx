import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { RotateCcw } from 'lucide-react';

interface ReturnItem {
    sku: string;
    quantity: number;
}

interface Return {
    id: string;
    shopifyOrderId: string;
    source: string;
    reason: string;
    status: string;
    createdAt: string;
    items: ReturnItem[];
}

export default function ReturnsHistory() {
    const { data: returns, isLoading } = useQuery<Return[]>({
        queryKey: ['returns'],
        queryFn: async () => {
            const { data } = await axios.get('/api/v1/returns', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            return data;
        }
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-xl font-semibold">Histórico de Retornos</h1>
            </div>

            <div className="card overflow-hidden !p-0">
                <table className="w-full text-left">
                    <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
                        <tr>
                            <th className="px-6 py-3 font-medium">Data</th>
                            <th className="px-6 py-3 font-medium">Encomenda</th>
                            <th className="px-6 py-3 font-medium">Origem</th>
                            <th className="px-6 py-3 font-medium">Itens</th>
                            <th className="px-6 py-3 font-medium">Razão</th>
                            <th className="px-6 py-3 font-medium">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {isLoading ? (
                            <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">A carregar retornos...</td></tr>
                        ) : returns?.map((r) => (
                            <tr key={r.id} className="hover:bg-white/[0.01]">
                                <td className="px-6 py-4 text-xs font-mono text-muted-foreground">
                                    {format(new Date(r.createdAt), "dd MMM yyyy HH:mm", { locale: pt })}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-sm font-bold text-primary italic">#{r.shopifyOrderId}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${r.source === 'mirakl' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-primary/10 text-primary border-primary/20'
                                        }`}>
                                        {r.source}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="space-y-1">
                                        {r.items.map((item, idx) => (
                                            <div key={idx} className="text-xs">
                                                <span className="font-bold">{item.quantity}x</span> <span className="text-muted-foreground">{item.sku}</span>
                                            </div>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm italic text-muted-foreground">{r.reason}</td>
                                <td className="px-6 py-4">
                                    <span className={`bg-success/10 text-success border border-success/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase`}>
                                        {r.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {!isLoading && returns?.length === 0 && (
                            <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground italic">Nenhum retorno processado até ao momento.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

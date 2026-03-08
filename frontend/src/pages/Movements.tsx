import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface Movement {
    id: string;
    type: 'entrada' | 'saida' | 'devolucao' | 'ajuste' | 'pos';
    quantityChange: number;
    stockBefore: number;
    stockAfter: number;
    note: string;
    createdAt: string;
    product: { name: string; sku: string };
    user: { name: string };
}

export default function Movements() {
    const { data: movements, isLoading } = useQuery<Movement[]>({
        queryKey: ['movements'],
        queryFn: async () => {
            const { data } = await axios.get('/api/v1/inventory/movements', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            return data;
        }
    });

    const getTypeStyle = (type: string) => {
        switch (type) {
            case 'entrada': return 'bg-success/10 text-success border-success/20';
            case 'devolucao': return 'bg-primary/10 text-primary border-primary/20';
            case 'saida': case 'pos': return 'bg-danger/10 text-danger border-danger/20';
            case 'ajuste': return 'bg-warning/10 text-warning border-warning/20';
            default: return 'bg-muted/10 text-muted border-muted/20';
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-xl font-semibold">Histórico de Movimentos</h1>

            <div className="card overflow-hidden !p-0">
                <table className="w-full text-left">
                    <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
                        <tr>
                            <th className="px-6 py-3 font-medium">Data</th>
                            <th className="px-6 py-3 font-medium">Tipo</th>
                            <th className="px-6 py-3 font-medium">Produto</th>
                            <th className="px-6 py-3 font-medium">Mudança</th>
                            <th className="px-6 py-3 font-medium">Operador</th>
                            <th className="px-6 py-3 font-medium">Nota</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {isLoading ? (
                            <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">A carregar movimentos...</td></tr>
                        ) : movements?.map((m) => (
                            <tr key={m.id} className="hover:bg-white/[0.01]">
                                <td className="px-6 py-4 text-xs">
                                    {format(new Date(m.createdAt), "dd MMM yyyy HH:mm", { locale: pt })}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${getTypeStyle(m.type)}`}>
                                        {m.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium">{m.product.name}</span>
                                        <span className="text-[10px] font-mono text-muted-foreground">{m.product.sku}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-mono text-sm">
                                    <span className={m.quantityChange > 0 ? 'text-success' : 'text-danger'}>
                                        {m.quantityChange > 0 ? '+' : ''}{m.quantityChange}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm">{m.user.name}</td>
                                <td className="px-6 py-4 text-sm text-muted-foreground italic truncate max-w-xs" title={m.note}>
                                    {m.note || '---'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

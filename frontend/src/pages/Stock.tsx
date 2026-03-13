import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Package, AlertTriangle, Search, Filter } from 'lucide-react';
import api from '../lib/api';

interface Product {
    id: string;
    sku: string;
    name: string;
    category: string;
    warehouseLocation: string;
    minStock: number;
    price: number;
    inventory: {
        quantity: number;
        reservedQuantity: number;
    };
}

export default function Stock() {
    const { data: products, isLoading } = useQuery<Product[]>({
        queryKey: ['products'],
        queryFn: async () => {
            const { data } = await api.get('/api/v1/products');
            return data;
        }
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-xl font-semibold">Gestão de Stock</h1>
                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input type="text" placeholder="Procurar SKU ou Nome..." className="input pl-10 w-64" />
                    </div>
                    <button className="btn-primary flex gap-2 items-center">
                        <Filter className="w-4 h-4" />
                        Filtrar
                    </button>
                </div>
            </div>

            <div className="card overflow-hidden !p-0">
                <table className="w-full text-left">
                    <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
                        <tr>
                            <th className="px-6 py-3 font-medium">Produto</th>
                            <th className="px-6 py-3 font-medium">SKU</th>
                            <th className="px-6 py-3 font-medium">Localização</th>
                            <th className="px-6 py-3 font-medium">Disponível</th>
                            <th className="px-6 py-3 font-medium">Reservado</th>
                            <th className="px-6 py-3 font-medium text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {isLoading ? (
                            <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">A carregar produtos...</td></tr>
                        ) : products?.map((product) => {
                            const available = product.inventory?.quantity || 0;
                            const isLowStock = available <= product.minStock;

                            return (
                                <tr key={product.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-medium">{product.name}</span>
                                            <span className="text-xs text-muted-foreground">{product.category}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs">{product.sku}</td>
                                    <td className="px-6 py-4 text-sm">{product.warehouseLocation || '---'}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`font-semibold ${isLowStock ? 'text-danger' : 'text-success'}`}>
                                                {available}
                                            </span>
                                            {isLowStock && <AlertTriangle className="w-4 h-4 text-warning" />}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-muted-foreground">
                                        {product.inventory?.reservedQuantity || 0}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-primary hover:underline text-sm font-medium">Ajustar</button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

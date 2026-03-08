import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';

const schema = z.object({
    quantityChange: z.number().refine(n => n !== 0, "A mudança deve ser diferente de zero"),
    reason: z.string().min(5, "A razão deve ter pelo menos 5 caracteres"),
});

type FormData = z.infer<typeof schema>;

interface Props {
    product: { sku: string; name: string } | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function AdjustStockModal({ product, onClose, onSuccess }: Props) {
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { quantityChange: 1 }
    });

    if (!product) return null;

    const onSubmit = async (data: FormData) => {
        try {
            const response = await fetch('/api/v1/inventory/adjust', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    sku: product.sku,
                    ...data
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Erro ao ajustar stock');
            }

            onSuccess();
        } catch (err: any) {
            alert(err.message);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="card w-full max-w-md relative animate-in fade-in zoom-in duration-200">
                <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-white">
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-semibold mb-1">Ajustar Stock</h2>
                <p className="text-sm text-muted-foreground mb-6">
                    {product.name} <span className="text-xs font-mono ml-2">({product.sku})</span>
                </p>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block mb-1">Quantidade (+ entrada, - saída)</label>
                        <input
                            type="number"
                            {...register('quantityChange', { valueAsNumber: true })}
                            className="input text-lg font-mono"
                        />
                        {errors.quantityChange && <p className="text-danger text-[10px] mt-1">{errors.quantityChange.message}</p>}
                    </div>

                    <div>
                        <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block mb-1">Razão do Ajuste</label>
                        <textarea
                            {...register('reason')}
                            placeholder="Ex: Correção de inventário físico, Artigo danificado..."
                            className="input min-h-[100px] resize-none"
                        />
                        {errors.reason && <p className="text-danger text-[10px] mt-1">{errors.reason.message}</p>}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-border py-2 text-sm font-medium hover:bg-white/5 transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" disabled={isSubmitting} className="flex-1 btn-primary text-sm disabled:opacity-50">
                            {isSubmitting ? 'A processar...' : 'Confirmar Ajuste'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

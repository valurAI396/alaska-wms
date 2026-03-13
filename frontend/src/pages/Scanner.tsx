import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import {
    QrCode,
    Search,
    ChevronRight,
    Package,
    CheckCircle2,
    AlertCircle,
    ArrowLeft,
    Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface OrderItem {
    id: string;
    sku: string;
    quantity: number;
    price: number;
    product: {
        name: string;
        inventory: { quantity: number }
    }
}

interface Order {
    id: string;
    shopifyOrderId: string;
    customerEmail: string;
    totalAmount: number;
    items: OrderItem[];
}

export default function Scanner() {
    const [step, setStep] = useState(1);
    const [searchId, setSearchId] = useState('');
    const [order, setOrder] = useState<Order | null>(null);
    const [selectedItems, setSelectedItems] = useState<{ sku: string, quantity: number, name: string }[]>([]);
    const [reason, setReason] = useState('Cliente mudou de ideia');
    const [isProcessing, setIsProcessing] = useState(false);
    const navigate = useNavigate();

    const handleSearch = async () => {
        if (!searchId) return;
        try {
            const { data } = await api.get(`/api/v1/orders/by-shopify/${searchId}`);
            setOrder(data);
            setStep(2);
        } catch (err) {
            alert('Encomenda não encontrada');
        }
    };

    const addItem = (item: OrderItem) => {
        const existing = selectedItems.find(i => i.sku === item.sku);
        if (existing) {
            if (existing.quantity >= item.quantity) return; // Can't return more than bought
            setSelectedItems(selectedItems.map(i => i.sku === item.sku ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
            setSelectedItems([...selectedItems, { sku: item.sku, quantity: 1, name: item.product.name }]);
        }
    };

    const removeItem = (sku: string) => {
        setSelectedItems(selectedItems.filter(i => i.sku !== sku));
    };

    const handleConfirm = async () => {
        if (!order || selectedItems.length === 0) return;
        setIsProcessing(true);
        try {
            await api.post('/api/v1/returns', {
                shopifyOrderId: order.shopifyOrderId,
                items: selectedItems.map(i => ({ sku: i.sku, quantity: i.quantity })),
                reason,
                source: 'shopify'
            });
            setStep(4);
        } catch (err) {
            alert('Erro ao processar retorno');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-8">
            {/* Step Indicator */}
            <div className="flex justify-between mb-12 relative">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-border -translate-y-1/2 -z-10"></div>
                {[1, 2, 3].map((s) => (
                    <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${step >= s ? 'bg-primary text-black' : 'bg-surface text-muted-foreground border border-border'
                        }`}>
                        {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
                    </div>
                ))}
            </div>

            {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="text-center space-y-2">
                        <h1 className="text-2xl font-semibold">Iniciar Retorno</h1>
                        <p className="text-muted-foreground text-sm">Digitalize o código QR da guia de remessa ou introduza o ID da encomenda.</p>
                    </div>

                    <div className="card aspect-video border-dashed border-2 flex flex-col items-center justify-center gap-4 bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer transition-colors group">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <QrCode className="w-8 h-8 text-primary" />
                        </div>
                        <span className="text-sm font-medium">Ativar Câmara do Scanner</span>
                    </div>

                    <div className="relative flex items-center">
                        <div className="flex-1 h-px bg-border"></div>
                        <span className="px-4 text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Ou manual</span>
                        <div className="flex-1 h-px bg-border"></div>
                    </div>

                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Introduzir Shopify Order ID..."
                                className="input pl-10"
                                value={searchId}
                                onChange={(e) => setSearchId(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                        <button onClick={handleSearch} className="btn-primary flex gap-2 items-center">
                            Procurar <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && order && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                    <div className="flex items-center gap-4 mb-4">
                        <button onClick={() => setStep(1)} className="p-2 hover:bg-white/5 rounded-lg text-muted-foreground">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-xl font-semibold">Selecionar Artigos</h1>
                    </div>

                    <div className="card p-4 bg-primary/5 border-primary/20 flex justify-between items-center text-xs">
                        <div>
                            <p className="text-muted-foreground uppercase font-bold text-[10px]">Encomenda</p>
                            <p className="font-mono font-bold text-primary">#{order.shopifyOrderId}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-muted-foreground uppercase font-bold text-[10px]">Cliente</p>
                            <p className="font-medium">{order.customerEmail}</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {order.items.map((item) => (
                            <div key={item.id} className="card flex justify-between items-center hover:border-primary/50 transition-colors group">
                                <div className="flex gap-4 items-center">
                                    <div className="w-10 h-10 rounded bg-surface flex items-center justify-center">
                                        <Package className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium">{item.product.name}</h3>
                                        <p className="text-[10px] font-mono text-muted-foreground">SKU: {item.sku} | Comprado: {item.quantity}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => addItem(item)}
                                    className="btn-primary !p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    Adicionar
                                </button>
                            </div>
                        ))}
                    </div>

                    {selectedItems.length > 0 && (
                        <div className="card border-primary/30 p-4 space-y-4">
                            <h3 className="text-[10px] uppercase font-bold tracking-wider text-primary">Artigos a Retornar</h3>
                            {selectedItems.map((si) => (
                                <div key={si.sku} className="flex justify-between items-center text-sm border-b border-border py-2 last:border-0">
                                    <div className="flex flex-col">
                                        <span>{si.name}</span>
                                        <span className="text-[10px] text-muted-foreground">{si.sku}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-bold">x{si.quantity}</span>
                                        <button onClick={() => removeItem(si.sku)} className="text-danger hover:scale-110 transition-transform">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <button onClick={() => setStep(3)} className="btn-primary w-full mt-2">Continuar para Razão</button>
                        </div>
                    )}
                </div>
            )}

            {step === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                    <div className="flex items-center gap-4 mb-4">
                        <button onClick={() => setStep(2)} className="p-2 hover:bg-white/5 rounded-lg text-muted-foreground">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-xl font-semibold">Finalizar Retorno</h1>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block mb-2">Razão do Retorno</label>
                            <div className="grid grid-cols-1 gap-2">
                                {['Cliente mudou de ideia', 'Produto danificado', 'Tamanho errado', 'Outro'].map((r) => (
                                    <label key={r} className={`card cursor-pointer flex items-center gap-3 transition-colors ${reason === r ? 'border-primary bg-primary/5' : 'hover:border-white/20'
                                        }`}>
                                        <input
                                            type="radio"
                                            name="reason"
                                            className="hidden"
                                            checked={reason === r}
                                            onChange={() => setReason(r)}
                                        />
                                        <div className={`w-3 h-3 rounded-full border-2 ${reason === r ? 'border-primary bg-primary' : 'border-muted-foreground'}`}></div>
                                        <span className="text-sm">{r}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="card p-4 bg-warning/5 border-warning/20">
                            <div className="flex gap-3">
                                <AlertCircle className="w-5 h-5 text-warning flex-shrink-0" />
                                <div>
                                    <h4 className="text-sm font-semibold text-warning">Ação de Armazém</h4>
                                    <p className="text-xs text-muted-foreground mt-1">Ao confirmar, as unidades serão repostas no stock físico e o Shopify será atualizado automaticamente.</p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleConfirm}
                            className="btn-primary w-full py-3 h-auto text-lg font-bold"
                            disabled={isProcessing}
                        >
                            {isProcessing ? 'A processar...' : 'Confirmar e Repor Stock'}
                        </button>
                    </div>
                </div>
            )}

            {step === 4 && (
                <div className="text-center space-y-6 animate-in zoom-in duration-300">
                    <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-10 h-10 text-success" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold italic tracking-tighter">RETORNO PROCESSADO!</h1>
                        <p className="text-sm text-muted-foreground">O stock foi devidamente reposto e sincronizado com o Shopify.</p>
                    </div>
                    <div className="flex gap-3 justify-center">
                        <button onClick={() => navigate('/stock')} className="btn-secondary text-xs">Ver Stock</button>
                        <button onClick={() => {
                            setStep(1);
                            setOrder(null);
                            setSelectedItems([]);
                            setSearchId('');
                        }} className="btn-primary text-xs">Novo Retorno</button>
                    </div>
                </div>
            )}
        </div>
    );
}

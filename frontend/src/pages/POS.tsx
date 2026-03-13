import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import {
    Plus,
    Minus,
    Trash2,
    Search,
    ShoppingCart,
    CreditCard,
    Banknote,
    Smartphone,
    ChevronRight,
    Package,
    X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
    return twMerge(clsx(inputs));
}

interface Product {
    id: string;
    sku: string;
    name: string;
    price: number;
    inventory: { quantity: number };
}

interface CartItem extends Product {
    cartQuantity: number;
}

export default function POS() {
    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mbway'>('card');
    const [isProcessing, setIsProcessing] = useState(false);
    const navigate = useNavigate();

    const { data: products } = useQuery<Product[]>({
        queryKey: ['products-pos'],
        queryFn: async () => {
            const { data } = await api.get('/api/v1/products');
            return data;
        }
    });

    const filteredProducts = useMemo(() => {
        if (!searchTerm) return [];
        return products?.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 5) || [];
    }, [searchTerm, products]);

    const addToCart = (product: Product) => {
        const existing = cart.find(i => i.id === product.id);
        if (existing) {
            if (existing.cartQuantity >= product.inventory.quantity) return;
            setCart(cart.map(i => i.id === product.id ? { ...i, cartQuantity: i.cartQuantity + 1 } : i));
        } else {
            setCart([...cart, { ...product, cartQuantity: 1 }]);
        }
        setSearchTerm('');
    };

    const updateQuantity = (id: string, delta: number) => {
        setCart(cart.map(i => {
            if (i.id === id) {
                const newQty = i.cartQuantity + delta;
                if (newQty < 1) return i;
                if (newQty > i.inventory.quantity) return i;
                return { ...i, cartQuantity: newQty };
            }
            return i;
        }));
    };

    const removeFromCart = (id: string) => {
        setCart(cart.filter(i => i.id !== id));
    };

    const total = cart.reduce((acc, item) => acc + (item.price * item.cartQuantity), 0);

    const handleCheckout = async () => {
        setIsProcessing(true);
        try {
            await api.post('/api/v1/pos/sale', {
                items: cart.map(i => ({ sku: i.sku, quantity: i.cartQuantity, price: i.price })),
                paymentMethod,
                totalAmount: total
            });

            setCart([]);
            setIsCheckoutModalOpen(false);
            alert('Venda efetuada com sucesso!');
        } catch (err: any) {
            alert(err.response?.data?.error || 'Erro ao processar venda');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-140px)]">
            {/* Left: Product Search */}
            <div className="lg:col-span-2 space-y-6 flex flex-col">
                <div className="card space-y-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Search className="w-5 h-5 text-primary" />
                        Adicionar Produtos
                    </h2>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Pesquisar por SKU ou Nome..."
                            className="input text-lg pl-12 h-14"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-6 h-6" />
                    </div>

                    {filteredProducts.length > 0 && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-4">
                            {filteredProducts.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => addToCart(p)}
                                    className="card !p-3 hover:border-primary cursor-pointer flex justify-between items-center group bg-white/[0.01]"
                                >
                                    <div className="flex gap-4 items-center">
                                        <div className="w-10 h-10 rounded bg-surface flex items-center justify-center">
                                            <Package className="w-5 h-5 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{p.name}</p>
                                            <p className="text-[10px] font-mono text-muted-foreground">{p.sku} | Stock: {p.inventory.quantity}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-primary">€{p.price.toFixed(2)}</p>
                                        <Plus className="w-4 h-4 text-primary ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex-1 card flex flex-col items-center justify-center border-dashed border-2 opacity-30">
                    <ShoppingCart className="w-12 h-12 mb-4" />
                    <p className="text-sm">Área de Digitalização de Barra ativa</p>
                </div>
            </div>

            {/* Right: Cart */}
            <div className="card flex flex-col gap-6 overflow-hidden">
                <div className="flex items-center justify-between border-b border-border pb-4">
                    <h2 className="text-lg font-bold flex items-center gap-2 italic tracking-tighter">
                        CARRINHO
                        <span className="bg-primary text-black text-[10px] h-4 w-4 rounded-full flex items-center justify-center font-bold">
                            {cart.length}
                        </span>
                    </h2>
                    <button onClick={() => setCart([])} className="text-[10px] uppercase font-bold text-danger hover:underline">Vazar</button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground italic text-sm">
                            Carrinho vazio
                        </div>
                    ) : cart.map((item) => (
                        <div key={item.id} className="flex gap-4 items-start group">
                            <div className="w-12 h-12 rounded bg-surface flex-shrink-0 flex items-center justify-center font-mono text-[10px]">
                                IMG
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{item.name}</p>
                                <p className="text-xs font-bold text-primary">€{item.price.toFixed(2)}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-white/5 rounded"><Minus className="w-3 h-3" /></button>
                                    <span className="text-xs font-mono w-6 text-center">{item.cartQuantity}</span>
                                    <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-white/5 rounded"><Plus className="w-3 h-3" /></button>
                                </div>
                            </div>
                            <button onClick={() => removeFromCart(item.id)} className="text-muted-foreground hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>

                <div className="border-t border-border pt-6 space-y-4 bg-panel">
                    <div className="flex justify-between items-center text-muted-foreground text-sm">
                        <span>Subtotal</span>
                        <span>€{total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xl font-bold italic tracking-tighter">
                        <span>TOTAL</span>
                        <span className="text-primary tracking-normal">€{total.toFixed(2)}</span>
                    </div>
                    <button
                        disabled={cart.length === 0}
                        onClick={() => setIsCheckoutModalOpen(true)}
                        className="btn-primary w-full py-4 h-auto text-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        FINALIZAR VENDA
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Checkout Modal */}
            {isCheckoutModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="card w-full max-w-md animate-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold italic tracking-tighter">PAGAMENTO</h2>
                            <button onClick={() => setIsCheckoutModalOpen(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div className="bg-surface/50 rounded-xl p-4 border border-border flex justify-between items-center">
                                <span className="text-sm text-muted-foreground font-medium">Total a Receber</span>
                                <span className="text-2xl font-bold text-primary">€{total.toFixed(2)}</span>
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                                {[
                                    { id: 'card', label: 'Cartão de Débito/Crédito', icon: CreditCard },
                                    { id: 'cash', label: 'Dinheiro (Numerário)', icon: Banknote },
                                    { id: 'mbway', label: 'MB WAY', icon: Smartphone },
                                ].map((method) => (
                                    <label key={method.id} className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${paymentMethod === method.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:bg-white/[0.03]'
                                        }`}>
                                        <input
                                            type="radio"
                                            name="payment"
                                            className="hidden"
                                            checked={paymentMethod === method.id}
                                            onChange={() => setPaymentMethod(method.id as any)}
                                        />
                                        <div className={cn(
                                            "w-10 h-10 rounded-lg flex items-center justify-center",
                                            paymentMethod === method.id ? "bg-primary text-black" : "bg-surface text-muted-foreground"
                                        )}>
                                            <method.icon className="w-5 h-5" />
                                        </div>
                                        <span className="font-medium text-sm">{method.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleCheckout}
                            disabled={isProcessing}
                            className="btn-primary w-full py-4 text-lg font-bold disabled:opacity-50"
                        >
                            {isProcessing ? 'A PROCESSAR...' : 'CONFIRMAR RECEBIMENTO'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

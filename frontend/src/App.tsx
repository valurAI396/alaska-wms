import { Routes, Route, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import Layout from './components/Layout';
import Stock from './pages/Stock';
import Movements from './pages/Movements';
import Scanner from './pages/Scanner';
import ReturnsHistory from './pages/ReturnsHistory';
import POS from './pages/POS';
import POSHistory from './pages/POSHistory';

// Placeholder for Login
function Login() {
    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="card max-w-sm w-full">
                <h1 className="text-2xl font-semibold mb-1">ALASKA WMS</h1>
                <p className="text-sm text-muted-foreground mb-8">Entra para gerir o teu armazém.</p>

                <form className="space-y-4" onSubmit={(e) => {
                    e.preventDefault();
                    localStorage.setItem('token', 'dummy-token');
                    window.location.href = '/';
                }}>
                    <div>
                        <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block mb-1">Email</label>
                        <input type="email" placeholder="email@exemplo.com" className="input" defaultValue="admin@alaskawms.com" />
                    </div>
                    <div>
                        <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block mb-1">Palavra-passe</label>
                        <input type="password" placeholder="••••••••" className="input" defaultValue="admin123" />
                    </div>
                    <button type="submit" className="btn-primary w-full mt-2">Entrar</button>
                </form>
            </div>
        </div>
    );
}

function Dashboard() {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            const { data } = await axios.get('/api/v1/dashboard/stats', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            return data;
        },
        refetchInterval: 30000 // Refetch every 30s
    });

    if (isLoading) return <div className="text-muted-foreground animate-pulse">A carregar métricas...</div>;

    const cards = [
        { label: 'SKUs Totais', value: stats?.totalSkus || 0, color: 'text-primary' },
        { label: 'Unidades em Stock', value: stats?.unitsInStock || 0, color: 'text-success' },
        { label: 'Alertas Stock Baixo', value: stats?.lowStockAlerts || 0, color: stats?.lowStockAlerts > 0 ? 'text-danger' : 'text-muted-foreground' },
        { label: 'Vendas POS (Hoje)', value: `€${(stats?.posSalesToday || 0).toFixed(2)}`, color: 'text-warning' },
    ];

    return (
        <div className="space-y-8 animate-in mt-2 slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((stat, i) => (
                    <div key={i} className="card group hover:border-primary/50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">{stat.label}</span>
                            <div className="h-6 w-12 bg-white/5 rounded-full flex items-center justify-center">
                                <span className="text-[8px] font-bold text-success">+3%</span>
                            </div>
                        </div>
                        <span className={`text-3xl font-bold italic tracking-tighter ${stat.color}`}>{stat.value}</span>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="card lg:col-span-2 min-h-[300px] flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-bold italic tracking-tighter uppercase">Desempenho Semanal (POS)</h3>
                        <div className="flex gap-2">
                            <div className="h-2 w-2 rounded-full bg-primary" />
                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Vendas Diretas</span>
                        </div>
                    </div>

                    <div className="flex-1 flex items-end justify-between gap-4 mt-4">
                        {stats?.salesTrend?.map((day: any, i: number) => {
                            const maxVal = Math.max(...stats.salesTrend.map((d: any) => d.total));
                            const height = maxVal > 0 ? (day.total / maxVal) * 100 : 5;
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                    <div className="relative w-full">
                                        <div
                                            className="w-full bg-primary/20 group-hover:bg-primary/40 rounded-t-sm transition-all duration-500 ease-out flex items-end justify-center overflow-hidden"
                                            style={{ height: `${Math.max(height, 5)}%` }}
                                        >
                                            <div className="w-full h-1/2 bg-gradient-to-t from-primary/40 to-transparent" />
                                        </div>
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-[10px] px-2 py-1 rounded font-bold border border-border">
                                            €{day.total.toFixed(0)}
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-mono text-muted-foreground">
                                        {new Date(day.date).toLocaleDateString('pt', { weekday: 'short' })}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="card flex flex-col gap-6">
                    <h3 className="text-sm font-bold italic tracking-tighter uppercase">Integridade do Inventário</h3>
                    <div className="space-y-4">
                        {[
                            { label: 'Mirakl Returns', value: 'Operacional', icon: 'bg-warning/20 text-warning' },
                            { label: 'Shopify Sync', value: 'Operacional', icon: 'bg-success/20 text-success' },
                            { label: 'Última Polling', value: 'Agora mesmo', icon: 'bg-primary/20 text-primary' },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-surface/50 border border-border/50">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${item.icon}`}>M</div>
                                    <span className="text-xs font-medium">{item.label}</span>
                                </div>
                                <span className="text-[10px] font-mono font-bold text-muted-foreground">{item.value}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-auto pt-6 border-t border-border">
                        <div className="flex items-center gap-2 text-primary hover:underline cursor-pointer">
                            <span className="text-[10px] font-bold uppercase italic">Ver Log Detalhado</span>
                            <div className="h-4 w-4 rounded-full border border-primary flex items-center justify-center">→</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function App() {
    const isAuthenticated = !!localStorage.getItem('token');

    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
                <Route index element={<Dashboard />} />
                <Route path="stock" element={<Stock />} />
                <Route path="scanner" element={<Scanner />} />
                <Route path="movements" element={<Movements />} />
                <Route path="returns" element={<ReturnsHistory />} />
                <Route path="pos" element={<POS />} />
                <Route path="pos/history" element={<POSHistory />} />
                <Route path="*" element={<div className="text-muted-foreground italic">Em desenvolvimento...</div>} />
            </Route>
        </Routes>
    );
}

export default App;

import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Package,
    QrCode,
    History,
    RotateCcw,
    ShoppingCart,
    Settings,
    ChevronLeft,
    ChevronRight,
    LogOut,
    User as UserIcon
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
    return twMerge(clsx(inputs));
}

export default function Layout() {
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const userName = 'Operador Alaska'; // Will get from context later

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
        { icon: Package, label: 'Stock', path: '/stock' },
        { icon: QrCode, label: 'Scanner', path: '/scanner' },
        { icon: History, label: 'Movimentos', path: '/movements' },
        { icon: RotateCcw, label: 'Retornos', path: '/returns' },
        { icon: ShoppingCart, label: 'POS Venda', path: '/pos', badge: 'POS' },
    ];

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <div className="flex h-screen bg-background overflow-hidden font-sans">
            {/* Sidebar */}
            <aside className={cn(
                "bg-panel border-r border-border transition-all duration-300 flex flex-col",
                collapsed ? "w-[56px]" : "w-[220px]"
            )}>
                <div className="h-[56px] border-b border-border flex items-center px-4 overflow-hidden">
                    <div className="w-6 h-6 rounded bg-primary flex-shrink-0 flex items-center justify-center font-bold text-xs">A</div>
                    {!collapsed && <span className="ml-3 font-semibold text-sm whitespace-nowrap">ALASKA WMS</span>}
                </div>

                <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => cn(
                                "flex items-center rounded-lg px-2 h-9 transition-colors group relative",
                                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-white/[0.04] hover:text-white"
                            )}
                        >
                            <item.icon className="w-4 h-4 flex-shrink-0" />
                            {!collapsed && <span className="ml-3 text-xs font-medium flex-1">{item.label}</span>}
                            {!collapsed && item.badge && (
                                <span className="text-[8px] bg-primary/20 text-primary border border-primary/20 px-1 rounded font-bold uppercase">
                                    {item.badge}
                                </span>
                            )}
                            {collapsed && (
                                <div className="absolute left-12 bg-surface border border-border px-2 py-1 rounded text-[10px] invisible group-hover:visible whitespace-nowrap z-50">
                                    {item.label}
                                </div>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-2 border-t border-border space-y-1">
                    <button className="w-full flex items-center rounded-lg px-2 h-9 text-muted-foreground hover:bg-white/[0.04] hover:text-white transition-colors">
                        <Settings className="w-4 h-4 flex-shrink-0" />
                        {!collapsed && <span className="ml-3 text-xs font-medium">Definições</span>}
                    </button>

                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="w-full flex items-center rounded-lg px-2 h-9 text-muted-foreground hover:bg-white/[0.04] hover:text-white transition-colors"
                    >
                        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                        {!collapsed && <span className="ml-3 text-xs font-medium">Recolher</span>}
                    </button>

                    <div className="pt-2">
                        <div className={cn(
                            "flex items-center rounded-xl bg-surface/50 border border-border p-2",
                            collapsed ? "justify-center" : "gap-3"
                        )}>
                            <div className="w-6 h-6 rounded-full bg-border flex items-center justify-center flex-shrink-0 text-muted-foreground">
                                <UserIcon className="w-3 h-3" />
                            </div>
                            {!collapsed && (
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-semibold truncate">{userName}</p>
                                    <p className="text-[8px] text-muted-foreground flex items-center gap-1">
                                        <span className="w-1 h-1 rounded-full bg-success"></span> Online
                                    </p>
                                </div>
                            )}
                            {!collapsed && (
                                <button onClick={handleLogout} className="text-muted-foreground hover:text-danger">
                                    <LogOut className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0">
                <header className="h-[56px] border-b border-border flex items-center justify-between px-6 bg-background/50 backdrop-blur-md sticky top-0 z-10">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                        Início / <span className="text-white">Dashboard</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                            <span className="w-1.5 h-1.5 rounded-full bg-success"></span> Shopify Conectado
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                    <div className="max-w-[1280px] mx-auto">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
}

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: '#0a0a0a',
                panel: '#111111',
                surface: '#1a1a1a',
                border: {
                    DEFAULT: '#1e1e1e',
                    active: '#2a2a2a'
                },
                primary: {
                    DEFAULT: '#2563eb',
                    accent: '#3b82f6'
                },
                success: '#10b981',
                warning: '#f59e0b',
                danger: '#ef4444'
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                mono: ['SF Mono', 'Fira Code', 'monospace']
            }
        },
    },
    plugins: [],
}

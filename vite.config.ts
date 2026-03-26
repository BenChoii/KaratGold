import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
    plugins: [
        react(),
        nodePolyfills({
            include: ['buffer', 'process', 'crypto', 'stream', 'util'],
            globals: { Buffer: true, process: true },
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id: string) {
                    // React core
                    if (
                        id.includes('node_modules/react/') ||
                        id.includes('node_modules/react-dom/') ||
                        id.includes('node_modules/react-router-dom/')
                    ) {
                        return 'react-vendor';
                    }
                    // UI libraries
                    if (
                        id.includes('node_modules/framer-motion/') ||
                        id.includes('node_modules/lucide-react/')
                    ) {
                        return 'ui-vendor';
                    }
                    // Map libraries
                    if (
                        id.includes('node_modules/mapbox-gl/') ||
                        id.includes('node_modules/react-map-gl/')
                    ) {
                        return 'map-vendor';
                    }
                    // Solana ecosystem
                    if (id.includes('node_modules/@solana/')) {
                        return 'solana-vendor';
                    }
                    // Stripe
                    if (id.includes('node_modules/@stripe/')) {
                        return 'stripe-vendor';
                    }
                    // Clerk auth
                    if (id.includes('node_modules/@clerk/')) {
                        return 'clerk-vendor';
                    }
                    // Convex backend
                    if (id.includes('node_modules/convex/')) {
                        return 'convex-vendor';
                    }
                    // Spline 3D runtime (likely source of large physics chunk)
                    // Split into its own chunk so it can be lazy-loaded
                    if (id.includes('node_modules/@splinetool/')) {
                        return 'spline-3d-vendor';
                    }
                    // Remotion video rendering
                    if (id.includes('node_modules/remotion/') || id.includes('node_modules/@remotion/')) {
                        return 'remotion-vendor';
                    }
                },
            },
        },
    },
})

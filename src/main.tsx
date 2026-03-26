import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter, SolflareWalletAdapter, BackpackWalletAdapter } from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'
import App from './App'
import './index.css'
import '@solana/wallet-adapter-react-ui/styles.css'

const endpoint = clusterApiUrl('devnet')
const wallets = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
    new BackpackWalletAdapter(),
]

function SolanaConvexProvider({ children }: { children: React.ReactNode }) {
    const convexUrl = import.meta.env.VITE_CONVEX_URL

    // Instantiate Convex only if URL is available
    const convex = convexUrl ? new ConvexReactClient(convexUrl) : null

    if (!convex) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
                <h2>Deployment Configuration Missing</h2>
                <p>The Vercel environment variable (VITE_CONVEX_URL) is not configured for this deployment environment.</p>
                <p>Please add it to your Vercel Project Settings and trigger a Redeploy.</p>
            </div>
        )
    }

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    <ConvexProvider client={convex}>
                        {children}
                    </ConvexProvider>
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <BrowserRouter>
            <SolanaConvexProvider>
                <App />
            </SolanaConvexProvider>
        </BrowserRouter>
    </React.StrictMode>
)

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider, useAuth } from '@clerk/clerk-react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { ConvexReactClient } from 'convex/react'
import App from './App'
import './index.css'

// Pattern: ClerkConvexProvider to prevent silent crash on Vercel deployment if ENV vars are missing
function ClerkConvexProvider({ children }: { children: React.ReactNode }) {
    const convexUrl = import.meta.env.VITE_CONVEX_URL
    const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

    // Instantiate Convex only if URL is available
    const convex = convexUrl ? new ConvexReactClient(convexUrl) : null

    // If environment variables are missing (like on Vercel free tier preview builds without keys attached),
    // degrade gracefully by rendering a "Missing Configuration" screen rather than a silent blank React root crash
    if (!clerkPubKey || !convex) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
                <h2>Deployment Configuration Missing</h2>
                <p>The Vercel environment variables (VITE_CLERK_PUBLISHABLE_KEY or VITE_CONVEX_URL) are not configured for this deployment environment.</p>
                <p>Please add them to your Vercel Project Settings and trigger a Redeploy.</p>
            </div>
        )
    }

    return (
        <ClerkProvider
            publishableKey={clerkPubKey}
            signInForceRedirectUrl="/role"
            signUpForceRedirectUrl="/role"
            afterSignOutUrl="/"
        >
            <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
                {children}
            </ConvexProviderWithClerk>
        </ClerkProvider>
    )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <BrowserRouter>
            <ClerkConvexProvider>
                <App />
            </ClerkConvexProvider>
        </BrowserRouter>
    </React.StrictMode>
)


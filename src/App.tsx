import React, { Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import Navbar from './components/layout/Navbar'

// Lazy-loaded page components for code splitting
const Landing = React.lazy(() => import('./pages/Landing'))
const CustomerRewards = React.lazy(() => import('./pages/CustomerRewards'))
const BusinessDashboard = React.lazy(() => import('./pages/BusinessDashboard'))
const CustomerExplore = React.lazy(() => import('./pages/CustomerExplore'))
const CustomerSubmit = React.lazy(() => import('./pages/CustomerSubmit'))
const RoleSelect = React.lazy(() => import('./pages/RoleSelect'))
const BusinessOnboard = React.lazy(() => import('./pages/BusinessOnboard'))
const GoldExplainer = React.lazy(() => import('./pages/GoldExplainer'))
const CoinbaseGuide = React.lazy(() => import('./pages/CoinbaseGuide'))
const ScanPage = React.lazy(() => import('./pages/ScanPage'))
const PreAuthJoin = React.lazy(() => import('./pages/PreAuthJoin'))
const CustomerTeaser = React.lazy(() => import('./pages/CustomerTeaser'))
const BusinessTeaser = React.lazy(() => import('./pages/BusinessTeaser'))
const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy'))
const TermsOfService = React.lazy(() => import('./pages/TermsOfService'))
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'))
const HowItWorksCustomer = React.lazy(() => import('./pages/HowItWorksCustomer'))
const HowItWorksBusiness = React.lazy(() => import('./pages/HowItWorksBusiness'))
const HowCashoutWorks = React.lazy(() => import('./pages/HowCashoutWorks'))

function LoadingSpinner() {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '60vh',
            backgroundColor: '#FAFAF8',
        }}>
            <div style={{
                width: 40,
                height: 40,
                border: '4px solid #e0e0dc',
                borderTop: '4px solid #2DD4A0',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}

// Wrapper that ensures user has a connected wallet
function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { connected } = useWallet()

    if (!connected) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh',
                gap: '1.5rem',
                fontFamily: 'sans-serif',
            }}>
                <h2 style={{ fontSize: '1.25rem', color: '#333' }}>Connect your wallet to continue</h2>
                <p style={{ color: '#666', maxWidth: 400, textAlign: 'center' }}>
                    You need to connect a Solana wallet (Phantom, Solflare, or Backpack) to access this page.
                </p>
                <WalletMultiButton />
            </div>
        )
    }

    return <>{children}</>
}

function App() {
    return (
        <Suspense fallback={<LoadingSpinner />}>
        <Routes>
            {/* Public scan page — no Navbar, no auth (Playwright visits this) */}
            <Route path="/scan/:businessId" element={<ScanPage />} />

            {/* Main app with Navbar */}
            <Route path="/*" element={
                <div className="app">
                    <Navbar />
                    <main>
                        <Routes>
                            {/* Public */}
                            <Route path="/" element={<Landing />} />
                            <Route path="/join" element={<PreAuthJoin />} />
                            <Route path="/join/customer" element={<CustomerTeaser />} />
                            <Route path="/join/business" element={<BusinessTeaser />} />
                            <Route path="/gold" element={<GoldExplainer />} />
                            <Route path="/coinbase-guide" element={<CoinbaseGuide />} />
                            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                            <Route path="/terms-of-service" element={<TermsOfService />} />
                            <Route path="/admin" element={<AdminDashboard />} />
                            <Route path="/how-it-works/customer" element={<HowItWorksCustomer />} />
                            <Route path="/how-it-works/business" element={<HowItWorksBusiness />} />
                            <Route path="/how-cashout-works" element={<HowCashoutWorks />} />

                            {/* Protected — requires wallet connection */}
                            <Route path="/role" element={
                                <ProtectedRoute><RoleSelect /></ProtectedRoute>
                            } />
                            <Route path="/onboard" element={
                                <ProtectedRoute><BusinessOnboard /></ProtectedRoute>
                            } />
                            <Route path="/explore" element={
                                <ProtectedRoute><CustomerExplore /></ProtectedRoute>
                            } />
                            <Route path="/submit" element={
                                <ProtectedRoute><CustomerSubmit /></ProtectedRoute>
                            } />
                            <Route path="/rewards" element={
                                <ProtectedRoute><CustomerRewards /></ProtectedRoute>
                            } />
                            <Route path="/dashboard" element={
                                <ProtectedRoute><BusinessDashboard /></ProtectedRoute>
                            } />

                            {/* Fallback */}
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </main>
                </div>
            } />
        </Routes>
        </Suspense>
    )
}

export default App

import { Routes, Route, Navigate } from 'react-router-dom'
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react'
import Navbar from './components/layout/Navbar'
import Landing from './pages/Landing'
import CustomerRewards from './pages/CustomerRewards'
import BusinessDashboard from './pages/BusinessDashboard'
import CustomerExplore from './pages/CustomerExplore'
import CustomerSubmit from './pages/CustomerSubmit'
import RoleSelect from './pages/RoleSelect'
import BusinessOnboard from './pages/BusinessOnboard'
import GoldExplainer from './pages/GoldExplainer'
import CoinbaseGuide from './pages/CoinbaseGuide'
import ScanPage from './pages/ScanPage'
import PreAuthJoin from './pages/PreAuthJoin'
import CustomerTeaser from './pages/CustomerTeaser'
import BusinessTeaser from './pages/BusinessTeaser'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'

// Wrapper that ensures user is signed in
function ProtectedRoute({ children }: { children: React.ReactNode }) {
    return (
        <>
            <SignedIn>{children}</SignedIn>
            <SignedOut>
                <RedirectToSignIn />
            </SignedOut>
        </>
    )
}

function App() {
    return (
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

                            {/* Protected — requires sign in */}
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
    )
}

export default App

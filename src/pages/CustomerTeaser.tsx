import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Coins, Camera, ShieldCheck, ArrowRight } from 'lucide-react'
import { SignUpButton } from '@clerk/clerk-react'
import './RoleSelect.css'
import '../pages/Landing.css'

function CustomerTeaser() {
    return (
        <div className="role-teaser-page customer-theme">
            <div className="hero-bg-grid" />
            <div className="hero-glow" />

            <div className="container teaser-container">
                <motion.div
                    className="teaser-content"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="teaser-badge">
                        <Coins size={16} /> For Patrons
                    </div>
                    <h1 className="text-display">Turn your social<br />posts into <span className="text-gradient">Gold</span>.</h1>
                    <p className="text-body teaser-subtitle">
                        Discover businesses you love, post authentic content, and get paid instantly in real, vaulted gold.
                    </p>

                    <div className="teaser-perks-grid">
                        <motion.div className="teaser-perk-card" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                            <div className="perk-icon"><Camera size={24} /></div>
                            <h3>Post & Tag</h3>
                            <p>Share great spots on Instagram</p>
                        </motion.div>
                        <motion.div className="teaser-perk-card" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                            <div className="perk-icon"><ShieldCheck size={24} /></div>
                            <h3>AI Verified</h3>
                            <p>Instant approval of your #ad posts</p>
                        </motion.div>
                        <motion.div className="teaser-perk-card" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                            <div className="perk-icon"><Coins size={24} style={{ color: 'var(--gold-dark)' }} /></div>
                            <h3>Earn Gold</h3>
                            <p>Real LBMA-backed gold tokens</p>
                        </motion.div>
                    </div>

                    <motion.div
                        className="teaser-cta-area"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 }}
                    >
                        <SignUpButton mode="modal" signInForceRedirectUrl="/role?selected=customer" forceRedirectUrl="/role?selected=customer">
                            <button className="btn btn-primary btn-xl teaser-btn">
                                Create Patron Profile <ArrowRight size={18} />
                            </button>
                        </SignUpButton>
                        <p className="text-caption mt-3" style={{ opacity: 0.6 }}>Secured by Clerk Auth</p>
                        <Link to="/how-it-works/customer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--accent)', fontSize: '0.85rem', marginTop: '0.75rem', textDecoration: 'none', fontWeight: 500 }}>
                            Learn how Karat Gold works →
                        </Link>
                    </motion.div>

                </motion.div>

                {/* Visual Side */}
                <motion.div
                    className="teaser-visual"
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ type: "spring", stiffness: 80, delay: 0.4 }}
                >
                    <div className="teaser-floating-glass customer-glass">
                        <div className="glass-header">
                            <Coins size={24} className="text-gold" />
                            <span>Vault Balance</span>
                        </div>
                        <div className="glass-balance">0.245 oz</div>
                        <div className="glass-fiat">≈ $840.45 CAD</div>
                        <div className="glass-chart-placeholder">
                            {/* Mini sparkline visualization */}
                            <svg viewBox="0 0 200 60" width="100%" height="60" className="opacity-50">
                                <path d="M0,50 L30,40 L60,45 L90,20 L120,25 L150,10 L180,15 L200,5" fill="none" stroke="var(--gold-dark)" strokeWidth="3" />
                            </svg>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}

export default CustomerTeaser

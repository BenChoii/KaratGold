import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Briefcase, BarChart3, Users, ArrowRight } from 'lucide-react'
import { SignUpButton } from '@clerk/clerk-react'
import './RoleSelect.css'
import '../pages/Landing.css'

function BusinessTeaser() {
    return (
        <div className="role-teaser-page business-theme">
            <div className="hero-bg-grid" />
            <div className="hero-glow-right" /> {/* Alternate glow placement */}

            <div className="container teaser-container">
                <motion.div
                    className="teaser-content"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="teaser-badge">
                        <Briefcase size={16} /> For Businesses
                    </div>
                    <h1 className="text-display">Pay for <span className="text-gradient">Performance</span>.<br />Not Impressions.</h1>
                    <p className="text-body teaser-subtitle">
                        Stop wasting ad spend on bots. Create a campaign and only pay when real local customers post authentic content about your business.
                    </p>

                    <div className="teaser-perks-grid">
                        <motion.div className="teaser-perk-card" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                            <div className="perk-icon"><Users size={24} /></div>
                            <h3>Local Reach</h3>
                            <p>Turn your best customers into organic affiliates.</p>
                        </motion.div>
                        <motion.div className="teaser-perk-card" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                            <div className="perk-icon"><BarChart3 size={24} /></div>
                            <h3>Guaranteed ROI</h3>
                            <p>No clicks. Only pay for verified permanent posts.</p>
                        </motion.div>
                    </div>

                    <motion.div
                        className="teaser-cta-area"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 }}
                    >
                        <SignUpButton mode="modal" signInForceRedirectUrl="/role?selected=business" forceRedirectUrl="/role?selected=business">
                            <button className="btn btn-primary btn-xl teaser-btn">
                                Create Business Profile <ArrowRight size={18} />
                            </button>
                        </SignUpButton>
                        <p className="text-caption mt-3" style={{ opacity: 0.6 }}>Secured by Clerk Auth</p>
                        <Link to="/how-it-works/business" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--accent)', fontSize: '0.85rem', marginTop: '0.75rem', textDecoration: 'none', fontWeight: 500 }}>
                            Learn how campaigns work →
                        </Link>
                    </motion.div>

                </motion.div>

                {/* Visual Side */}
                <motion.div
                    className="teaser-visual"
                    initial={{ opacity: 0, x: -40 }} // Slide from left for variety
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ type: "spring", stiffness: 80, delay: 0.4 }}
                >
                    <div className="teaser-floating-glass business-glass">
                        <div className="glass-header">
                            <BarChart3 size={24} className="text-primary" />
                            <span>Campaign Live</span>
                        </div>
                        <div className="glass-metric-row">
                            <span className="metric-label">Verified Posts</span>
                            <span className="metric-value">142</span>
                        </div>
                        <div className="glass-metric-row">
                            <span className="metric-label">Local Views</span>
                            <span className="metric-value text-accent">~63,900</span>
                        </div>
                        <div className="glass-progress mt-4">
                            <div className="progress-bar"><div className="progress-fill" style={{ width: '60%' }}></div></div>
                            <span className="text-caption mt-2 block opacity-70">Budget remaining: $200 / $500 CAD</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}

export default BusinessTeaser

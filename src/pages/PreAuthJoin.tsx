import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Users, Briefcase, ArrowRight } from 'lucide-react'
import './RoleSelect.css' // Reusing the same CSS from RoleSelect for consistency

function PreAuthJoin() {
    return (
        <div className="role-teaser-page" style={{ flexDirection: 'column', justifyContent: 'center' }}>
            <div className="hero-bg-grid" style={{ opacity: 0.15 }} />

            <div className="container" style={{ position: 'relative', zIndex: 10 }}>
                <motion.div
                    className="role-select-content"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <h1 className="text-display text-center" style={{ fontSize: '3rem', marginBottom: '1rem' }}>Welcome to <span className="text-gradient">OKTD</span></h1>
                    <p className="text-body text-center" style={{ color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto var(--space-6)' }}>
                        Choose your path to get started on the network.
                    </p>

                    <div className="role-cards" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', maxWidth: '900px', margin: '0 auto' }}>
                        <Link to="/join/customer" className="role-link-wrapper" style={{ textDecoration: 'none' }}>
                            <motion.div
                                className="teaser-floating-glass customer-glass"
                                style={{ height: '100%', padding: 'var(--space-5)', display: 'flex', flexDirection: 'column' }}
                                whileHover={{ scale: 1.02, y: -4, borderColor: 'var(--gold-dark)', boxShadow: 'var(--shadow-xl)' }}
                                whileTap={{ scale: 0.98 }}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15 }}
                            >
                                <div className="role-icon customer-icon" style={{ color: 'var(--gold-dark)', marginBottom: 'var(--space-3)' }}>
                                    <Users size={40} />
                                </div>
                                <h3 className="text-h3" style={{ marginBottom: 'var(--space-2)' }}>I'm a Patron</h3>
                                <p className="text-body-sm" style={{ color: 'var(--text-secondary)', flexGrow: 1 }}>
                                    Earn real gold by sharing posts about businesses you love.
                                </p>
                                <div className="role-cta" style={{ marginTop: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gold-dark)', fontWeight: 600 }}>
                                    Start Earning <ArrowRight size={16} />
                                </div>
                            </motion.div>
                        </Link>

                        <Link to="/join/business" className="role-link-wrapper" style={{ textDecoration: 'none' }}>
                            <motion.div
                                className="teaser-floating-glass business-glass"
                                style={{ height: '100%', padding: 'var(--space-5)', display: 'flex', flexDirection: 'column' }}
                                whileHover={{ scale: 1.02, y: -4, borderColor: 'var(--accent-dark)', boxShadow: 'var(--shadow-xl)' }}
                                whileTap={{ scale: 0.98 }}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.25 }}
                            >
                                <div className="role-icon business-icon" style={{ color: 'var(--accent-dark)', marginBottom: 'var(--space-3)' }}>
                                    <Briefcase size={40} />
                                </div>
                                <h3 className="text-h3" style={{ marginBottom: 'var(--space-2)' }}>I'm a Business Owner</h3>
                                <p className="text-body-sm" style={{ color: 'var(--text-secondary)', flexGrow: 1 }}>
                                    Create campaigns and reward your community with gold for authentic posts.
                                </p>
                                <div className="role-cta" style={{ marginTop: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-dark)', fontWeight: 600 }}>
                                    Create Campaign <ArrowRight size={16} />
                                </div>
                            </motion.div>
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}

export default PreAuthJoin

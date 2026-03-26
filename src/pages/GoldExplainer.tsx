import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
    Shield, Lock, FileCheck, Landmark, TrendingUp,
    ArrowRight, ArrowUpRight, Coins, Wallet, Truck, Scale, BadgeCheck, Building2
} from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import './GoldExplainer.css'

/* ===== ANIMATION VARIANTS ===== */
const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }
    })
}

const scaleIn = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: (i: number) => ({
        opacity: 1,
        scale: 1,
        transition: { delay: i * 0.12, type: "spring", stiffness: 120, damping: 22 }
    })
}

/* ===== COMPARISON DATA ===== */
const comparisonRows = [
    {
        feature: 'Backed by',
        gold: '✦ Physical gold bullion',
        points: 'Corporate promise',
    },
    {
        feature: 'Value over time',
        gold: '✦ Appreciates with gold market',
        points: 'Devalues or expires',
    },
    {
        feature: 'Expiry date',
        gold: '✦ Never expires',
        points: '12–24 months typical',
    },
    {
        feature: 'Transferable',
        gold: '✦ Yes — send to anyone',
        points: 'Usually locked to account',
    },
    {
        feature: 'Redeemable for cash',
        gold: '✦ Yes — anytime',
        points: 'Rarely',
    },
    {
        feature: 'Store of value',
        gold: '✦ 5,000 years of history',
        points: 'Only within one program',
    },
]

/* ===== PAGE COMPONENT ===== */
function GoldExplainer() {
    const goldPriceData = useQuery(api.goldPrice.getGoldPrice)
    // paxgUsd stores the full USD value of 1 PAXG token (1 troy ounce)
    const pricePerOunce = goldPriceData?.paxgUsd ?? (93.47 * 31.1035)

    return (
        <div className="gold-explainer">

            {/* ===== HERO ===== */}
            <section className="gold-hero">
                <div className="gold-hero-glow" />
                <div className="container">
                    <motion.div
                        className="gold-hero-eyebrow"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Coins size={14} /> Real Gold. Real Value.
                    </motion.div>

                    <motion.h1
                        className="text-display gold-hero-title"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 80, damping: 20, delay: 0.3 }}
                    >
                        Your Rewards Are Backed by{' '}
                        <span className="gold-word">Real Gold</span>
                    </motion.h1>

                    <motion.p
                        className="gold-hero-subtitle"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.6 }}
                    >
                        Every fraction of Karat Gold you earn represents physical gold bullion
                        stored in Brink's high-security vaults in London. Backed by Paxos Gold (PAXG) —
                        fully regulated, fully redeemable.
                    </motion.p>

                    <motion.div
                        className="gold-hero-visual"
                        initial="hidden"
                        animate="visible"
                    >
                        {[
                            { value: '1:1', label: '1 Token = 1 Troy Ounce' },
                            { value: 'LBMA', label: 'Certified Gold' },
                            { value: '~$' + pricePerOunce.toFixed(0), label: 'USD / Ounce' },
                        ].map((stat, i) => (
                            <motion.div
                                key={i}
                                className="gold-hero-stat"
                                variants={scaleIn}
                                custom={i + 3}
                            >
                                <span className="gold-hero-stat-value">{stat.value}</span>
                                <span className="gold-hero-stat-label">{stat.label}</span>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ===== HOW YOUR GOLD IS BACKED ===== */}
            <section className="gold-backing-section section">
                <div className="container">
                    <motion.div
                        className="section-header"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-80px" }}
                        variants={fadeUp}
                        custom={0}
                    >
                        <p className="text-caption" style={{ color: 'var(--gold-dark)' }}>How It Works</p>
                        <h2 className="text-h1" style={{ marginTop: 'var(--space-3)' }}>
                            From Your Post to Physical Gold
                        </h2>
                        <p className="text-body" style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-4)', maxWidth: '520px', margin: 'var(--space-4) auto 0' }}>
                            Here's exactly how your Karat Gold rewards connect to real gold in a vault.
                        </p>
                    </motion.div>

                    <motion.div
                        className="gold-backing-grid"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-60px" }}
                    >
                        {[
                            {
                                icon: <Building2 size={24} />,
                                title: 'Business Funds Campaign',
                                desc: 'A business creates a campaign and deposits funds. These funds are converted to PAXG (Paxos Gold) — a fully regulated, gold-backed token on Solana.',
                                num: '1',
                            },
                            {
                                icon: <Lock size={24} />,
                                title: 'Gold Is Vaulted',
                                desc: 'Physical gold bars — each stamped with a unique serial number — are stored in Brink\'s high-security vaults in London. Each PAXG token represents exactly 1 troy ounce (31.1g) of real gold.',
                                num: '2',
                            },
                            {
                                icon: <BadgeCheck size={24} />,
                                title: 'You Earn Real Fractions',
                                desc: 'When your post is verified, you receive fractional gold tokens directly into your wallet. Each full token represents exactly 1 troy ounce of real gold — no artificial conversion, no exchange rate.',
                                num: '3',
                            },
                        ].map((card, i) => (
                            <motion.div
                                key={i}
                                className="gold-backing-card"
                                variants={scaleIn}
                                custom={i}
                            >
                                <div className="gold-backing-card-number">{card.num}</div>
                                <div className="gold-backing-card-icon">{card.icon}</div>
                                <h3>{card.title}</h3>
                                <p>{card.desc}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ===== GOLD VS POINTS ===== */}
            <section className="gold-comparison-section">
                <div className="container">
                    <motion.div
                        className="section-header"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-80px" }}
                        variants={fadeUp}
                        custom={0}
                    >
                        <p className="text-caption" style={{ color: 'var(--gold-dark)' }}>Why Gold?</p>
                        <h2 className="text-h1" style={{ marginTop: 'var(--space-3)' }}>
                            Gold vs. Loyalty Points
                        </h2>
                        <p className="text-body" style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-4)', maxWidth: '480px', margin: 'var(--space-4) auto 0' }}>
                            Traditional rewards lose value. Gold has held its value for 5,000 years.
                        </p>
                    </motion.div>

                    <motion.div
                        className="comparison-table-wrapper"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                    >
                        <table className="comparison-table">
                            <thead>
                                <tr>
                                    <th></th>
                                    <th className="col-gold"><Coins size={16} style={{ marginRight: '6px', verticalAlign: 'text-bottom' }} /> Karat Gold</th>
                                    <th className="col-points">Loyalty Points</th>
                                </tr>
                            </thead>
                            <tbody>
                                {comparisonRows.map((row, i) => (
                                    <tr key={i}>
                                        <td>{row.feature}</td>
                                        <td>{row.gold}</td>
                                        <td>{row.points}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </motion.div>
                </div>
            </section>

            {/* ===== TRUST & REGULATION ===== */}
            <section className="gold-trust-section section">
                <div className="container">
                    <motion.div
                        className="section-header"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-80px" }}
                        variants={fadeUp}
                        custom={0}
                    >
                        <p className="text-caption" style={{ color: 'var(--accent-dark)' }}>Trust & Transparency</p>
                        <h2 className="text-h1" style={{ marginTop: 'var(--space-3)' }}>
                            Built on Trust, Not Promises
                        </h2>
                    </motion.div>

                    <motion.div
                        className="trust-cards"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-60px" }}
                    >
                        {[
                            {
                                icon: <Shield size={22} />,
                                title: 'LBMA Certified',
                                desc: 'All gold is certified by the London Bullion Market Association — the global standard for gold quality and authenticity. PAXG holds are fully attestable on-chain.',
                            },
                            {
                                icon: <Landmark size={22} />,
                                title: 'Regulated by NYDFS',
                                desc: 'Paxos Trust Company is regulated by the New York Department of Financial Services — one of the strictest financial regulators in the world.',
                            },
                            {
                                icon: <FileCheck size={22} />,
                                title: 'Independently Audited',
                                desc: 'Gold reserves are independently audited. Every bar is serial-numbered and linked to corresponding PAXG tokens on the Solana blockchain.',
                            },
                            {
                                icon: <Scale size={22} />,
                                title: 'Segregated Storage',
                                desc: 'Your gold is stored in Brink\'s high-security vaults in London — fully segregated and insured.',
                            },
                        ].map((card, i) => (
                            <motion.div key={i} className="trust-card" variants={fadeUp} custom={i}>
                                <div className="trust-card-icon">{card.icon}</div>
                                <div>
                                    <h4>{card.title}</h4>
                                    <p>{card.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ===== YOUR OPTIONS ===== */}
            <section className="gold-options-section">
                <div className="container">
                    <motion.div
                        className="section-header"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-80px" }}
                        variants={fadeUp}
                        custom={0}
                    >
                        <p className="text-caption" style={{ color: 'var(--gold-dark)' }}>Your Gold, Your Choice</p>
                        <h2 className="text-h1" style={{ marginTop: 'var(--space-3)' }}>
                            What Can You Do With Your Gold?
                        </h2>
                    </motion.div>

                    <motion.div
                        className="options-grid"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-60px" }}
                    >
                        {[
                            {
                                icon: <TrendingUp size={26} />,
                                title: 'Hold & Accumulate',
                                desc: 'Keep earning gold over time. As the price of gold rises, so does the value of your holdings.',
                            },
                            {
                                icon: <Wallet size={26} />,
                                title: 'Cash Out Anytime',
                                desc: 'Withdraw your gold as PAXG to your Solana wallet whenever you want. No minimums, no waiting periods.',
                            },
                            {
                                icon: <Truck size={26} />,
                                title: 'Physical Delivery via Paxos',
                                desc: 'Redeem your digital tokens for real gold bars delivered to your door through Paxos and their official retail partners.',
                            },
                        ].map((card, i) => (
                            <motion.div key={i} className="option-card" variants={scaleIn} custom={i}>
                                <div className="option-card-icon">{card.icon}</div>
                                <h4>{card.title}</h4>
                                <p>{card.desc}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ===== HOW TO REDEEM ===== */}
            <section className="gold-redemption-section section" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <div className="container">
                    <motion.div
                        className="section-header"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-80px" }}
                        variants={fadeUp}
                        custom={0}
                    >
                        <p className="text-caption" style={{ color: 'var(--text-secondary)' }}>Physical Fulfillment</p>
                        <h2 className="text-h1" style={{ marginTop: 'var(--space-3)' }}>
                            How to Take Physical Delivery
                        </h2>
                        <p className="text-body" style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-4)', maxWidth: '600px', margin: 'var(--space-4) auto 0' }}>
                            Karat Gold utilizes Paxos Gold (PAXG) infrastructure. Because you own the underlying asset, you can redeem your tokens for physical gold bars at any time through Paxos’ verified network.
                        </p>
                    </motion.div>

                    <div className="redemption-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-6)', marginTop: 'var(--space-10)' }}>
                        {/* Option 1: Paxos Direct */}
                        <motion.div
                            className="card"
                            style={{ padding: 'var(--space-8)' }}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                                <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                                    <Scale size={24} style={{ color: 'var(--text-primary)' }} />
                                </div>
                                <div>
                                    <h3 className="text-h4">Institutional Delivery</h3>
                                    <p className="text-caption" style={{ color: 'var(--gold-dark)' }}>via Paxos Direct</p>
                                </div>
                            </div>
                            <p className="text-body-sm" style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', minHeight: '66px' }}>
                                For holdings of 430 PAXG (approx 430 troy ounces) or more, redeem directly through pax.com for London Good Delivery bar shipments.
                            </p>
                            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                <li className="text-body-sm" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                    <span style={{ color: 'var(--accent)', marginTop: '2px' }}>✓</span> Create a verified Paxos account
                                </li>
                                <li className="text-body-sm" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                    <span style={{ color: 'var(--accent)', marginTop: '2px' }}>✓</span> Transfer tokens to your Paxos wallet
                                </li>
                                <li className="text-body-sm" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                    <span style={{ color: 'var(--accent)', marginTop: '2px' }}>✓</span> Request physical redemption via dashboard
                                </li>
                            </ul>
                            <a href="https://paxos.com/paxgold/" target="_blank" rel="noopener noreferrer" className="btn btn-secondary w-full" style={{ marginTop: 'var(--space-6)', width: '100%', justifyContent: 'center' }}>
                                Paxos Guidelines <ArrowUpRight size={16} />
                            </a>
                        </motion.div>

                        {/* Option 2: Retail Partners */}
                        <motion.div
                            className="card"
                            style={{ padding: 'var(--space-8)' }}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                                <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                                    <Truck size={24} style={{ color: 'var(--text-primary)' }} />
                                </div>
                                <div>
                                    <h3 className="text-h4">Retail Delivery</h3>
                                    <p className="text-caption" style={{ color: 'var(--gold-dark)' }}>via Paxos Partners</p>
                                </div>
                            </div>
                            <p className="text-body-sm" style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', minHeight: '66px' }}>
                                For holdings under 430 oz, use Paxos' retail partner network to redeem tokens for physical coins, 1oz bars, or 1kg bars shipped to your door.
                            </p>
                            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                <li className="text-body-sm" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                    <span style={{ color: 'var(--accent)', marginTop: '2px' }}>✓</span> Connect wallet to partner portal (e.g. Alpha Bullion)
                                </li>
                                <li className="text-body-sm" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                    <span style={{ color: 'var(--accent)', marginTop: '2px' }}>✓</span> Select your physical gold products
                                </li>
                                <li className="text-body-sm" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                    <span style={{ color: 'var(--accent)', marginTop: '2px' }}>✓</span> Provide secure shipping address
                                </li>
                            </ul>
                            <a href="https://alphabullion.com/" target="_blank" rel="noopener noreferrer" className="btn btn-secondary w-full" style={{ marginTop: 'var(--space-6)', width: '100%', justifyContent: 'center' }}>
                                Visit Alpha Bullion <ArrowUpRight size={16} />
                            </a>
                        </motion.div>
                    </div>

                    <div style={{ marginTop: 'var(--space-8)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', background: 'rgba(212,165,55,0.05)', border: '1px solid rgba(212,165,55,0.2)' }}>
                        <p className="text-body-sm" style={{ color: 'var(--text-secondary)', display: 'flex', gap: '12px' }}>
                            <Shield size={20} style={{ color: 'var(--gold)', flexShrink: 0, marginTop: '2px' }} />
                            <span><strong>No Middlemen:</strong> Karat does not handle physical gold delivery. We empower you with direct access to the underlying protocol (Paxos), ensuring you have full sovereignty over how and when you redeem your assets.</span>
                        </p>
                    </div>
                </div>
            </section>

            {/* ===== CTA ===== */}
            <section className="gold-cta-section">
                <div className="container">
                    <motion.div
                        className="gold-cta-card"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="text-h1">Start Earning Real Gold Today</h2>
                        <p className="text-body">
                            Support businesses you love and earn gold-backed rewards that actually appreciate in value.
                        </p>
                        <div className="gold-cta-buttons">
                            <Link to="/explore" className="btn btn-primary btn-lg">
                                Start Mining Gold <ArrowRight size={18} />
                            </Link>
                            <Link to="/" className="btn btn-outline-green btn-lg" style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)' }}>
                                Back to Home
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>
        </div>
    )
}

export default GoldExplainer

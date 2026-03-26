import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
    Wallet, ArrowRight, Coins, ShieldCheck, ArrowUpRight
} from 'lucide-react'
import './ExplainerPage.css'

const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }
    })
}

function HowCashoutWorks() {
    return (
        <div className="explainer-page">
            {/* Hero */}
            <section className="explainer-hero">
                <motion.div className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Wallet size={14} /> Your Gold, Your Wallet
                </motion.div>
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    How to <span style={{ color: 'var(--gold)' }}>Cash Out</span> Your Gold
                </motion.h1>
                <motion.p
                    className="subtitle"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    Withdraw your gold as PAXG tokens directly to your Solana wallet. No banks, no middlemen — just crypto.
                </motion.p>
            </section>

            {/* How It Works */}
            <section className="explainer-section">
                <div className="explainer-inner">
                    <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
                        Cash Out in 3 Steps
                    </motion.h2>

                    <motion.div className="step-cards" initial="hidden" whileInView="visible" viewport={{ once: true }}>
                        {[
                            { icon: <Wallet size={22} />, title: '1. Get a Solana Wallet', desc: 'Download Phantom, Coinbase, or any Solana-compatible wallet. You\'ll need your Solana wallet address to receive PAXG tokens.', num: '01' },
                            { icon: <Coins size={22} />, title: '2. Click "Cash Out"', desc: 'On your Rewards page, click Cash Out, enter the amount you want to withdraw, and paste your Solana wallet address.', num: '02' },
                            { icon: <ShieldCheck size={22} />, title: '3. Receive PAXG', desc: 'PAXG tokens are sent directly to your wallet on the Solana network. Each token is backed by 1 troy ounce of real gold stored in London vaults.', num: '03' },
                        ].map((step, i) => (
                            <motion.div key={i} className="step-card" variants={fadeUp} custom={i}>
                                <div className="step-card-num">{step.num}</div>
                                <div className="step-card-icon">{step.icon}</div>
                                <h3>{step.title}</h3>
                                <p>{step.desc}</p>
                            </motion.div>
                        ))}
                    </motion.div>

                    <div style={{ marginTop: 'var(--space-6)' }}>
                        <Link to="/coinbase-guide" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--accent)', fontSize: '0.9rem', fontWeight: 500, textDecoration: 'none' }}>
                            Need help? Read our Wallet Setup Guide <ArrowUpRight size={14} />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Key Details */}
            <section className="explainer-section">
                <div className="explainer-inner">
                    <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
                        Key Details
                    </motion.h2>

                    <motion.div className="step-cards" initial="hidden" whileInView="visible" viewport={{ once: true }} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
                        <motion.div className="step-card" variants={fadeUp} custom={0} style={{ borderColor: 'rgba(212, 165, 55, 0.2)' }}>
                            <div className="step-card-icon">
                                <Coins size={24} />
                            </div>
                            <h3>What is PAXG?</h3>
                            <p>PAX Gold (PAXG) is a cryptocurrency token where each token is backed by one fine troy ounce of gold stored in Brink's vaults in London. It's real gold, on the blockchain.</p>
                        </motion.div>
                        <motion.div className="step-card" variants={fadeUp} custom={1} style={{ borderColor: 'rgba(74, 222, 128, 0.2)' }}>
                            <div className="step-card-icon" style={{ background: 'rgba(74, 222, 128, 0.08)', color: 'var(--green-400)' }}>
                                <ShieldCheck size={24} />
                            </div>
                            <h3>Speed & Fees</h3>
                            <p>Transfers arrive in ~2 minutes on the Solana network. Gas fees are approximately $0.01 — far cheaper than traditional bank transfers.</p>
                        </motion.div>
                        <motion.div className="step-card" variants={fadeUp} custom={2} style={{ borderColor: 'rgba(212, 165, 55, 0.2)' }}>
                            <div className="step-card-icon">
                                <Wallet size={24} />
                            </div>
                            <h3>After Receiving</h3>
                            <p>Hold your PAXG for gold price appreciation, swap it for USDC or SOL on any Solana DEX, or transfer it to an exchange to sell for fiat currency.</p>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* CTA */}
            <section className="explainer-cta">
                <motion.div
                    className="explainer-cta-card"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2>Ready to Cash Out?</h2>
                    <p>Head to your Rewards page to withdraw your gold to your Solana wallet.</p>
                    <div className="explainer-cta-buttons">
                        <Link to="/rewards" className="btn btn-primary btn-lg">
                            Go to Rewards <ArrowRight size={18} />
                        </Link>
                        <Link to="/gold" className="btn btn-outline-green btn-lg" style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}>
                            Learn About Gold
                        </Link>
                    </div>
                </motion.div>
            </section>
        </div>
    )
}

export default HowCashoutWorks

import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
    CreditCard, Wallet, ArrowRight, Zap, Clock,
    Building2, Coins, ShieldCheck, ArrowUpRight
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
                    <Wallet size={14} /> Your Gold, Your Choice
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
                    Choose your preferred method: Canadian dollars to your bank account, or real gold tokens to your crypto wallet.
                </motion.p>
            </section>

            {/* The Two Options */}
            <section className="explainer-section">
                <div className="explainer-inner">
                    <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
                        Two Ways to Cash Out
                    </motion.h2>

                    <motion.div className="step-cards" initial="hidden" whileInView="visible" viewport={{ once: true }} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                        {/* Option A */}
                        <motion.div className="step-card" variants={fadeUp} custom={0} style={{ borderColor: 'rgba(74, 222, 128, 0.2)' }}>
                            <div className="step-card-icon" style={{ background: 'rgba(74, 222, 128, 0.08)', color: 'var(--green-400)' }}>
                                <CreditCard size={24} />
                            </div>
                            <h3>💳 Option A: Cash Out in CAD</h3>
                            <p>Get Canadian dollars sent directly to your bank account or debit card via Stripe Connect.</p>
                            <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                                    <Zap size={14} style={{ color: 'var(--green-400)' }} />
                                    <span><strong>Instant</strong> to debit card (~30 min, 1% fee)</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                                    <Clock size={14} style={{ color: 'var(--text-tertiary)' }} />
                                    <span><strong>Standard</strong> to bank account (2-3 days, free)</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                                    <Building2 size={14} style={{ color: 'var(--text-tertiary)' }} />
                                    <span>Powered by <strong>Stripe</strong> — trusted by millions</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Option B */}
                        <motion.div className="step-card" variants={fadeUp} custom={1} style={{ borderColor: 'rgba(212, 165, 55, 0.2)' }}>
                            <div className="step-card-icon">
                                <Coins size={24} />
                            </div>
                            <h3>🪙 Option B: Get Real Gold (PAXG)</h3>
                            <p>Receive PAXG tokens — each backed by one troy ounce of physical gold in London vaults.</p>
                            <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                                    <ShieldCheck size={14} style={{ color: 'var(--gold)' }} />
                                    <span>Backed by <strong>real gold</strong> in Brink's vaults</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                                    <Wallet size={14} style={{ color: 'var(--text-tertiary)' }} />
                                    <span>Sent to your <strong>crypto wallet</strong> (Coinbase, etc.)</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                                    <Coins size={14} style={{ color: 'var(--text-tertiary)' }} />
                                    <span>Hold for <strong>gold price appreciation</strong></span>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Comparison Table */}
            <section className="explainer-section">
                <div className="explainer-inner">
                    <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
                        Side-by-Side Comparison
                    </motion.h2>

                    <table className="compare-table">
                        <thead>
                            <tr>
                                <th></th>
                                <th style={{ color: 'var(--green-400)' }}>💳 CAD Cash Out</th>
                                <th className="col-highlight">🪙 PAXG Gold</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ fontWeight: 500 }}>What you receive</td>
                                <td>Canadian Dollars (CAD)</td>
                                <td className="col-highlight">PAXG gold tokens</td>
                            </tr>
                            <tr>
                                <td style={{ fontWeight: 500 }}>Speed (instant)</td>
                                <td>~30 minutes to debit card</td>
                                <td className="col-highlight">~2 minutes on blockchain</td>
                            </tr>
                            <tr>
                                <td style={{ fontWeight: 500 }}>Speed (standard)</td>
                                <td>2-3 business days to bank</td>
                                <td className="col-highlight">Same (~2 minutes)</td>
                            </tr>
                            <tr>
                                <td style={{ fontWeight: 500 }}>Fee</td>
                                <td>Free (bank) or 1% (instant debit)</td>
                                <td className="col-highlight">~$0.01 (Solana gas fee)</td>
                            </tr>
                            <tr>
                                <td style={{ fontWeight: 500 }}>Setup required</td>
                                <td>Connect bank/debit via Stripe</td>
                                <td className="col-highlight">Crypto wallet address (e.g. Coinbase)</td>
                            </tr>
                            <tr>
                                <td style={{ fontWeight: 500 }}>After receiving</td>
                                <td>It's cash — spend however you want</td>
                                <td className="col-highlight">Hold for gold appreciation, or sell anytime</td>
                            </tr>
                            <tr>
                                <td style={{ fontWeight: 500 }}>Minimum</td>
                                <td>$10 CAD</td>
                                <td className="col-highlight">$50 CAD equivalent</td>
                            </tr>
                            <tr>
                                <td style={{ fontWeight: 500 }}>Best for</td>
                                <td>Quick everyday spending</td>
                                <td className="col-highlight">Long-term gold investment</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            {/* How to Set Up Stripe Connect */}
            <section className="explainer-section" id="setup-stripe">
                <div className="explainer-inner">
                    <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
                        <span className="section-num">A</span> Setting Up CAD Payouts
                    </motion.h2>
                    <p>One-time setup to link your bank account or debit card:</p>

                    <motion.div className="step-cards" initial="hidden" whileInView="visible" viewport={{ once: true }}>
                        {[
                            { icon: <CreditCard size={22} />, title: '1. Click "Cash Out"', desc: 'On your Rewards page, click the Cash Out button and select "Cash Out in CAD."', num: '01' },
                            { icon: <Building2 size={22} />, title: '2. Connect via Stripe', desc: 'You\'ll be redirected to Stripe\'s secure onboarding. Enter your name, date of birth, and bank or debit card details.', num: '02' },
                            { icon: <Zap size={22} />, title: '3. Start Cashing Out', desc: 'Once connected, enter any amount and choose instant (debit card) or standard (bank deposit). Money arrives automatically!', num: '03' },
                        ].map((step, i) => (
                            <motion.div key={i} className="step-card" variants={fadeUp} custom={i}>
                                <div className="step-card-num">{step.num}</div>
                                <div className="step-card-icon">{step.icon}</div>
                                <h3>{step.title}</h3>
                                <p>{step.desc}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* How to Get PAXG */}
            <section className="explainer-section" id="setup-paxg">
                <div className="explainer-inner">
                    <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
                        <span className="section-num">B</span> Getting Real Gold (PAXG)
                    </motion.h2>
                    <p>Convert your gold balance to actual PAXG tokens on the blockchain:</p>

                    <motion.div className="step-cards" initial="hidden" whileInView="visible" viewport={{ once: true }}>
                        {[
                            { icon: <Wallet size={22} />, title: '1. Get a Wallet', desc: 'Download Coinbase or any Solana-compatible wallet. You\'ll need a USDC receive address on the Solana network.', num: '01' },
                            { icon: <Coins size={22} />, title: '2. Click "Get Real Gold"', desc: 'On the Cash Out modal, select "Get Real Gold" and paste your wallet address. Enter the amount you want to convert.', num: '02' },
                            { icon: <ShieldCheck size={22} />, title: '3. Receive Your Gold', desc: 'Your gold is converted and sent to your wallet as PAXG — each token backed by 1 troy ounce of real gold in London vaults.', num: '03' },
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
                            Need help? Read our Coinbase Setup Guide <ArrowUpRight size={14} />
                        </Link>
                    </div>
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
                    <p>Head to your Rewards page to start withdrawing your gold.</p>
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

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
    Coins, Camera, ShieldCheck, Wallet, Search, Upload,
    ArrowRight, ChevronDown, Sparkles, CheckCircle2
} from 'lucide-react'
import './ExplainerPage.css'

const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }
    })
}

function FAQ({ items }: { items: { q: string; a: string }[] }) {
    const [openIndex, setOpenIndex] = useState<number | null>(null)
    return (
        <div className="faq-list">
            {items.map((item, i) => (
                <div key={i} className="faq-item">
                    <button className="faq-question" onClick={() => setOpenIndex(openIndex === i ? null : i)}>
                        {item.q}
                        <ChevronDown size={18} className={`faq-chevron ${openIndex === i ? 'open' : ''}`} />
                    </button>
                    {openIndex === i && (
                        <motion.div
                            className="faq-answer"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            transition={{ duration: 0.2 }}
                        >
                            {item.a}
                        </motion.div>
                    )}
                </div>
            ))}
        </div>
    )
}

function HowItWorksCustomer() {
    return (
        <div className="explainer-page">
            {/* Hero */}
            <section className="explainer-hero">
                <motion.div className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Coins size={14} /> For Customers
                </motion.div>
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    How to Earn <span style={{ color: 'var(--gold)' }}>Gold</span> on KaratGold
                </motion.h1>
                <motion.p
                    className="subtitle"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    Discover businesses, share authentic content, and get rewarded with real gold. Here's everything you need to know.
                </motion.p>
            </section>

            {/* How to Earn */}
            <section className="explainer-section" id="earn">
                <div className="explainer-inner">
                    <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
                        <span className="section-num">1</span> How to Earn Gold
                    </motion.h2>
                    <p>Earning gold is simple — find a campaign, share your experience, and get paid. Here's the step-by-step:</p>

                    <motion.div className="step-cards" initial="hidden" whileInView="visible" viewport={{ once: true }}>
                        {[
                            { icon: <Search size={22} />, title: 'Browse Campaigns', desc: 'Visit the Explore page to find active campaigns from businesses near you. Each shows the reward amount and what\'s required.', num: '01' },
                            { icon: <Camera size={22} />, title: 'Visit & Post', desc: 'Visit the business, take a photo, and post it on Instagram or Facebook. Tag the business and include #KaratGold.', num: '02' },
                            { icon: <Upload size={22} />, title: 'Submit Your Post', desc: 'Go to the Submit page, select the campaign, and paste your post URL or upload a screenshot. That\'s it!', num: '03' },
                            { icon: <Coins size={22} />, title: 'Earn Gold', desc: 'Once verified, gold is instantly credited to your balance. Hold it, cash it out, or convert to real PAXG gold tokens.', num: '04' },
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

            {/* Verification */}
            <section className="explainer-section" id="verification">
                <div className="explainer-inner">
                    <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
                        <span className="section-num">2</span> How Verification Works
                    </motion.h2>
                    <p>Every post goes through verification to ensure quality and authenticity. There are two methods:</p>

                    <motion.div className="step-cards" initial="hidden" whileInView="visible" viewport={{ once: true }} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                        <motion.div className="step-card" variants={fadeUp} custom={0}>
                            <div className="step-card-icon"><Sparkles size={22} /></div>
                            <h3>AI Auto-Verify</h3>
                            <p>Our AI scans your post to confirm it mentions the business and meets requirements. Results in seconds — no waiting!</p>
                            <div style={{ marginTop: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--green-400)', fontSize: '0.8rem', fontWeight: 500 }}>
                                <CheckCircle2 size={14} /> Instant approval
                            </div>
                        </motion.div>
                        <motion.div className="step-card" variants={fadeUp} custom={1}>
                            <div className="step-card-icon"><ShieldCheck size={22} /></div>
                            <h3>Manual Review</h3>
                            <p>The business owner personally reviews your submission and decides to approve or reject it. Typically takes 24-48 hours.</p>
                            <div style={{ marginTop: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 6, color: '#fbbf24', fontSize: '0.8rem', fontWeight: 500 }}>
                                <ShieldCheck size={14} /> Human reviewed
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Understanding Balance */}
            <section className="explainer-section" id="balance">
                <div className="explainer-inner">
                    <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
                        <span className="section-num">3</span> Understanding Your Balance
                    </motion.h2>
                    <p>Your balance is displayed in <strong>gold ounces</strong> with a live CAD equivalent. Here's how it works:</p>
                    <ul style={{ color: 'var(--text-secondary)', lineHeight: 2, paddingLeft: 'var(--space-5)' }}>
                        <li><strong>Gold ounces:</strong> The actual amount of gold you own. This number only changes when you earn or cash out.</li>
                        <li><strong>CAD value:</strong> Calculated in real-time using the current gold spot price. This fluctuates daily.</li>
                        <li><strong>If gold goes up:</strong> Your CAD value increases even without earning more. You benefit from gold appreciation!</li>
                        <li><strong>Total Earned:</strong> Lifetime gold earned across all campaigns.</li>
                        <li><strong>Total Cashed Out:</strong> Total gold you've withdrawn via CAD or crypto.</li>
                    </ul>
                </div>
            </section>

            {/* How to Cash Out */}
            <section className="explainer-section" id="cashout">
                <div className="explainer-inner">
                    <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
                        <span className="section-num">4</span> How to Cash Out
                    </motion.h2>
                    <p>Withdraw your gold as PAXG tokens directly to your Solana wallet:</p>

                    <motion.div className="step-cards" initial="hidden" whileInView="visible" viewport={{ once: true }} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                        <motion.div className="step-card" variants={fadeUp} custom={0}>
                            <div className="step-card-icon"><Wallet size={22} /></div>
                            <h3>Withdraw to Solana Wallet</h3>
                            <p>Enter your Solana wallet address (Phantom, Coinbase, etc.) and receive PAXG tokens — real gold backed by Paxos, stored in London vaults. Transfers arrive in ~2 minutes with minimal gas fees.</p>
                            <Link to="/how-cashout-works" className="btn btn-secondary" style={{ marginTop: 'var(--space-4)', fontSize: '0.85rem' }}>
                                Learn More <ArrowRight size={14} />
                            </Link>
                        </motion.div>
                        <motion.div className="step-card" variants={fadeUp} custom={1}>
                            <div className="step-card-icon"><Coins size={22} /></div>
                            <h3>Hold or Swap</h3>
                            <p>Once in your wallet, hold PAXG for gold price appreciation, swap for USDC or SOL on any Solana DEX, or transfer to an exchange to convert to fiat.</p>
                            <Link to="/gold" className="btn btn-secondary" style={{ marginTop: 'var(--space-4)', fontSize: '0.85rem' }}>
                                About PAXG <ArrowRight size={14} />
                            </Link>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* FAQ */}
            <section className="explainer-section" id="faq">
                <div className="explainer-inner">
                    <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
                        Frequently Asked Questions
                    </motion.h2>
                    <FAQ items={[
                        { q: 'Is the gold real?', a: 'Yes. Your gold balance is backed by PAXG (Paxos Gold), which represents physical gold bullion stored in Brink\'s high-security vaults in London. Each token is fully redeemable.' },
                        { q: 'How much can I earn per post?', a: 'It depends on the campaign. Businesses set their own reward amounts, typically ranging from 0.001 to 0.01 oz per post (roughly $3 - $30 CAD).' },
                        { q: 'Is there a minimum to cash out?', a: 'Yes — the minimum cashout is $10 CAD equivalent. This keeps transaction fees reasonable for everyone.' },
                        { q: 'Do I need Instagram to participate?', a: 'Instagram and Facebook are currently supported. We\'re adding more platforms soon. You need at least one active social account.' },
                        { q: 'What happens if my post is rejected?', a: 'You\'ll see the rejection status on your Rewards page with the reason. You can resubmit a corrected post to the same campaign if it\'s still active.' },
                        { q: 'Can I cash out to both CAD and crypto?', a: 'Absolutely! You can split your balance however you want. Cash some out via bank deposit and convert the rest to PAXG tokens.' },
                    ]} />
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
                    <h2>Ready to Start Earning?</h2>
                    <p>Browse available campaigns and earn your first gold today.</p>
                    <div className="explainer-cta-buttons">
                        <Link to="/explore" className="btn btn-primary btn-lg">
                            Browse Campaigns <ArrowRight size={18} />
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

export default HowItWorksCustomer

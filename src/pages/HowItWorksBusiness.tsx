import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
    Briefcase, DollarSign, BarChart3, Users, ShieldCheck,
    ArrowRight, ChevronDown, Megaphone, CheckCircle2
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

function HowItWorksBusiness() {
    return (
        <div className="explainer-page">
            {/* Hero */}
            <section className="explainer-hero">
                <motion.div className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Briefcase size={14} /> For Businesses
                </motion.div>
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    Turn Customers Into <span style={{ color: 'var(--gold)' }}>Ambassadors</span>
                </motion.h1>
                <motion.p
                    className="subtitle"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    Create campaigns, fund your gold pool, and only pay when real customers create authentic content about your business.
                </motion.p>
            </section>

            {/* How Campaigns Work */}
            <section className="explainer-section" id="campaigns">
                <div className="explainer-inner">
                    <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
                        <span className="section-num">1</span> How Campaigns Work
                    </motion.h2>
                    <p>A campaign is your way of telling customers: "Post about us, and we'll pay you in gold." Here's the lifecycle:</p>

                    <div className="flow-diagram">
                        <div className="flow-node highlight">Fund Pool</div>
                        <span className="flow-arrow">→</span>
                        <div className="flow-node">Create Campaign</div>
                        <span className="flow-arrow">→</span>
                        <div className="flow-node">Users Post</div>
                        <span className="flow-arrow">→</span>
                        <div className="flow-node">Verify</div>
                        <span className="flow-arrow">→</span>
                        <div className="flow-node highlight">Gold Paid</div>
                    </div>

                    <motion.div className="step-cards" initial="hidden" whileInView="visible" viewport={{ once: true }}>
                        {[
                            { icon: <Megaphone size={22} />, title: 'Set Campaign Details', desc: 'Choose a title, description, which platforms (Instagram/Facebook), reward amount per post, and max submissions.', num: '01' },
                            { icon: <Users size={22} />, title: 'Customers Discover', desc: 'Active campaigns appear on the Explore page. Local customers browse and find your campaign.', num: '02' },
                            { icon: <ShieldCheck size={22} />, title: 'Posts Get Verified', desc: 'Submitted posts are automatically verified by AI or manually reviewed by you — your choice.', num: '03' },
                            { icon: <DollarSign size={22} />, title: 'Gold Auto-Distributes', desc: 'Verified posts instantly credit the customer\'s gold balance from your campaign pool. You only pay for real content.', num: '04' },
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

            {/* Funding */}
            <section className="explainer-section" id="funding">
                <div className="explainer-inner">
                    <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
                        <span className="section-num">2</span> Funding Your Pool
                    </motion.h2>
                    <p>Before creating campaigns, you fund your gold pool. Funds are converted to gold at the current market rate.</p>

                    <motion.div className="step-cards" initial="hidden" whileInView="visible" viewport={{ once: true }} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
                        <motion.div className="step-card" variants={fadeUp} custom={0}>
                            <div className="step-card-icon"><DollarSign size={22} /></div>
                            <h3>Pay with Credit Card</h3>
                            <p>Click "Fund Pool" on your dashboard. Enter an amount ($100 CAD minimum) and pay securely via Stripe.</p>
                        </motion.div>
                        <motion.div className="step-card" variants={fadeUp} custom={1}>
                            <div className="step-card-icon"><BarChart3 size={22} /></div>
                            <h3>20% Platform Fee</h3>
                            <p>When you create a campaign, 20% goes to KaratGold's treasury and 80% funds rewards. This covers verification, AI, and platform costs.</p>
                        </motion.div>
                        <motion.div className="step-card" variants={fadeUp} custom={2}>
                            <div className="step-card-icon"><CheckCircle2 size={22} /></div>
                            <h3>Instant Gold Conversion</h3>
                            <p>Your CAD is converted to gold ounces at the live spot price. Your pool balance updates in real-time.</p>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Verification */}
            <section className="explainer-section" id="verification">
                <div className="explainer-inner">
                    <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
                        <span className="section-num">3</span> Verification Methods
                    </motion.h2>
                    <p>You choose how post submissions are verified:</p>

                    <table className="compare-table">
                        <thead>
                            <tr>
                                <th></th>
                                <th className="col-highlight">✦ AI Auto-Verify</th>
                                <th>Manual Review</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ fontWeight: 500 }}>Speed</td>
                                <td className="col-highlight">Seconds</td>
                                <td>24-48 hours</td>
                            </tr>
                            <tr>
                                <td style={{ fontWeight: 500 }}>How it works</td>
                                <td className="col-highlight">AI scans the post for your business tag and content quality</td>
                                <td>You review each submission on your dashboard</td>
                            </tr>
                            <tr>
                                <td style={{ fontWeight: 500 }}>Best for</td>
                                <td className="col-highlight">High-volume campaigns with simple requirements</td>
                                <td>Premium campaigns requiring specific content quality</td>
                            </tr>
                            <tr>
                                <td style={{ fontWeight: 500 }}>Your effort</td>
                                <td className="col-highlight">None — fully automated</td>
                                <td>Review each post individually</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Understanding Dashboard */}
            <section className="explainer-section" id="dashboard">
                <div className="explainer-inner">
                    <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
                        <span className="section-num">4</span> Understanding Your Dashboard
                    </motion.h2>
                    <p>Your business dashboard gives you full visibility into performance:</p>
                    <ul style={{ color: 'var(--text-secondary)', lineHeight: 2, paddingLeft: 'var(--space-5)' }}>
                        <li><strong>Gold Pool:</strong> Your current balance available for campaign rewards.</li>
                        <li><strong>Active Campaigns:</strong> Campaigns currently accepting submissions.</li>
                        <li><strong>Pending Reviews:</strong> Submissions waiting for your manual approval (if using manual verification).</li>
                        <li><strong>Total Funded:</strong> Lifetime amount deposited into your gold pool.</li>
                        <li><strong>Submissions:</strong> Total posts received across all campaigns with approval/rejection stats.</li>
                    </ul>
                </div>
            </section>

            {/* FAQ */}
            <section className="explainer-section" id="faq">
                <div className="explainer-inner">
                    <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
                        Frequently Asked Questions
                    </motion.h2>
                    <FAQ items={[
                        { q: 'How much does it cost to get started?', a: 'The minimum deposit is $100 CAD. There are no monthly fees — you only pay when customers create verified content.' },
                        { q: 'Can I pause a campaign?', a: 'Yes, you can pause and resume campaigns anytime from your dashboard. Paused campaigns are hidden from the Explore page.' },
                        { q: 'What happens to unused funds?', a: 'Unused funds remain in your gold pool. They\'re available for future campaigns and their value may appreciate with gold prices.' },
                        { q: 'How do I know posts are real?', a: 'AI verification scans for the correct business tag, content relevance, and posting authenticity. Manual review gives you full control to approve only posts that meet your standards.' },
                        { q: 'Is there a contract or commitment?', a: 'No contracts. Fund campaigns when you want, pause when you don\'t. KaratGold is entirely pay-per-performance.' },
                        { q: 'What social platforms are supported?', a: 'Currently Instagram and Facebook. We\'re expanding to TikTok and Google Reviews soon.' },
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
                    <h2>Ready to Launch Your First Campaign?</h2>
                    <p>Fund your pool, create a campaign, and start getting real exposure from real customers.</p>
                    <div className="explainer-cta-buttons">
                        <Link to="/dashboard" className="btn btn-primary btn-lg">
                            Go to Dashboard <ArrowRight size={18} />
                        </Link>
                    </div>
                </motion.div>
            </section>
        </div>
    )
}

export default HowItWorksBusiness

import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink, ShieldCheck, Wallet, AlertTriangle } from 'lucide-react'
import './CoinbaseGuide.css'

function CoinbaseGuide() {
    return (
        <div className="coinbase-guide-page">
            <motion.div
                className="guide-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <div className="guide-container">
                    <Link to="/rewards" className="back-link">
                        <ArrowLeft size={16} /> Back to Rewards
                    </Link>
                    <h1 className="text-display">How to Cash Out</h1>
                    <p className="text-body-lg" style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
                        Karat Gold uses USDC (a digital dollar) on the Solana network to send your cash out instantly, with near-zero fees. Here's how to receive it using Coinbase.
                    </p>
                </div>
            </motion.div>

            <div className="guide-container">
                <main className="guide-content">
                    {/* Step 1 */}
                    <motion.section
                        className="guide-step card-solid"
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="step-number">1</div>
                        <div className="step-info">
                            <h2 className="text-h3">Get a Coinbase Account</h2>
                            <p className="text-body" style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
                                If you don't already have one, download the Coinbase app or visit their website to create a free account. Coinbase is one of the most trusted and secure platforms for buying, selling, and cashing out digital dollars into your bank account.
                            </p>
                            <a href="https://www.coinbase.com/" target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ marginTop: 'var(--space-4)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                Visit Coinbase <ExternalLink size={16} />
                            </a>
                        </div>
                    </motion.section>

                    {/* Step 2 */}
                    <motion.section
                        className="guide-step card-solid"
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="step-number">2</div>
                        <div className="step-info">
                            <h2 className="text-h3">Find Your Receive Address</h2>
                            <p className="text-body" style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
                                Once logged in, open the Coinbase app or website and follow these steps to find where we should send your money:
                            </p>
                            <ul className="guide-list">
                                <li>Tap or click the <strong>"Receive"</strong> button (often near the top or under "Transfer").</li>
                                <li>The asset should be set to what you want to receive. If it's not already USDC, tap the current asset name and search for <strong>USDC</strong>.</li>
                                <li>Select <strong>USD Coin (USDC)</strong> from the list.</li>
                            </ul>
                        </div>
                    </motion.section>

                    {/* Step 3 */}
                    <motion.section
                        className="guide-step card-solid highlight-step"
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="highlight-badge">
                            <AlertTriangle size={14} /> Critical Step
                        </div>
                        <div className="step-number" style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>3</div>
                        <div className="step-info">
                            <h2 className="text-h3">Select the Solana Network</h2>
                            <p className="text-body" style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
                                By default, Coinbase might show the "Ethereum" network for USDC. <strong>You MUST change this to Solana</strong>. Our platform sends funds on the Solana network because it is 10,000x cheaper and 400x faster than Ethereum.
                            </p>
                            <ul className="guide-list critical-list">
                                <li>On the Receive screen, tap the network dropdown (it might say "Network: Ethereum").</li>
                                <li>Select <strong>Solana</strong> from the list of networks.</li>
                                <li>You will see a warning that sending to the wrong network will result in lost funds. Acknowledge this, because we are indeed sending on Solana!</li>
                            </ul>
                        </div>
                    </motion.section>

                    {/* Step 4 */}
                    <motion.section
                        className="guide-step card-solid"
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="step-number">4</div>
                        <div className="step-info">
                            <h2 className="text-h3">Copy and Paste the Address</h2>
                            <p className="text-body" style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
                                You will now see a QR code and a long string of letters and numbers (your address).
                            </p>
                            <ul className="guide-list">
                                <li>Tap the <strong>Copy</strong> button next to your USDC (Solana) address.</li>
                                <li>Come back to the Karat Gold Cash Out popup.</li>
                                <li>Paste that address into the "Transfer Destination" field.</li>
                            </ul>
                        </div>
                    </motion.section>

                    {/* Step 5 */}
                    <motion.section
                        className="guide-step card-solid"
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="step-number">5</div>
                        <div className="step-info">
                            <h2 className="text-h3">Cash Out!</h2>
                            <p className="text-body" style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
                                Once you paste the address and click Confirm, our automated system will convert your gold into USDC and instantly beam it to your Coinbase account. From there, you can cash it out directly to your Canadian bank account via Interac e-Transfer or linked bank account.
                            </p>
                            <div className="guide-action">
                                <Link to="/rewards" className="btn btn-primary btn-lg">
                                    <Wallet size={18} /> Take Me to Cash Out
                                </Link>
                            </div>
                        </div>
                    </motion.section>
                </main>

                <aside className="guide-sidebar">
                    <div className="info-card card-solid">
                        <ShieldCheck size={28} style={{ color: 'var(--accent)', marginBottom: 'var(--space-3)' }} />
                        <h3 className="text-h4">Why Crypto? Why Not e-Transfer?</h3>
                        <p className="text-body-sm" style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-3)' }}>
                            We use Solana blockchain architecture to instantly process payouts 24/7/365 without manual human approval or banking wait times. By using crypto rails behind the scenes, you receive your reward the exact second you request it.
                        </p>
                        <p className="text-body-sm" style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-3)' }}>
                            USDC is a "stablecoin", meaning 1 USDC is always worth 1 US Dollar. It never fluctuates like Bitcoin. Once it lands in Coinbase, you can immediately withdraw it to your real bank account.
                        </p>
                    </div>
                </aside>
            </div>
        </div>
    )
}

export default CoinbaseGuide

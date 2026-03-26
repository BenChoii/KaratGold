import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUpRight, TrendingUp, Clock, CheckCircle2, X, ShieldCheck, ExternalLink, Coins, HelpCircle, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation } from 'convex/react'
import { useUser } from '@clerk/clerk-react'
import { api } from '../../convex/_generated/api'
import { AnimatedCounter } from '../components/AnimatedCounter'
import './CustomerRewards.css'


function CustomerRewards() {
    const { user: clerkUser } = useUser()
    const [showCashout, setShowCashout] = useState(false)
    const [cashoutAmount, setCashoutAmount] = useState('')
    const [walletAddress, setWalletAddress] = useState('')
    const [cashoutLoading, setCashoutLoading] = useState(false)
    const cashOut = useMutation(api.rewards.cashOut)

    const goldPriceData = useQuery(api.goldPrice.getGoldPrice)
    const GOLD_PRICE_PER_OUNCE = goldPriceData?.paxgCad ?? 2900

    const convexUser = useQuery(api.users.getByClerkId, {
        clerkId: clerkUser?.id ?? "none",
    })

    const balance = useQuery(
        api.rewards.getBalance,
        convexUser ? { userId: convexUser._id } : "skip"
    )

    const activity = useQuery(
        api.rewards.getActivity,
        convexUser ? { userId: convexUser._id } : "skip"
    )

    const handleCryptoCashout = async () => {
        const cadAmt = parseFloat(cashoutAmount)
        if (!cadAmt || cadAmt <= 0 || cadAmt > (balance?.balanceCAD ?? 0) || !convexUser || !walletAddress.trim()) return
        setCashoutLoading(true)
        try {
            const goldAmt = cadAmt / GOLD_PRICE_PER_OUNCE
            await cashOut({
                userId: convexUser._id,
                amount: goldAmt,
                walletAddress: walletAddress.trim()
            })
            setShowCashout(false)
            setCashoutAmount('')
            setWalletAddress('')
        } catch (err) {
            console.error('Cashout error:', err)
        } finally {
            setCashoutLoading(false)
        }
    }

    if (!convexUser || !balance) {
        return (
            <div className="rewards-page">
                <div className="container">
                    <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: 'var(--space-12)' }}>
                        Loading your rewards...
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="rewards-page">
            <div className="container">
                {/* ===== BALANCE CARD ===== */}
                <motion.div
                    className="balance-section card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.01, rotateX: 2, rotateY: -2 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    style={{ perspective: 1000 }}
                >
                    <p className="text-caption" style={{ color: 'var(--text-secondary)' }}>Your Gold</p>
                    <h1 className="text-number-lg balance-amount">
                        <AnimatedCounter value={balance.goldBalance} decimals={3} suffix=" oz" />
                    </h1>
                    <p className="balance-ounces">
                        $<AnimatedCounter value={balance.balanceCAD} decimals={2} /> CAD at today's price
                    </p>
                    <p className="balance-spot">1 oz = ${GOLD_PRICE_PER_OUNCE.toFixed(2)} CAD</p>

                    <div className="balance-chart">
                        <svg viewBox="0 0 400 80" className="trend-line">
                            <defs>
                                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="var(--green-400)" stopOpacity="0.3" />
                                    <stop offset="100%" stopColor="var(--green-400)" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <motion.path
                                d="M0,60 C30,55 60,50 100,45 C140,40 170,48 200,35 C230,22 260,30 300,20 C340,10 370,15 400,8"
                                fill="none"
                                stroke="var(--green-400)"
                                strokeWidth="2"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 1.5, ease: "easeInOut" }}
                            />
                            <path
                                d="M0,60 C30,55 60,50 100,45 C140,40 170,48 200,35 C230,22 260,30 300,20 C340,10 370,15 400,8 V80 H0 Z"
                                fill="url(#lineGrad)"
                            />
                        </svg>
                    </div>

                    <div className="balance-actions">
                        <button className="btn btn-primary btn-lg" onClick={() => setShowCashout(true)}>
                            <ArrowUpRight size={18} />
                            Cash Out
                        </button>
                        <button className="btn btn-secondary btn-lg" onClick={() => window.location.href = '/explore'}>
                            <TrendingUp size={18} />
                            Earn More
                        </button>
                    </div>

                    {/* Learn More + Verified badge */}
                    <div className="verified-badge-row" style={{ justifyContent: 'space-between' }}>
                        <Link to="/how-it-works/customer#balance" className="learn-more-link">
                            <HelpCircle size={14} /> How your balance works
                        </Link>
                        <div className="verified-badge">
                            <ShieldCheck size={14} />
                            <span>Blockchain Verified</span>
                        </div>
                    </div>
                </motion.div>

                {/* ===== QUICK STATS ===== */}
                <motion.div
                    className="quick-stats"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.15 }}
                >
                    <motion.div whileHover={{ y: -4 }} className="stat-card card-solid">
                        <p className="stat-label">Total Earned</p>
                        <p className="stat-value">
                            <AnimatedCounter value={balance.totalEarned} decimals={3} suffix=" oz" />
                        </p>
                        <span className="badge badge-green" style={{ marginTop: 'var(--space-2)' }}>
                            <ArrowUpRight size={12} /> All time
                        </span>
                    </motion.div>
                    <motion.div whileHover={{ y: -4 }} className="stat-card card-solid">
                        <p className="stat-label">Posts Verified</p>
                        <p className="stat-value">
                            <AnimatedCounter value={balance.postsVerified} />
                        </p>
                        <span className="badge badge-green" style={{ marginTop: 'var(--space-2)' }}>
                            <CheckCircle2 size={12} /> <AnimatedCounter value={balance.verificationRate} decimals={0} suffix="%" /> rate
                        </span>
                    </motion.div>
                    <motion.div whileHover={{ y: -4 }} className="stat-card card-solid">
                        <p className="stat-label">Cashed Out</p>
                        <p className="stat-value">
                            <AnimatedCounter value={balance.totalCashedOut} decimals={3} suffix=" oz" />
                        </p>
                        <span className="text-body-sm" style={{ color: 'var(--text-tertiary)', marginTop: 'var(--space-2)' }}>
                            $<AnimatedCounter value={balance.totalCashedOutCAD} decimals={2} /> withdrawn
                        </span>
                    </motion.div>
                </motion.div>

                {/* ===== ACTIVITY FEED ===== */}
                <motion.div
                    className="activity-section"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                >
                    <div className="activity-header">
                        <h3 className="text-h3">Recent Activity</h3>
                    </div>

                    <div className="activity-list">
                        {activity && activity.length > 0 ? activity.map((item, i) => (
                            <motion.div
                                key={item._id}
                                className="activity-item card-solid"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 + i * 0.05 }}
                            >
                                <div className="activity-icon">
                                    {item.type === 'earn' ? (
                                        <CheckCircle2 size={20} color="var(--green-400)" />
                                    ) : (
                                        <Clock size={20} color="var(--amber)" />
                                    )}
                                </div>
                                <div className="activity-details">
                                    <p className="activity-business">{item.businessName || 'Karat'}</p>
                                    <p className="activity-meta">
                                        {item.platform || item.type} · {new Date(item.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="activity-amount">
                                    <span className={item.type === 'earn' ? 'amount-positive' : 'amount-pending'}>
                                        {item.type === 'earn' ? `+${item.amount.toFixed(3)} oz` : `-${item.amount.toFixed(3)} oz`}
                                    </span>
                                </div>
                            </motion.div>
                        )) : (
                            <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: 'var(--space-6)' }}>
                                No activity yet. Start earning gold!
                            </p>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* ===== CASHOUT MODAL ===== */}
            <AnimatePresence>
                {showCashout && (
                    <motion.div
                        className="cashout-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowCashout(false)}
                    >
                        <motion.div
                            className="cashout-modal card-solid"
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ duration: 0.2 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="cashout-modal-header">
                                <h3 className="text-h3">
                                    <Wallet size={20} style={{ marginRight: 8, color: 'var(--gold)' }} />
                                    Cash Out to Solana Wallet
                                </h3>
                                <button className="btn-icon" onClick={() => setShowCashout(false)}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="cashout-modal-body">
                                <p className="stat-label">Available Balance</p>
                                <p className="cashout-available">{balance.goldBalance.toFixed(3)} oz</p>
                                <p className="stat-secondary">${balance.balanceCAD} CAD</p>

                                <div className="cashout-input-group">
                                    <label className="stat-label">Amount (CAD)</label>
                                    <input
                                        type="number"
                                        className="cashout-input"
                                        placeholder="0.00"
                                        min="0.01"
                                        step="0.01"
                                        max={balance.balanceCAD}
                                        value={cashoutAmount}
                                        onChange={(e) => setCashoutAmount(e.target.value)}
                                    />
                                    <button
                                        className="cashout-max-btn"
                                        onClick={() => setCashoutAmount(balance.balanceCAD.toString())}
                                    >
                                        Max
                                    </button>
                                </div>

                                {cashoutAmount && parseFloat(cashoutAmount) > 0 && (
                                    <div className="cashout-preview">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                                            <span>PAXG to send</span>
                                            <span style={{ color: 'var(--gold)', fontWeight: 600 }}>
                                                {(parseFloat(cashoutAmount) / GOLD_PRICE_PER_OUNCE).toFixed(4)} oz
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Coins size={12} /> Solana network
                                            </span>
                                            <span>~$0.01 gas fee</span>
                                        </div>
                                    </div>
                                )}

                                <div className="cashout-input-group" style={{ marginTop: 'var(--space-4)' }}>
                                    <label className="stat-label">Solana Wallet Address</label>
                                    <input
                                        type="text"
                                        className="cashout-input"
                                        placeholder="Your Solana wallet address"
                                        value={walletAddress}
                                        onChange={(e) => setWalletAddress(e.target.value)}
                                        style={{ fontSize: '0.95rem' }}
                                    />
                                    <p className="text-body-sm" style={{ color: 'var(--text-tertiary)', marginTop: 'var(--space-2)' }}>
                                        Enter your Solana wallet address (e.g. from Phantom, Coinbase, or any Solana-compatible wallet). PAXG tokens will be sent directly to this address.
                                    </p>
                                    <div style={{ marginTop: 'var(--space-3)' }}>
                                        <Link
                                            to="/coinbase-guide"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                color: 'var(--accent)',
                                                fontSize: '0.875rem',
                                                fontWeight: 500,
                                                textDecoration: 'none'
                                            }}
                                        >
                                            How to set up a Solana wallet <ExternalLink size={14} />
                                        </Link>
                                    </div>
                                </div>
                            </div>

                            <div className="cashout-modal-footer" style={{ display: 'flex', gap: 'var(--space-3)' }}>
                                <button
                                    className="btn btn-secondary"
                                    style={{ flex: '0 0 auto' }}
                                    onClick={() => { setShowCashout(false); setCashoutAmount(''); setWalletAddress('') }}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-primary btn-lg"
                                    style={{ flex: 1 }}
                                    disabled={!cashoutAmount || parseFloat(cashoutAmount) <= 0 || parseFloat(cashoutAmount) > balance.balanceCAD || !walletAddress.trim() || cashoutLoading}
                                    onClick={handleCryptoCashout}
                                >
                                    {cashoutLoading ? 'Processing...' : 'Send PAXG to Wallet'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default CustomerRewards

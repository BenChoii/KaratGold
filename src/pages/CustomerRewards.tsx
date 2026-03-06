import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUpRight, TrendingUp, Clock, CheckCircle2, X, ShieldCheck, ExternalLink, CreditCard, Coins, HelpCircle, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useAction } from 'convex/react'
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
    const [cashoutMethod, setCashoutMethod] = useState<'select' | 'cad' | 'crypto'>('select')
    const [connectLoading, setConnectLoading] = useState(false)
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

    const connectStatus = useQuery(
        api.stripeConnect.getConnectStatus,
        convexUser ? { userId: convexUser._id } : "skip"
    )

    const createConnectAccount = useAction(api.stripeConnect.createConnectAccount)
    const createOnboardingLink = useAction(api.stripeConnect.createOnboardingLink)
    const checkOnboardingStatus = useAction(api.stripeConnect.checkOnboardingStatus)

    const handleStripeOnboard = async () => {
        if (!convexUser || !clerkUser?.primaryEmailAddress?.emailAddress) return
        setConnectLoading(true)
        try {
            const baseUrl = window.location.origin
            let url: string
            if (connectStatus?.hasAccount && connectStatus.accountId) {
                if (!connectStatus.onboarded) {
                    url = await createOnboardingLink({
                        stripeAccountId: connectStatus.accountId,
                        returnUrl: `${baseUrl}/rewards`,
                        refreshUrl: `${baseUrl}/rewards`,
                    })
                } else {
                    // Already onboarded, check status
                    await checkOnboardingStatus({ stripeAccountId: connectStatus.accountId })
                    setConnectLoading(false)
                    return
                }
            } else {
                url = await createConnectAccount({
                    userId: convexUser._id,
                    email: clerkUser.primaryEmailAddress.emailAddress,
                    returnUrl: `${baseUrl}/rewards`,
                    refreshUrl: `${baseUrl}/rewards`,
                })
            }
            window.location.href = url
        } catch (err) {
            console.error('Stripe Connect error:', err)
        }
        setConnectLoading(false)
    }

    const handleCadCashout = async () => {
        const cadAmt = parseFloat(cashoutAmount)
        if (!cadAmt || cadAmt <= 0 || cadAmt > (balance?.balanceCAD ?? 0) || !convexUser || !connectStatus?.accountId) return
        setCashoutLoading(true)
        try {
            const goldAmt = cadAmt / GOLD_PRICE_PER_OUNCE
            await cashOut({
                userId: convexUser._id,
                amount: goldAmt,
            })
            // Trigger payout
            // Note: in production, the withdrawal ID would come from the cashOut mutation
            // For now we rely on the backend to process it
            setShowCashout(false)
            setCashoutAmount('')
            setCashoutMethod('select')
        } catch (err) {
            console.error('Cashout error:', err)
        } finally {
            setCashoutLoading(false)
        }
    }

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
            setCashoutMethod('select')
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
                        <button className="btn btn-primary btn-lg" onClick={() => { setShowCashout(true); setCashoutMethod('select') }}>
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
                            $<AnimatedCounter value={balance.totalCashedOutCAD} decimals={2} /> to bank
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
                        onClick={() => { setShowCashout(false); setCashoutMethod('select') }}
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
                                    {cashoutMethod === 'select' ? 'Cash Out Gold' : cashoutMethod === 'cad' ? '💳 Cash Out (CAD)' : '🪙 Get Real Gold'}
                                </h3>
                                <button className="btn-icon" onClick={() => { setShowCashout(false); setCashoutMethod('select') }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="cashout-modal-body">
                                {/* Method Selection */}
                                {cashoutMethod === 'select' && (
                                    <>
                                        <p className="stat-label">Available Balance</p>
                                        <p className="cashout-available">{balance.goldBalance.toFixed(3)} oz</p>
                                        <p className="stat-secondary">${balance.balanceCAD} CAD</p>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
                                            <button
                                                onClick={() => setCashoutMethod('cad')}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-4)',
                                                    background: 'rgba(74, 222, 128, 0.05)', border: '1px solid rgba(74, 222, 128, 0.2)',
                                                    borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left', color: 'var(--text-primary)'
                                                }}
                                            >
                                                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(74, 222, 128, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <CreditCard size={22} style={{ color: 'var(--green-400)' }} />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Cash Out in CAD</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                                                        {connectStatus?.onboarded ? 'Instant debit or bank deposit' : 'Set up bank connection first'}
                                                    </div>
                                                </div>
                                            </button>

                                            <button
                                                onClick={() => setCashoutMethod('crypto')}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-4)',
                                                    background: 'rgba(212, 165, 55, 0.05)', border: '1px solid rgba(212, 165, 55, 0.2)',
                                                    borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left', color: 'var(--text-primary)'
                                                }}
                                            >
                                                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(212, 165, 55, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Coins size={22} style={{ color: 'var(--gold)' }} />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Get Real Gold (PAXG)</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Send PAXG tokens to your crypto wallet</div>
                                                </div>
                                            </button>
                                        </div>

                                        <div style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
                                            <Link to="/how-cashout-works" className="learn-more-link" style={{ fontSize: '0.85rem' }} onClick={() => setShowCashout(false)}>
                                                <HelpCircle size={14} /> Compare cashout options
                                            </Link>
                                        </div>
                                    </>
                                )}

                                {/* CAD Cashout */}
                                {cashoutMethod === 'cad' && (
                                    <>
                                        {!connectStatus?.onboarded ? (
                                            // Onboarding needed
                                            <div style={{ textAlign: 'center', padding: 'var(--space-4) 0' }}>
                                                <CreditCard size={40} style={{ color: 'var(--green-400)', marginBottom: 'var(--space-4)' }} />
                                                <h4 style={{ marginBottom: 'var(--space-2)' }}>Connect Your Bank Account</h4>
                                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-6)' }}>
                                                    One-time setup via Stripe. Enter your name, DOB, and bank or debit card details to start receiving CAD payouts.
                                                </p>
                                                <button
                                                    className="btn btn-primary btn-lg"
                                                    style={{ width: '100%' }}
                                                    onClick={handleStripeOnboard}
                                                    disabled={connectLoading}
                                                >
                                                    {connectLoading ? 'Redirecting to Stripe...' : 'Set Up Payouts'}
                                                </button>
                                                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', marginTop: 'var(--space-3)' }}>
                                                    Powered by Stripe · Secure & encrypted
                                                </p>
                                            </div>
                                        ) : (
                                            // Onboarded — show amount input
                                            <>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-4)' }}>
                                                    <CheckCircle2 size={16} style={{ color: 'var(--green-400)' }} />
                                                    <span style={{ fontSize: '0.85rem', color: 'var(--green-400)', fontWeight: 500 }}>Bank account connected</span>
                                                </div>

                                                <p className="stat-label">Available Balance</p>
                                                <p className="cashout-available">{balance.goldBalance.toFixed(3)} oz</p>
                                                <p className="stat-secondary">${balance.balanceCAD} CAD</p>

                                                <div className="cashout-input-group">
                                                    <label className="stat-label">Amount (CAD)</label>
                                                    <input
                                                        type="number"
                                                        className="cashout-input"
                                                        placeholder="0.00"
                                                        min="10"
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
                                                            <span>Gold Deducted</span>
                                                            <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{(parseFloat(cashoutAmount) / GOLD_PRICE_PER_OUNCE).toFixed(4)} oz</span>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Zap size={12} /> Instant (debit card)</span>
                                                            <span>1% fee</span>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> Standard (bank)</span>
                                                            <span>Free</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </>
                                )}

                                {/* Crypto Cashout */}
                                {cashoutMethod === 'crypto' && (
                                    <>
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
                                                <p>Equivalent Gold Deducted</p>
                                                <p className="cashout-preview-amount" style={{ color: 'var(--gold)' }}>
                                                    {(parseFloat(cashoutAmount) / GOLD_PRICE_PER_OUNCE).toFixed(4)} oz
                                                </p>
                                            </div>
                                        )}

                                        <div className="cashout-input-group" style={{ marginTop: 'var(--space-4)' }}>
                                            <label className="stat-label">Transfer Destination</label>
                                            <input
                                                type="text"
                                                className="cashout-input"
                                                placeholder="Coinbase USDC Address (Solana Network)"
                                                value={walletAddress}
                                                onChange={(e) => setWalletAddress(e.target.value)}
                                                style={{ fontSize: '1rem' }}
                                            />
                                            <p className="text-body-sm" style={{ color: 'var(--text-tertiary)', marginTop: 'var(--space-2)' }}>
                                                Provide your Coinbase <strong>USDC (Solana Network)</strong> deposit address. Your gold will be automatically swapped to USDC and sent for you to cash out.
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
                                                    How to get a Coinbase USDC Address <ExternalLink size={14} />
                                                </Link>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Footer buttons */}
                            {cashoutMethod !== 'select' && (
                                <div className="cashout-modal-footer" style={{ display: 'flex', gap: 'var(--space-3)' }}>
                                    <button
                                        className="btn btn-secondary"
                                        style={{ flex: '0 0 auto' }}
                                        onClick={() => { setCashoutMethod('select'); setCashoutAmount(''); setWalletAddress('') }}
                                    >
                                        Back
                                    </button>

                                    {cashoutMethod === 'cad' && connectStatus?.onboarded && (
                                        <button
                                            className="btn btn-primary btn-lg"
                                            style={{ flex: 1 }}
                                            disabled={!cashoutAmount || parseFloat(cashoutAmount) < 10 || parseFloat(cashoutAmount) > balance.balanceCAD || cashoutLoading}
                                            onClick={handleCadCashout}
                                        >
                                            {cashoutLoading ? 'Processing...' : 'Confirm CAD Cash Out'}
                                        </button>
                                    )}

                                    {cashoutMethod === 'crypto' && (
                                        <button
                                            className="btn btn-primary btn-lg"
                                            style={{ flex: 1 }}
                                            disabled={!cashoutAmount || parseFloat(cashoutAmount) <= 0 || parseFloat(cashoutAmount) > balance.balanceCAD || !walletAddress.trim() || cashoutLoading}
                                            onClick={handleCryptoCashout}
                                        >
                                            {cashoutLoading ? 'Processing...' : 'Confirm PAXG Transfer'}
                                        </button>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default CustomerRewards

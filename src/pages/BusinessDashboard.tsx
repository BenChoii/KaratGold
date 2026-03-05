import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Navigate } from 'react-router-dom'
import { TrendingUp, CheckCircle2, Clock, Users, DollarSign, Eye, XCircle, Plus, Pause, Play, Coins, Loader2, ExternalLink, AlertCircle, Instagram, Facebook } from 'lucide-react'
import { useQuery, useMutation, useAction } from 'convex/react'
import { useUser } from '@clerk/clerk-react'
import { api } from '../../convex/_generated/api'
import CreateCampaignModal from '../components/CreateCampaignModal'
import { AnimatedCounter } from '../components/AnimatedCounter'
import './BusinessDashboard.css'



function BusinessDashboard() {
    const { user: clerkUser } = useUser()
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showFundDialog, setShowFundDialog] = useState(false)
    const [fundAmount, setFundAmount] = useState('')
    const [fundCurrency, setFundCurrency] = useState<'gold' | 'cad'>('gold')
    const [funding, setFunding] = useState(false)

    const createCheckoutSession = useAction(api.stripe.createCheckoutSession)

    const goldPriceData = useQuery(api.goldPrice.getGoldPrice)
    const GOLD_PRICE_PER_OUNCE = goldPriceData?.paxgCad ?? 2900

    const convexUser = useQuery(api.users.getByClerkId, {
        clerkId: clerkUser?.id ?? "none",
    })

    const business = useQuery(
        api.businesses.getByOwner,
        convexUser ? { ownerId: convexUser._id } : "skip"
    )

    const stats = useQuery(
        api.submissions.getStats,
        business ? { businessId: business._id } : "skip"
    )

    const submissions = useQuery(
        api.submissions.listByBusiness,
        business ? { businessId: business._id } : "skip"
    )

    const campaigns = useQuery(
        api.campaigns.listByBusiness,
        business ? { businessId: business._id } : "skip"
    )

    const pendingQueue = useQuery(
        api.submissions.listPendingByBusiness,
        business ? { businessId: business._id } : "skip"
    )

    const togglePause = useMutation(api.campaigns.togglePause)
    const approveSubmission = useMutation(api.submissions.approveSubmission)
    const rejectSubmission = useMutation(api.submissions.rejectSubmission)

    const [approvingId, setApprovingId] = useState<string | null>(null)
    const [rejectingId, setRejectingId] = useState<string | null>(null)

    const handleApprove = async (submissionId: any) => {
        setApprovingId(submissionId)
        try {
            await approveSubmission({ submissionId })
        } catch (err) {
            console.error('Approve error:', err)
        }
        setApprovingId(null)
    }

    const handleReject = async (submissionId: any) => {
        setRejectingId(submissionId)
        try {
            await rejectSubmission({ submissionId })
        } catch (err) {
            console.error('Reject error:', err)
        }
        setRejectingId(null)
    }

    const handleFundGold = async () => {
        if (!business || !fundAmount || parseFloat(fundAmount) <= 0) return

        setFunding(true)
        try {
            const cadAmount = fundCurrency === 'cad'
                ? parseFloat(fundAmount)
                : parseFloat(fundAmount) * GOLD_PRICE_PER_OUNCE

            if (cadAmount < 100) {
                alert("Minimum funding amount is $100 CAD.")
                setFunding(false)
                return
            }

            const checkoutUrl = await createCheckoutSession({
                businessId: business._id,
                cadAmount,
                successUrl: `${window.location.origin}/dashboard?fund_success=true`,
                cancelUrl: `${window.location.origin}/dashboard?fund_canceled=true`,
            })

            window.location.href = checkoutUrl
        } catch (err: any) {
            console.error('Funding error:', err)
            alert(err.message || "Failed to initiate funding session.")
            setFunding(false)
        }
    }

    if (convexUser === undefined || business === undefined || stats === undefined) {
        return (
            <div className="dashboard-page">
                <div className="container">
                    <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: 'var(--space-12)' }}>
                        Loading dashboard...
                    </p>
                </div>
            </div>
        )
    }

    if (convexUser === null || convexUser.role !== 'business' || business === null) {
        return <Navigate to="/explore" replace />
    }

    const recentSubmissions = submissions ?? []
    const activeCampaigns = campaigns?.filter(c => c.status === 'active') ?? []
    const otherCampaigns = campaigns?.filter(c => c.status !== 'active') ?? []

    return (
        <div className="dashboard-page">
            <div className="container">
                {/* ===== CAMPAIGN HEADER ===== */}
                <motion.div
                    className="campaign-header"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <div>
                        <h1 className="text-h2">{business.name}</h1>
                        <p className="text-body-sm" style={{ color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
                            {business.category} · {business.location}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                            <Plus size={18} /> New Campaign
                        </button>
                    </div>
                </motion.div>

                {/* ===== STATS ROW ===== */}
                <motion.div
                    className="dashboard-stats"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                >
                    <motion.div whileHover={{ y: -4, scale: 1.02 }} className="dash-stat card-solid" onClick={() => setShowFundDialog(true)} style={{ cursor: 'pointer' }}>
                        <div className="dash-stat-icon-wrap">
                            <DollarSign size={20} />
                        </div>
                        <div>
                            <p className="stat-label">Gold Pool</p>
                            <p className="dash-stat-value">
                                <AnimatedCounter value={stats.goldRemaining} decimals={3} suffix=" oz" />
                            </p>
                            <p className="stat-secondary">$<AnimatedCounter value={stats.goldRemaining * GOLD_PRICE_PER_OUNCE} decimals={0} /> CAD · <span style={{ color: 'var(--accent-dark)', fontWeight: 600 }}>+ Fund</span></p>
                        </div>
                    </motion.div>
                    <motion.div whileHover={{ y: -4, scale: 1.02 }} className="dash-stat card-solid">
                        <div className="dash-stat-icon-wrap">
                            <CheckCircle2 size={20} />
                        </div>
                        <div>
                            <p className="stat-label">Posts Verified</p>
                            <p className="dash-stat-value">
                                <AnimatedCounter value={stats.postsVerified} />
                            </p>
                            <p className="stat-secondary">
                                <AnimatedCounter value={stats.totalGoldPaid} decimals={3} suffix=" oz paid out" />
                            </p>
                        </div>
                    </motion.div>
                    <motion.div whileHover={{ y: -4, scale: 1.02 }} className="dash-stat card-solid">
                        <div className="dash-stat-icon-wrap" style={{ background: 'rgba(212, 175, 55, 0.1)', color: 'var(--gold)' }}>
                            <Eye size={20} />
                        </div>
                        <div>
                            <p className="stat-label">Total Reach</p>
                            <p className="dash-stat-value">
                                <AnimatedCounter value={stats.totalReach >= 1000 ? stats.totalReach / 1000 : stats.totalReach} decimals={stats.totalReach >= 1000 ? 1 : 0} suffix={stats.totalReach >= 1000 ? 'K' : ''} />
                            </p>
                            <p className="stat-secondary">
                                {stats.postsVerified > 0
                                    ? `avg ${stats.averageFollowers >= 1000 ? `${(stats.averageFollowers / 1000).toFixed(1)}K` : stats.averageFollowers} per post`
                                    : `${stats.postsPending} pending`
                                }
                            </p>
                        </div>
                    </motion.div>
                    <motion.div whileHover={{ y: -4, scale: 1.02 }} className="dash-stat card-solid">
                        <div className="dash-stat-icon-wrap">
                            <Users size={20} />
                        </div>
                        <div>
                            <p className="stat-label">Unique Patrons</p>
                            <p className="dash-stat-value">
                                <AnimatedCounter value={stats.uniquePatrons} />
                            </p>
                            <p className="stat-secondary">
                                <AnimatedCounter value={stats.totalSubmissions} suffix=" total submissions" />
                            </p>
                        </div>
                    </motion.div>
                </motion.div>

                {/* ===== CAMPAIGNS ===== */}
                <motion.div
                    className="campaigns-section"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    <div className="section-title-row">
                        <h3 className="text-h3">Campaigns</h3>
                        <span className="badge badge-accent">{activeCampaigns.length} active</span>
                    </div>

                    {campaigns && campaigns.length > 0 ? (
                        <div className="campaigns-list">
                            {[...activeCampaigns, ...otherCampaigns].map((campaign, i) => (
                                <motion.div
                                    key={campaign._id}
                                    className="campaign-item card-solid"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    whileHover={{ x: 4, backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
                                    transition={{ delay: 0.25 + i * 0.05 }}
                                >
                                    <div className="campaign-item-info" style={{ flex: 1 }}>
                                        <h4 className="text-h4">{campaign.title}</h4>
                                        <p className="text-body-sm" style={{ color: 'var(--text-secondary)', marginTop: 2 }}>
                                            {campaign.description.length > 80
                                                ? campaign.description.slice(0, 80) + '...'
                                                : campaign.description}
                                        </p>
                                        <div className="campaign-item-meta">
                                            <span>{campaign.currentSubmissions}/{campaign.maxSubmissions} posts</span>
                                            <span>·</span>
                                            <span>{campaign.rewardGrams} oz/post</span>
                                            <span>·</span>
                                            <span>{campaign.platforms.join(', ')}</span>
                                        </div>
                                        {/* Animated Progress Bar */}
                                        <div style={{ marginTop: 'var(--space-2)', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden', maxWidth: '300px' }}>
                                            <motion.div
                                                style={{ height: '100%', background: campaign.currentSubmissions >= campaign.maxSubmissions ? 'var(--gold)' : 'var(--accent)', borderRadius: '2px' }}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(campaign.currentSubmissions / campaign.maxSubmissions) * 100}%` }}
                                                transition={{ duration: 1, delay: 0.5 }}
                                            />
                                        </div>
                                    </div>
                                    <div className="campaign-item-actions">
                                        <span className={`badge ${campaign.status === 'active' ? 'badge-accent' : campaign.status === 'completed' ? 'badge-gold' : 'badge-dark'}`}>
                                            {campaign.status}
                                        </span>
                                        {campaign.status !== 'completed' && (
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => togglePause({ campaignId: campaign._id })}
                                            >
                                                {campaign.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                                                {campaign.status === 'active' ? 'Pause' : 'Resume'}
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="campaigns-empty card-solid">
                            <Coins size={32} style={{ color: 'var(--text-tertiary)' }} />
                            <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-3)' }}>
                                No campaigns yet. Create your first campaign to start getting posts.
                            </p>
                            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                                <Plus size={18} /> Create Campaign
                            </button>
                        </div>
                    )}
                </motion.div>

                {/* ===== CHART ===== */}
                <motion.div
                    className="chart-card card-solid"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                >
                    <div className="chart-header">
                        <h3 className="text-h4">Campaign Performance</h3>
                        <span className="badge badge-green">
                            <TrendingUp size={12} /> {stats.postsVerified} verified
                        </span>
                    </div>
                    <div className="chart-area">
                        <svg viewBox="0 0 800 160" preserveAspectRatio="none" className="campaign-chart">
                            <defs>
                                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2" />
                                    <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <motion.path
                                d="M0,120 C40,115 80,100 120,95 C180,88 220,105 280,85 C340,65 380,75 440,55 C500,45 540,50 600,35 C660,25 720,30 800,15"
                                fill="none"
                                stroke="var(--accent)"
                                strokeWidth="2.5"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 1.5, ease: "easeInOut" }}
                            />
                            <path
                                d="M0,120 C40,115 80,100 120,95 C180,88 220,105 280,85 C340,65 380,75 440,55 C500,45 540,50 600,35 C660,25 720,30 800,15 V160 H0 Z"
                                fill="url(#chartGrad)"
                            />
                        </svg>
                    </div>
                </motion.div>

                {/* ===== TAGGED INSTAGRAM POSTS ===== */}
                <motion.div
                    className="tagged-posts-section"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.35 }}
                >
                    <div className="section-title-row">
                        <h3 className="text-h3">Tagged Instagram Posts</h3>
                        {business.embedSocialActive && (
                            <span className="badge badge-green">Live</span>
                        )}
                    </div>

                    {business.embedSocialActive && business.embedSocialWidgetId ? (
                        <div className="tagged-posts-widget card-solid" style={{ padding: 'var(--space-4)', minHeight: 300 }}>
                            <div
                                className="embedsocial-hashtag"
                                data-ref={business.embedSocialWidgetId}
                            ></div>
                        </div>
                    ) : (
                        <div className="tagged-posts-empty card-solid" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                            <Eye size={32} style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-3)' }} />
                            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
                                Your tagged Instagram posts will appear here automatically
                            </p>
                            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>
                                {business.embedSocialActive
                                    ? 'Widget is being configured — tagged posts will appear shortly.'
                                    : 'Launch your first campaign to activate tagged post tracking.'}
                            </p>
                        </div>
                    )}
                </motion.div>

                {/* ===== APPROVAL QUEUE ===== */}
                {pendingQueue && pendingQueue.length > 0 && (
                    <motion.div
                        className="approval-queue-section"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.38 }}
                    >
                        <div className="section-title-row">
                            <h3 className="text-h3">
                                <AlertCircle size={20} style={{ color: 'var(--accent)', marginRight: 'var(--space-2)' }} />
                                Pending Approvals ({pendingQueue.length})
                            </h3>
                        </div>

                        <div className="approval-list">
                            <AnimatePresence mode="popLayout">
                                {pendingQueue.map((sub, i) => {
                                    const hoursLeft = Math.max(0, sub.hoursUntilAutoApprove)
                                    return (
                                        <motion.div
                                            key={sub._id}
                                            className="approval-card card-solid"
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                                            layout
                                            transition={{ delay: 0.4 + i * 0.05 }}
                                            whileHover={{ scale: 1.01, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                                        >
                                            <div className="approval-info">
                                                <div className="approval-top">
                                                    {sub.platform === 'Facebook' ? (
                                                        <Facebook size={14} style={{ color: '#1877F2' }} />
                                                    ) : (
                                                        <Instagram size={14} style={{ color: '#E4405F' }} />
                                                    )}
                                                    <span className="approval-customer">{sub.customerName}</span>
                                                    {sub.customerInstagram && (
                                                        <span className="text-tertiary" style={{ fontSize: '0.8125rem' }}>
                                                            @{sub.customerInstagram}
                                                        </span>
                                                    )}
                                                    <span className="badge badge-amber" style={{ marginLeft: 'auto' }}>
                                                        <Clock size={11} />
                                                        Auto-approve in {hoursLeft < 1 ? '<1h' : `${Math.round(hoursLeft)}h`}
                                                    </span>
                                                </div>
                                                <div className="approval-meta">
                                                    <span className="text-tertiary" style={{ fontSize: '0.8125rem' }}>
                                                        {sub.campaignTitle} · {sub.rewardGrams.toFixed(3)} oz
                                                    </span>
                                                </div>
                                                {sub.postUrl && (
                                                    <a
                                                        href={sub.postUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="approval-link"
                                                    >
                                                        <ExternalLink size={13} /> View Post
                                                    </a>
                                                )}
                                            </div>
                                            <div className="approval-actions">
                                                <button
                                                    className="btn btn-sm approval-approve"
                                                    onClick={() => handleApprove(sub._id)}
                                                    disabled={approvingId === sub._id}
                                                >
                                                    {approvingId === sub._id ? (
                                                        <Loader2 size={14} className="spinning" />
                                                    ) : (
                                                        <><CheckCircle2 size={14} /> Approve</>
                                                    )}
                                                </button>
                                                <button
                                                    className="btn btn-sm approval-reject"
                                                    onClick={() => handleReject(sub._id)}
                                                    disabled={rejectingId === sub._id}
                                                >
                                                    {rejectingId === sub._id ? (
                                                        <Loader2 size={14} className="spinning" />
                                                    ) : (
                                                        <><XCircle size={14} /> Reject</>
                                                    )}
                                                </button>
                                            </div>
                                        </motion.div>
                                    )
                                })}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}

                {/* ===== SUBMISSIONS ===== */}
                <motion.div
                    className="submissions-section"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                >
                    <div className="submissions-header">
                        <h3 className="text-h3">Recent Submissions</h3>
                        <button className="btn btn-ghost btn-sm">View All</button>
                    </div>

                    <div className="submissions-list">
                        {recentSubmissions.length > 0 ? recentSubmissions.map((sub, i) => (
                            <motion.div
                                key={sub._id}
                                className="submission-item card-solid"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 + i * 0.05 }}
                            >
                                <div className="submission-avatar">
                                    {sub.customerName.charAt(0)}
                                </div>
                                <div className="submission-details">
                                    <p className="submission-name">{sub.customerName}</p>
                                    <p className="submission-meta">
                                        {sub.platform} · {new Date(sub.createdAt).toLocaleDateString()}
                                        {sub.followerCount ? ` · ${sub.followerCount >= 1000 ? `${(sub.followerCount / 1000).toFixed(1)}K` : sub.followerCount} followers` : ''}
                                    </p>
                                </div>
                                <div className="submission-verdict">
                                    {sub.status === 'verified' && (
                                        <span className="badge badge-green">
                                            <CheckCircle2 size={12} /> Verified {sub.confidenceScore}%
                                        </span>
                                    )}
                                    {(sub.status === 'pending' || sub.status === 'verifying') && (
                                        <span className="badge badge-amber">
                                            <Clock size={12} /> {sub.status === 'verifying' ? 'Verifying' : 'Pending'}
                                        </span>
                                    )}
                                    {sub.status === 'rejected' && (
                                        <span className="badge" style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--red)' }}>
                                            <XCircle size={12} /> Rejected
                                        </span>
                                    )}
                                </div>
                                {sub.postUrl ? (
                                    <a
                                        href={sub.postUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-ghost btn-sm"
                                        style={{ flexShrink: 0 }}
                                    >
                                        <ExternalLink size={14} /> View
                                    </a>
                                ) : (
                                    <span style={{ width: 70, flexShrink: 0 }} />
                                )}
                                <div className="submission-reward">
                                    {sub.status === 'verified' ? (
                                        <span style={{ color: 'var(--accent-dark)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                                            -{sub.rewardGrams} oz
                                        </span>
                                    ) : sub.status === 'pending' || sub.status === 'verifying' ? (
                                        <span style={{ color: 'var(--text-tertiary)' }}>{sub.rewardGrams} oz</span>
                                    ) : (
                                        <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                                    )}
                                </div>
                            </motion.div>
                        )) : (
                            <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: 'var(--space-6)' }}>
                                No submissions yet. Share your campaign link to get started!
                            </p>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Campaign Creation Modal */}
            <CreateCampaignModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                businessId={business._id}
                goldPool={business.goldPool}
            />

            {/* Fund Gold Dialog */}
            {showFundDialog && (
                <motion.div
                    className="campaign-modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowFundDialog(false)}
                >
                    <motion.div
                        className="fund-dialog card"
                        initial={{ opacity: 0, y: 30, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 className="text-h3">Fund Your Pool</h3>
                        <p className="text-body-sm" style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
                            Add funds to your pool so you can launch campaigns
                        </p>

                        {/* Currency Toggle */}
                        <div style={{ display: 'flex', gap: '8px', marginTop: 'var(--space-4)' }}>
                            <button
                                type="button"
                                className={`btn btn-sm ${fundCurrency === 'gold' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setFundCurrency('gold')}
                                style={{ flex: 1 }}
                            >
                                <Coins size={14} style={{ marginRight: 6, fill: fundCurrency === 'gold' ? 'var(--gold)' : 'currentColor' }} /> Gold (ounces)
                            </button>
                            <button
                                type="button"
                                className={`btn btn-sm ${fundCurrency === 'cad' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setFundCurrency('cad')}
                                style={{ flex: 1 }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill={fundCurrency === 'cad' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                                    <path d="M12 2v20" />
                                    <path d="M12 2l-3 6-5-2 4 5-3 6 7-2 7 2-3-6 4-5-5 2-3-6z" />
                                </svg> CAD (dollars)
                            </button>
                        </div>

                        <div style={{ marginTop: 'var(--space-4)' }}>
                            <label style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'block', marginBottom: 'var(--space-2)' }}>
                                {fundCurrency === 'gold' ? 'Amount (ounces)' : 'Amount (CAD)'}
                            </label>
                            <input
                                type="number"
                                className="input"
                                placeholder={fundCurrency === 'gold' ? 'e.g. 1.0' : 'e.g. 100.00'}
                                min="0.01"
                                step={fundCurrency === 'gold' ? '0.01' : '1'}
                                value={fundAmount}
                                onChange={e => setFundAmount(e.target.value)}
                            />
                            {fundAmount && (
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
                                    {fundCurrency === 'gold'
                                        ? `≈ $${(parseFloat(fundAmount) * GOLD_PRICE_PER_OUNCE).toFixed(2)} CAD`
                                        : `≈ ${(parseFloat(fundAmount) / GOLD_PRICE_PER_OUNCE).toFixed(4)} oz gold at $${GOLD_PRICE_PER_OUNCE.toFixed(2)}/oz`
                                    }
                                </p>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-6)' }}>
                            <button className="btn btn-ghost" onClick={() => setShowFundDialog(false)}>Cancel</button>
                            <button
                                className="btn btn-primary"
                                disabled={!fundAmount || parseFloat(fundAmount) <= 0 || funding}
                                onClick={handleFundGold}
                            >
                                {funding ? (
                                    <><Loader2 size={16} className="spinning" /> Funding...</>
                                ) : (
                                    <><Coins size={16} /> {fundCurrency === 'gold' ? 'Fund Gold' : 'Fund with CAD'}</>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </div>
    )
}

export default BusinessDashboard

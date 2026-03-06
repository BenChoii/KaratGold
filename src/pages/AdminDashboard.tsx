import { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, Users, Briefcase, Megaphone, ArrowDownToLine, Coins, Lock, Eye, EyeOff } from 'lucide-react'
import { useQuery, useAction } from 'convex/react'
import { api } from '../../convex/_generated/api'
import './AdminDashboard.css'

type Tab = 'overview' | 'users' | 'businesses' | 'campaigns' | 'withdrawals'

function AdminDashboard() {
    const [authenticated, setAuthenticated] = useState(false)
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState<Tab>('overview')

    const verifyPassword = useAction(api.admin.verifyPassword)

    const handleLogin = async () => {
        if (!password.trim()) return
        setLoading(true)
        setError('')
        try {
            const valid = await verifyPassword({ password })
            if (valid) {
                setAuthenticated(true)
            } else {
                setError('Invalid password')
            }
        } catch {
            setError('Authentication failed')
        }
        setLoading(false)
    }

    if (!authenticated) {
        return (
            <div className="admin-page">
                <div className="admin-login">
                    <motion.div
                        className="admin-login-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Shield size={40} style={{ color: 'var(--gold)', marginBottom: 'var(--space-4)' }} />
                        <h1>KaratGold Admin</h1>
                        <p>Enter your admin password to access the dashboard.</p>

                        {error && <p className="admin-login-error">{error}</p>}

                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="admin-login-input"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                                autoFocus
                            />
                            <button
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer'
                                }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        <button
                            className="btn btn-primary btn-lg"
                            style={{ width: '100%' }}
                            onClick={handleLogin}
                            disabled={loading}
                        >
                            {loading ? 'Verifying...' : 'Access Dashboard'}
                        </button>
                    </motion.div>
                </div>
            </div>
        )
    }

    return <DashboardContent activeTab={activeTab} setActiveTab={setActiveTab} />
}

function DashboardContent({ activeTab, setActiveTab }: { activeTab: Tab; setActiveTab: (t: Tab) => void }) {
    const stats = useQuery(api.admin.getDashboardStats)
    const users = useQuery(api.admin.getAllUsers)
    const businesses = useQuery(api.admin.getAllBusinesses)
    const campaigns = useQuery(api.admin.getAllCampaigns)
    const withdrawals = useQuery(api.admin.getAllWithdrawals)

    if (!stats) {
        return (
            <div className="admin-page">
                <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: 'var(--space-12)' }}>
                    Loading dashboard data...
                </p>
            </div>
        )
    }

    const tabs: { id: Tab; label: string; icon: any }[] = [
        { id: 'overview', label: 'Overview', icon: <Shield size={16} /> },
        { id: 'users', label: 'Users', icon: <Users size={16} /> },
        { id: 'businesses', label: 'Businesses', icon: <Briefcase size={16} /> },
        { id: 'campaigns', label: 'Campaigns', icon: <Megaphone size={16} /> },
        { id: 'withdrawals', label: 'Withdrawals', icon: <ArrowDownToLine size={16} /> },
    ]

    const formatDate = (ts: number) => new Date(ts).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: '2-digit' })
    const formatGold = (oz: number) => oz.toFixed(4) + ' oz'
    const formatCAD = (cad: number) => '$' + cad.toFixed(2)

    return (
        <div className="admin-page">
            <div className="container">
                {/* Header */}
                <motion.div className="admin-header" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                    <div>
                        <h1>
                            <Coins size={24} style={{ color: 'var(--gold)', marginRight: 8, verticalAlign: 'text-bottom' }} />
                            KaratGold Admin
                        </h1>
                    </div>
                    <div className="admin-header-badge">
                        <Lock size={12} /> Authenticated
                    </div>
                </motion.div>

                {/* Stat Cards */}
                <motion.div className="admin-stats-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                    <div className="admin-stat-card">
                        <div className="admin-stat-label">Total Users</div>
                        <div className="admin-stat-value">{stats.totalUsers}</div>
                        <div className="admin-stat-sub">{stats.totalCustomers} customers · {stats.totalBusinessOwners} businesses</div>
                    </div>
                    <div className="admin-stat-card">
                        <div className="admin-stat-label">Gold in Circulation</div>
                        <div className="admin-stat-value gold">{formatGold(stats.totalGoldInCirculation)}</div>
                        <div className="admin-stat-sub">{formatCAD(stats.totalGoldInCirculation * stats.goldPricePerOunce)} CAD value</div>
                    </div>
                    <div className="admin-stat-card">
                        <div className="admin-stat-label">Active Campaigns</div>
                        <div className="admin-stat-value accent">{stats.activeCampaigns}</div>
                        <div className="admin-stat-sub">{stats.totalCampaigns} total · {stats.totalSubmissions} submissions</div>
                    </div>
                    <div className="admin-stat-card">
                        <div className="admin-stat-label">Treasury (CAD)</div>
                        <div className="admin-stat-value green">{formatCAD(stats.treasuryBalance * stats.goldPricePerOunce)}</div>
                        <div className="admin-stat-sub">{formatGold(stats.treasuryTotalCollected)} total collected</div>
                    </div>
                    <div className="admin-stat-card">
                        <div className="admin-stat-label">Total Paid Out</div>
                        <div className="admin-stat-value">{formatCAD(stats.totalPaidOut)}</div>
                        <div className="admin-stat-sub">{stats.completedWithdrawals} completed · {stats.pendingWithdrawals} pending</div>
                    </div>
                    <div className="admin-stat-card">
                        <div className="admin-stat-label">Stripe Connected</div>
                        <div className="admin-stat-value">{stats.stripeConnectedUsers}</div>
                        <div className="admin-stat-sub">of {stats.totalCustomers} customers</div>
                    </div>
                </motion.div>

                {/* Tabs */}
                <div className="admin-tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <div className="admin-table-wrapper">
                        <div style={{ padding: 'var(--space-6)' }}>
                            <h3 style={{ marginBottom: 'var(--space-4)' }}>Platform Summary</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                <div>
                                    <p className="admin-stat-label">Total Gold Earned (All Time)</p>
                                    <p style={{ fontWeight: 600 }}>{formatGold(stats.totalEarnedEver)}</p>
                                </div>
                                <div>
                                    <p className="admin-stat-label">Total Cashed Out (All Time)</p>
                                    <p style={{ fontWeight: 600 }}>{formatGold(stats.totalCashedOutEver)}</p>
                                </div>
                                <div>
                                    <p className="admin-stat-label">Business Gold Funded</p>
                                    <p style={{ fontWeight: 600 }}>{formatGold(stats.totalBusinessFunded)}</p>
                                </div>
                                <div>
                                    <p className="admin-stat-label">Gold in Business Pools</p>
                                    <p style={{ fontWeight: 600 }}>{formatGold(stats.totalGoldPools)}</p>
                                </div>
                                <div>
                                    <p className="admin-stat-label">Gold Spot Price</p>
                                    <p style={{ fontWeight: 600, color: 'var(--gold)' }}>{formatCAD(stats.goldPricePerOunce)} / oz</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="admin-table-wrapper">
                        {!users?.length ? (
                            <p className="admin-empty">No users yet</p>
                        ) : (
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Gold Balance</th>
                                        <th>Total Earned</th>
                                        <th>Cashed Out</th>
                                        <th>Stripe</th>
                                        <th>Joined</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((u: any) => (
                                        <tr key={u._id}>
                                            <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{u.name}</td>
                                            <td>{u.email}</td>
                                            <td><span className={`status-badge ${u.role === 'customer' ? 'active' : u.role === 'business' ? 'processing' : 'paused'}`}>{u.role}</span></td>
                                            <td style={{ color: 'var(--gold)' }}>{formatGold(u.goldBalance)}</td>
                                            <td>{formatGold(u.totalEarned)}</td>
                                            <td>{formatGold(u.totalCashedOut)}</td>
                                            <td>{u.stripeConnected ? '✅' : '—'}</td>
                                            <td>{formatDate(u.createdAt)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {activeTab === 'businesses' && (
                    <div className="admin-table-wrapper">
                        {!businesses?.length ? (
                            <p className="admin-empty">No businesses yet</p>
                        ) : (
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Business</th>
                                        <th>Owner</th>
                                        <th>Category</th>
                                        <th>Location</th>
                                        <th>Gold Pool</th>
                                        <th>Total Funded</th>
                                        <th>Campaigns</th>
                                        <th>Joined</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {businesses.map((b: any) => (
                                        <tr key={b._id}>
                                            <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{b.name}</td>
                                            <td>{b.ownerName}</td>
                                            <td>{b.category}</td>
                                            <td>{b.location}</td>
                                            <td style={{ color: 'var(--gold)' }}>{formatGold(b.goldPool)}</td>
                                            <td>{formatGold(b.totalGoldFunded)}</td>
                                            <td>{b.activeCampaigns} / {b.campaignCount}</td>
                                            <td>{formatDate(b.createdAt)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {activeTab === 'campaigns' && (
                    <div className="admin-table-wrapper">
                        {!campaigns?.length ? (
                            <p className="admin-empty">No campaigns yet</p>
                        ) : (
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Campaign</th>
                                        <th>Business</th>
                                        <th>Status</th>
                                        <th>Reward</th>
                                        <th>Submissions</th>
                                        <th>Verification</th>
                                        <th>Platform Fee</th>
                                        <th>Created</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {campaigns.map((c: any) => (
                                        <tr key={c._id}>
                                            <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{c.title}</td>
                                            <td>{c.businessName}</td>
                                            <td><span className={`status-badge ${c.status}`}>{c.status}</span></td>
                                            <td>{formatGold(c.rewardGrams)}</td>
                                            <td>{c.currentSubmissions} / {c.maxSubmissions}</td>
                                            <td>{c.verificationMethod}</td>
                                            <td style={{ color: 'var(--green-400)' }}>{formatGold(c.platformFee)}</td>
                                            <td>{formatDate(c.createdAt)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {activeTab === 'withdrawals' && (
                    <div className="admin-table-wrapper">
                        {!withdrawals?.length ? (
                            <p className="admin-empty">No withdrawals yet</p>
                        ) : (
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Amount</th>
                                        <th>CAD</th>
                                        <th>Method</th>
                                        <th>Status</th>
                                        <th>Transfer ID</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {withdrawals.map((w: any) => (
                                        <tr key={w._id}>
                                            <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{w.userName}</td>
                                            <td>{formatGold(w.amount)}</td>
                                            <td>{formatCAD(w.cadAmount)}</td>
                                            <td><span className={`status-badge ${w.method === 'stripe' ? 'active' : 'processing'}`}>{w.method}</span></td>
                                            <td><span className={`status-badge ${w.status}`}>{w.status}</span></td>
                                            <td style={{ fontSize: '0.75rem', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {w.stripeTransferId || w.cryptoTxSignature || '—'}
                                            </td>
                                            <td>{formatDate(w.createdAt)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default AdminDashboard

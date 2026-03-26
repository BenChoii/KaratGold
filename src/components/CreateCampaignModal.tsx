import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Instagram, Facebook, Plus, Trash2, ArrowRight, Loader2, CheckCircle2, Coins, Zap, Eye } from 'lucide-react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import './CreateCampaignModal.css'

interface CreateCampaignModalProps {
    isOpen: boolean
    onClose: () => void
    businessId: Id<"businesses">
    goldPool: number
    onFundClick: () => void
}

const PLATFORMS = [
    { id: 'Instagram', label: 'Instagram', icon: Instagram, color: '#E4405F' },
    { id: 'Facebook', label: 'Facebook', icon: Facebook, color: '#1877F2' },
]

function CreateCampaignModal({ isOpen, onClose, businessId, goldPool, onFundClick }: CreateCampaignModalProps) {
    const createCampaign = useMutation(api.campaigns.create)
    const goldPriceData = useQuery(api.goldPrice.getGoldPrice)
    const GOLD_PRICE_PER_OUNCE = goldPriceData?.paxgUsd ?? 2900
    const MIN_REWARD_USD = 10
    const MIN_REWARD_OUNCES = Math.ceil((MIN_REWARD_USD / GOLD_PRICE_PER_OUNCE) * 100000) / 100000
    const MIN_BUDGET_USD = 100
    const PLATFORM_FEE_RATE = 0.20

    const [form, setForm] = useState({
        title: '',
        description: '',
        rewardGrams: MIN_REWARD_OUNCES,
        rewardUsd: MIN_REWARD_USD,
        maxSubmissions: 10,
        platforms: ['Instagram'] as string[],
        requirements: [] as string[],
        verificationMethod: 'auto' as 'auto' | 'manual',
    })
    const [currencyMode, setCurrencyMode] = useState<'gold' | 'usd'>('usd')
    const [newRequirement, setNewRequirement] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)

    const rewardGrams = currencyMode === 'usd'
        ? Math.round((form.rewardUsd / GOLD_PRICE_PER_OUNCE) * 100000) / 100000
        : form.rewardGrams
    const rewardUsd = currencyMode === 'gold'
        ? form.rewardGrams * GOLD_PRICE_PER_OUNCE
        : form.rewardUsd
    const budgetUsd = rewardUsd * form.maxSubmissions
    const feeUsd = Math.round(budgetUsd * PLATFORM_FEE_RATE * 100) / 100
    const feeGrams = Math.round((feeUsd / GOLD_PRICE_PER_OUNCE) * 100000) / 100000
    const totalCost = rewardGrams * form.maxSubmissions + feeGrams
    const hasEnoughGold = goldPool >= totalCost
    const meetsMinimum = rewardUsd >= MIN_REWARD_USD
    const meetsBudgetMin = budgetUsd >= MIN_BUDGET_USD
    const isValid = form.title && form.description && form.platforms.length > 0 && form.requirements.length > 0 && hasEnoughGold && meetsMinimum && meetsBudgetMin

    const togglePlatform = (id: string) => {
        // Enforce IG-only rule if Auto is selected
        if (form.verificationMethod === 'auto' && id === 'Facebook') {
            return;
        }

        setForm(f => ({
            ...f,
            platforms: f.platforms.includes(id)
                ? f.platforms.filter(p => p !== id)
                : [...f.platforms, id]
        }))
    }

    const setVerificationMethod = (method: 'auto' | 'manual') => {
        setForm(f => ({
            ...f,
            verificationMethod: method,
            // Automatically select Instagram, deselect Facebook if switching to Auto
            platforms: method === 'auto' ? ['Instagram'] : f.platforms.length === 0 ? ['Instagram'] : f.platforms
        }));
    }

    const addRequirement = () => {
        const trimmed = newRequirement.trim()
        if (trimmed && !form.requirements.includes(trimmed)) {
            setForm(f => ({ ...f, requirements: [...f.requirements, trimmed] }))
            setNewRequirement('')
        }
    }

    const removeRequirement = (req: string) => {
        setForm(f => ({ ...f, requirements: f.requirements.filter(r => r !== req) }))
    }

    const handleSubmit = async () => {
        if (!isValid || submitting) return

        setSubmitting(true)
        try {
            await createCampaign({
                businessId,
                title: form.title,
                description: form.description,
                rewardGrams: rewardGrams,
                maxSubmissions: form.maxSubmissions,
                platforms: form.platforms,
                requirements: form.requirements,
                verificationMethod: form.verificationMethod,
            })
            setSuccess(true)
            setTimeout(() => {
                setSuccess(false)
                setForm({
                    title: '', description: '', rewardGrams: MIN_REWARD_OUNCES, rewardUsd: MIN_REWARD_USD,
                    maxSubmissions: 10, platforms: ['Instagram'], requirements: [], verificationMethod: 'auto'
                })
                setCurrencyMode('usd')
                onClose()
            }, 1800)
        } catch (err) {
            console.error('Campaign creation error:', err)
            setSubmitting(false)
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="campaign-modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="campaign-modal"
                        initial={{ opacity: 0, y: 40, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 40, scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Success state */}
                        {success ? (
                            <motion.div
                                className="campaign-success"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                            >
                                <div className="success-icon">
                                    <CheckCircle2 size={48} />
                                </div>
                                <h2 className="text-h3">Campaign Launched!</h2>
                                <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>
                                    Your campaign is now live. Submissions will start rolling in.
                                </p>
                            </motion.div>
                        ) : (
                            <>
                                {/* Header */}
                                <div className="campaign-modal-header">
                                    <div>
                                        <h2 className="text-h3">New Campaign</h2>
                                        <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>
                                            Define what you want posted and how much gold to offer
                                        </p>
                                    </div>
                                    <button className="modal-close-btn" onClick={onClose}>
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Form */}
                                <div className="campaign-modal-body">
                                    {/* Title */}
                                    <div className="cm-field">
                                        <label className="cm-label">Campaign Title</label>
                                        <input
                                            type="text"
                                            className="input"
                                            placeholder="e.g. Summer Patio Launch"
                                            value={form.title}
                                            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                        />
                                    </div>

                                    {/* Description */}
                                    <div className="cm-field">
                                        <label className="cm-label">What should posters do?</label>
                                        <textarea
                                            className="input cm-textarea"
                                            placeholder="e.g. Visit our café, take a photo of your drink on the patio, and share it with your followers"
                                            value={form.description}
                                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                            rows={3}
                                        />
                                    </div>

                                    <div className="cm-divider" />

                                    {/* Verification Strategy */}
                                    <div className="cm-field">
                                        <label className="cm-label">Verification Strategy</label>
                                        <div className="cm-currency-toggle" style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                type="button"
                                                className={`btn btn-sm ${form.verificationMethod === 'auto' ? 'btn-primary' : 'btn-ghost'}`}
                                                onClick={() => setVerificationMethod('auto')}
                                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                            >
                                                <Zap size={14} style={{ color: form.verificationMethod === 'auto' ? 'var(--gold-dark)' : 'currentColor' }} /> Auto (AI Verified)
                                            </button>
                                            <button
                                                type="button"
                                                className={`btn btn-sm ${form.verificationMethod === 'manual' ? 'btn-primary' : 'btn-ghost'}`}
                                                onClick={() => setVerificationMethod('manual')}
                                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                            >
                                                <Eye size={14} /> Manual (Business Reviews)
                                            </button>
                                        </div>
                                    </div>

                                    {/* Platforms */}
                                    <div className="cm-field" style={{ marginTop: '16px' }}>
                                        <label className="cm-label">Platforms</label>
                                        <div className="cm-platforms">
                                            {PLATFORMS.map(p => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    disabled={form.verificationMethod === 'auto' && p.id === 'Facebook'}
                                                    className={`cm-platform-chip ${form.platforms.includes(p.id) ? 'active' : ''}`}
                                                    onClick={() => togglePlatform(p.id)}
                                                    style={{
                                                        ...(form.platforms.includes(p.id) ? { borderColor: p.color, color: p.color } : {}),
                                                        ...(form.verificationMethod === 'auto' && p.id === 'Facebook' ? { opacity: 0.4, cursor: 'not-allowed', filter: 'grayscale(1)' } : {})
                                                    }}
                                                >
                                                    <p.icon size={16} />
                                                    {p.label}
                                                </button>
                                            ))}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--bg-secondary)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
                                            {form.verificationMethod === 'auto' ? (
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <span style={{ fontSize: '1rem', color: 'var(--gold-dark)' }}><Zap size={16} /></span>
                                                    <p><strong>Instant Verification:</strong> We auto-verify Instagram posts with our AI. Facebook is unsupported for instant automated payouts.</p>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <span style={{ fontSize: '1rem', color: 'var(--text-tertiary)' }}><Eye size={16} /></span>
                                                    <p><strong>Manual Review:</strong> Patrons submit their Instagram or Facebook post URLs. You will need to manually approve them.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Requirements */}
                                    <div className="cm-field">
                                        <label className="cm-label">Post Requirements</label>
                                        <div className="cm-requirements">
                                            {form.requirements.map(req => (
                                                <span key={req} className="cm-req-tag">
                                                    {req}
                                                    <button type="button" onClick={() => removeRequirement(req)}>
                                                        <Trash2 size={12} />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                        <div className="cm-req-input-row">
                                            <input
                                                type="text"
                                                className="input"
                                                placeholder="e.g. Tag @yourbusiness"
                                                value={newRequirement}
                                                onChange={e => setNewRequirement(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
                                            />
                                            <button type="button" className="btn btn-ghost btn-sm" onClick={addRequirement}>
                                                <Plus size={16} /> Add
                                            </button>
                                        </div>
                                    </div>

                                    <div className="cm-divider" />

                                    {/* Reward Config */}
                                    <div className="cm-currency-toggle" style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                        <button
                                            type="button"
                                            className={`btn btn-sm ${currencyMode === 'gold' ? 'btn-primary' : 'btn-ghost'}`}
                                            onClick={() => setCurrencyMode('gold')}
                                            style={{ flex: 1 }}
                                        >
                                            <Coins size={14} style={{ marginRight: 6, fill: currencyMode === 'gold' ? 'var(--gold)' : 'currentColor' }} /> Gold (ounces)
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn btn-sm ${currencyMode === 'usd' ? 'btn-primary' : 'btn-ghost'}`}
                                            onClick={() => setCurrencyMode('usd')}
                                            style={{ flex: 1 }}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill={currencyMode === 'cad' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                                                <path d="M12 2v20" />
                                                <path d="M12 2l-3 6-5-2 4 5-3 6 7-2 7 2-3-6 4-5-5 2-3-6z" />
                                            </svg> CAD (dollars)
                                        </button>
                                    </div>

                                    <div className="cm-rewards-grid">
                                        <div className="cm-field">
                                            <label className="cm-label">Reward per Post</label>
                                            {currencyMode === 'gold' ? (
                                                <>
                                                    <div className="cm-number-input">
                                                        <input
                                                            type="number"
                                                            className="input"
                                                            min="0.01"
                                                            step="0.01"
                                                            value={form.rewardGrams}
                                                            onChange={e => setForm(f => ({ ...f, rewardGrams: parseFloat(e.target.value) || 0 }))}
                                                        />
                                                        <span className="cm-unit">ounces</span>
                                                    </div>
                                                    <p className="cm-hint">
                                                        ≈ ${(form.rewardGrams * GOLD_PRICE_PER_OUNCE).toFixed(2)} CAD per post
                                                    </p>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="cm-number-input">
                                                        <input
                                                            type="number"
                                                            className="input"
                                                            min="1"
                                                            step="0.50"
                                                            value={form.rewardCad}
                                                            onChange={e => setForm(f => ({ ...f, rewardCad: parseFloat(e.target.value) || 0 }))}
                                                        />
                                                        <span className="cm-unit">CAD</span>
                                                    </div>
                                                    <p className="cm-hint">
                                                        ≈ {rewardGrams.toFixed(5)} oz gold at ${GOLD_PRICE_PER_OUNCE.toFixed(2)}/oz
                                                    </p>
                                                </>
                                            )}
                                            {!meetsMinimum && (
                                                <p className="cm-hint" style={{ color: 'var(--red, #ef4444)' }}>
                                                    ⚠️ Minimum reward is $10 CAD/post (≈ {MIN_REWARD_OUNCES.toFixed(4)} oz)
                                                </p>
                                            )}
                                        </div>
                                        <div className="cm-field">
                                            <label className="cm-label">Max Submissions</label>
                                            <div className="cm-number-input">
                                                <input
                                                    type="number"
                                                    className="input"
                                                    min="1"
                                                    step="1"
                                                    value={form.maxSubmissions}
                                                    onChange={e => setForm(f => ({ ...f, maxSubmissions: parseInt(e.target.value) || 1 }))}
                                                />
                                                <span className="cm-unit">posts</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Cost Summary */}
                                    <div className={`cm-cost-summary ${!hasEnoughGold ? 'insufficient' : ''}`}>
                                        <div className="cm-cost-row">
                                            <span>Budget ({form.maxSubmissions} posts × ${rewardCad.toFixed(2)})</span>
                                            <span>${budgetCad.toFixed(2)} CAD</span>
                                        </div>
                                        <div className="cm-cost-row" style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>
                                            <span>Platform Fee (20%)</span>
                                            <span>${feeCad.toFixed(2)} CAD ({feeGrams.toFixed(4)} oz)</span>
                                        </div>
                                        <div className="cm-cost-row" style={{ fontWeight: 700, borderTop: '1px solid var(--border)', paddingTop: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                                            <span>Total Campaign Cost</span>
                                            <span className="cm-cost-value">
                                                <Coins size={16} />
                                                {totalCost.toFixed(3)} oz
                                                <span className="cm-cost-cad">
                                                    (${(totalCost * GOLD_PRICE_PER_OUNCE).toFixed(2)} CAD)
                                                </span>
                                            </span>
                                        </div>
                                        <div className="cm-cost-row cm-cost-pool">
                                            <span>Your Gold Pool</span>
                                            <span>{goldPool.toFixed(3)} oz available</span>
                                        </div>
                                        {!meetsBudgetMin && (
                                            <p className="cm-cost-warning">
                                                Minimum campaign budget is $100 CAD. Current: ${budgetCad.toFixed(2)}. Increase reward or number of posts.
                                            </p>
                                        )}
                                        {meetsBudgetMin && !hasEnoughGold && (
                                            <div className="cm-cost-warning-box" style={{ marginTop: '16px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px' }}>
                                                <p style={{ color: 'var(--red)', fontSize: '0.8125rem', marginBottom: '8px', fontWeight: 600 }}>
                                                    Not Enough Gold
                                                </p>
                                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '12px' }}>
                                                    You need {(totalCost - goldPool).toFixed(3)} oz more to launch this campaign.
                                                </p>
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    style={{ width: '100%', justifyContent: 'center' }}
                                                    onClick={onFundClick}
                                                >
                                                    <Coins size={14} /> Fund Gold Pool
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="campaign-modal-footer">
                                    <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                                    <button
                                        className="btn btn-primary btn-lg"
                                        disabled={!isValid || submitting}
                                        onClick={handleSubmit}
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 size={18} className="spinning" />
                                                Launching...
                                            </>
                                        ) : (
                                            <>
                                                Launch Campaign <ArrowRight size={18} />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default CreateCampaignModal

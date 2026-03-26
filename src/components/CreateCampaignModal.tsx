import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Instagram, Facebook, Plus, Trash2, ArrowRight, Loader2, CheckCircle2, Coins, Zap, Eye } from 'lucide-react'
import { useMutation } from 'convex/react'
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
    const MIN_REWARD_OZ = 0.001
    const MIN_BUDGET_OZ = 0.01
    const PLATFORM_FEE_RATE = 0.20

    const [form, setForm] = useState({
        title: '',
        description: '',
        rewardGrams: 0.003,
        maxSubmissions: 10,
        platforms: ['Instagram'] as string[],
        requirements: [] as string[],
        verificationMethod: 'auto' as 'auto' | 'manual',
    })
    const [newRequirement, setNewRequirement] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)

    const rewardGrams = form.rewardGrams
    const budgetOz = rewardGrams * form.maxSubmissions
    const feeGrams = Math.round(budgetOz * PLATFORM_FEE_RATE * 100000) / 100000
    const totalCost = budgetOz + feeGrams
    const hasEnoughGold = goldPool >= totalCost
    const meetsMinimum = rewardGrams >= MIN_REWARD_OZ
    const meetsBudgetMin = budgetOz >= MIN_BUDGET_OZ
    const isValid = form.title && form.description && form.platforms.length > 0 && form.requirements.length > 0 && hasEnoughGold && meetsMinimum && meetsBudgetMin

    const togglePlatform = (id: string) => {
        if (form.verificationMethod === 'auto' && id === 'Facebook') return
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
            platforms: method === 'auto' ? ['Instagram'] : f.platforms.length === 0 ? ['Instagram'] : f.platforms
        }))
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
                rewardGrams,
                maxSubmissions: form.maxSubmissions,
                platforms: form.platforms,
                requirements: form.requirements,
                verificationMethod: form.verificationMethod,
            })
            setSuccess(true)
            setTimeout(() => {
                setSuccess(false)
                setForm({
                    title: '', description: '', rewardGrams: 0.003,
                    maxSubmissions: 10, platforms: ['Instagram'], requirements: [], verificationMethod: 'auto'
                })
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
                <motion.div className="campaign-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
                    <motion.div className="campaign-modal" initial={{ opacity: 0, y: 40, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.96 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} onClick={e => e.stopPropagation()}>
                        {success ? (
                            <motion.div className="campaign-success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }}>
                                <div className="success-icon"><CheckCircle2 size={48} /></div>
                                <h2 className="text-h3">Campaign Launched!</h2>
                                <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>Your campaign is now live. Submissions will start rolling in.</p>
                            </motion.div>
                        ) : (
                            <>
                                <div className="campaign-modal-header">
                                    <div>
                                        <h2 className="text-h3">New Campaign</h2>
                                        <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>Define what you want posted and how much gold to offer</p>
                                    </div>
                                    <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>
                                </div>

                                <div className="campaign-modal-body">
                                    <div className="cm-field">
                                        <label className="cm-label">Campaign Title</label>
                                        <input type="text" className="input" placeholder="e.g. Summer Patio Launch" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                                    </div>

                                    <div className="cm-field">
                                        <label className="cm-label">What should posters do?</label>
                                        <textarea className="input cm-textarea" placeholder="e.g. Visit our cafe, take a photo of your drink on the patio, and share it with your followers" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
                                    </div>

                                    <div className="cm-divider" />

                                    <div className="cm-field">
                                        <label className="cm-label">Verification Strategy</label>
                                        <div className="cm-currency-toggle" style={{ display: 'flex', gap: '8px' }}>
                                            <button type="button" className={`btn btn-sm ${form.verificationMethod === 'auto' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setVerificationMethod('auto')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                <Zap size={14} style={{ color: form.verificationMethod === 'auto' ? 'var(--gold-dark)' : 'currentColor' }} /> Auto (AI Verified)
                                            </button>
                                            <button type="button" className={`btn btn-sm ${form.verificationMethod === 'manual' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setVerificationMethod('manual')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                <Eye size={14} /> Manual (Business Reviews)
                                            </button>
                                        </div>
                                    </div>

                                    <div className="cm-field" style={{ marginTop: '16px' }}>
                                        <label className="cm-label">Platforms</label>
                                        <div className="cm-platforms">
                                            {PLATFORMS.map(p => (
                                                <button key={p.id} type="button" disabled={form.verificationMethod === 'auto' && p.id === 'Facebook'} className={`cm-platform-chip ${form.platforms.includes(p.id) ? 'active' : ''}`} onClick={() => togglePlatform(p.id)} style={{ ...(form.platforms.includes(p.id) ? { borderColor: p.color, color: p.color } : {}), ...(form.verificationMethod === 'auto' && p.id === 'Facebook' ? { opacity: 0.4, cursor: 'not-allowed', filter: 'grayscale(1)' } : {}) }}>
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

                                    <div className="cm-field">
                                        <label className="cm-label">Post Requirements</label>
                                        <div className="cm-requirements">
                                            {form.requirements.map(req => (
                                                <span key={req} className="cm-req-tag">
                                                    {req}
                                                    <button type="button" onClick={() => removeRequirement(req)}><Trash2 size={12} /></button>
                                                </span>
                                            ))}
                                        </div>
                                        <div className="cm-req-input-row">
                                            <input type="text" className="input" placeholder="e.g. Tag @yourbusiness" value={newRequirement} onChange={e => setNewRequirement(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addRequirement())} />
                                            <button type="button" className="btn btn-ghost btn-sm" onClick={addRequirement}><Plus size={16} /> Add</button>
                                        </div>
                                    </div>

                                    <div className="cm-divider" />

                                    {/* Reward Config - Gold ounces only */}
                                    <div className="cm-rewards-grid">
                                        <div className="cm-field">
                                            <label className="cm-label">Reward per Post</label>
                                            <div className="cm-number-input">
                                                <input type="number" className="input" min="0.001" step="0.001" value={form.rewardGrams} onChange={e => setForm(f => ({ ...f, rewardGrams: parseFloat(e.target.value) || 0 }))} />
                                                <span className="cm-unit">oz gold</span>
                                            </div>
                                            <p className="cm-hint">= {form.rewardGrams} PAXG per post</p>
                                            {!meetsMinimum && (
                                                <p className="cm-hint" style={{ color: 'var(--red, #ef4444)' }}>Minimum reward is {MIN_REWARD_OZ} oz/post</p>
                                            )}
                                        </div>
                                        <div className="cm-field">
                                            <label className="cm-label">Max Submissions</label>
                                            <div className="cm-number-input">
                                                <input type="number" className="input" min="1" step="1" value={form.maxSubmissions} onChange={e => setForm(f => ({ ...f, maxSubmissions: parseInt(e.target.value) || 1 }))} />
                                                <span className="cm-unit">posts</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Cost Summary */}
                                    <div className={`cm-cost-summary ${!hasEnoughGold ? 'insufficient' : ''}`}>
                                        <div className="cm-cost-row">
                                            <span>Budget ({form.maxSubmissions} posts x {rewardGrams} oz)</span>
                                            <span>{budgetOz.toFixed(4)} oz</span>
                                        </div>
                                        <div className="cm-cost-row" style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>
                                            <span>Platform Fee (20%)</span>
                                            <span>{feeGrams.toFixed(4)} oz</span>
                                        </div>
                                        <div className="cm-cost-row" style={{ fontWeight: 700, borderTop: '1px solid var(--border)', paddingTop: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                                            <span>Total Campaign Cost</span>
                                            <span className="cm-cost-value"><Coins size={16} /> {totalCost.toFixed(4)} oz</span>
                                        </div>
                                        <div className="cm-cost-row cm-cost-pool">
                                            <span>Your Gold Pool</span>
                                            <span>{goldPool.toFixed(3)} oz available</span>
                                        </div>
                                        {!meetsBudgetMin && (
                                            <p className="cm-cost-warning">Minimum campaign budget is {MIN_BUDGET_OZ} oz. Current: {budgetOz.toFixed(4)} oz. Increase reward or number of posts.</p>
                                        )}
                                        {meetsBudgetMin && !hasEnoughGold && (
                                            <div className="cm-cost-warning-box" style={{ marginTop: '16px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px' }}>
                                                <p style={{ color: 'var(--red)', fontSize: '0.8125rem', marginBottom: '8px', fontWeight: 600 }}>Not Enough Gold</p>
                                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '12px' }}>You need {(totalCost - goldPool).toFixed(3)} oz more to launch this campaign.</p>
                                                <button className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={onFundClick}><Coins size={14} /> Fund Gold Pool</button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="campaign-modal-footer">
                                    <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                                    <button className="btn btn-primary btn-lg" disabled={!isValid || submitting} onClick={handleSubmit}>
                                        {submitting ? (<><Loader2 size={18} className="spinning" /> Launching...</>) : (<>Launch Campaign <ArrowRight size={18} /></>)}
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

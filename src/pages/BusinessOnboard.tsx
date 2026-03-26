import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Building2, Tag, Instagram, ArrowRight, Loader2, MapPin, Truck, X, Plus, Facebook } from 'lucide-react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import LocationAutocomplete from '../components/LocationAutocomplete'
import './BusinessOnboard.css'

function BusinessOnboard() {
    const navigate = useNavigate()
    const { publicKey } = useWallet()
    const walletAddress = publicKey?.toBase58() ?? null
    const convexUser = useQuery(api.users.getByWalletAddress,
        walletAddress ? { walletAddress } : "skip"
    )
    const business = useQuery(
        api.businesses.getByOwner,
        convexUser ? { ownerId: convexUser._id } : "skip"
    )
    const createBusiness = useMutation(api.businesses.create)

    // If user already has a business, skip to dashboard
    if (business) {
        navigate('/dashboard')
        return null
    }

    const [form, setForm] = useState({
        name: '',
        category: '',
        location: '',
        latitude: null as number | null,
        longitude: null as number | null,
        locationType: 'physical' as 'physical' | 'service_area',
        serviceAreas: [] as string[],
        instagramHandle: '',
        facebookHandle: '',
    })
    const [submitting, setSubmitting] = useState(false)
    const [cityInput, setCityInput] = useState('')

    const categories = [
        'Café', 'Restaurant & Bar', 'Automotive', 'Plumbing', 'HVAC',
        'Barber', 'Salon', 'Fitness', 'Retail', 'Construction',
        'Landscaping', 'Cleaning', 'Photography', 'Mobile Detailing',
        'Electrician', 'Roofing', 'Pest Control', 'Other'
    ]

    const addServiceArea = (city: string) => {
        const trimmed = city.trim()
        if (trimmed && !form.serviceAreas.includes(trimmed)) {
            setForm(f => ({ ...f, serviceAreas: [...f.serviceAreas, trimmed] }))
        }
        setCityInput('')
    }

    const removeServiceArea = (city: string) => {
        setForm(f => ({ ...f, serviceAreas: f.serviceAreas.filter(c => c !== city) }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!convexUser || !form.name || !form.category) return
        if (form.locationType === 'physical' && !form.location) return
        if (form.locationType === 'service_area' && form.serviceAreas.length === 0) return

        setSubmitting(true)
        try {
            await createBusiness({
                ownerId: convexUser._id,
                name: form.name,
                category: form.category,
                location: form.locationType === 'physical'
                    ? form.location
                    : form.serviceAreas.join(', '),
                latitude: form.latitude ?? undefined,
                longitude: form.longitude ?? undefined,
                locationType: form.locationType,
                serviceAreas: form.locationType === 'service_area' ? form.serviceAreas : undefined,
                instagramHandle: form.instagramHandle || undefined,
                facebookHandle: form.facebookHandle || undefined,
            })
            navigate('/dashboard')
        } catch (err) {
            console.error('Onboarding error:', err)
            setSubmitting(false)
        }
    }

    return (
        <div className="onboard-page">
            <div className="container">
                <motion.div
                    className="onboard-content"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="onboard-header">
                        <h1 className="text-h2">Set Up Your Business</h1>
                        <p className="text-body" style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
                            Join the gold rewards network — let real customers post about you
                        </p>
                    </div>

                    <form className="onboard-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">
                                <Building2 size={16} /> Business Name
                            </label>
                            <input
                                type="text"
                                className="input"
                                placeholder="e.g. Golden Bean Coffee"
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                <Tag size={16} /> Category
                            </label>
                            <select
                                className="input select-input"
                                value={form.category}
                                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                required
                            >
                                <option value="">Select a category</option>
                                {categories.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        {/* Location Type Toggle */}
                        <div className="form-group">
                            <label className="form-label">Business Type</label>
                            <div className="location-type-toggle">
                                <button
                                    type="button"
                                    className={`toggle-btn ${form.locationType === 'physical' ? 'active' : ''}`}
                                    onClick={() => setForm(f => ({ ...f, locationType: 'physical' }))}
                                >
                                    <MapPin size={16} />
                                    Physical Location
                                </button>
                                <button
                                    type="button"
                                    className={`toggle-btn ${form.locationType === 'service_area' ? 'active' : ''}`}
                                    onClick={() => setForm(f => ({ ...f, locationType: 'service_area' }))}
                                >
                                    <Truck size={16} />
                                    Service Area
                                </button>
                            </div>
                            <p className="form-hint">
                                {form.locationType === 'physical'
                                    ? 'Customers will tag your business location on social media'
                                    : 'Customers will tag one of your service cities on social media'
                                }
                            </p>
                        </div>

                        {/* Physical: Address input */}
                        {form.locationType === 'physical' && (
                            <div className="form-group">
                                <label className="form-label">
                                    <MapPin size={16} /> Address
                                </label>
                                <LocationAutocomplete
                                    value={form.location}
                                    onChange={(location, lat, lng) => setForm(f => ({
                                        ...f,
                                        location,
                                        latitude: lat,
                                        longitude: lng,
                                    }))}
                                    placeholder="e.g. 1234 Main St, Your City"
                                />
                            </div>
                        )}

                        {/* Service Area: City picker */}
                        {form.locationType === 'service_area' && (
                            <div className="form-group">
                                <label className="form-label">
                                    <MapPin size={16} /> Service Cities
                                </label>

                                {/* Selected cities */}
                                {form.serviceAreas.length > 0 && (
                                    <div className="service-area-tags">
                                        {form.serviceAreas.map(city => (
                                            <span key={city} className="city-tag">
                                                {city}
                                                <button
                                                    type="button"
                                                    className="city-tag-remove"
                                                    onClick={() => removeServiceArea(city)}
                                                >
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* City input with suggestions */}
                                <div className="city-input-wrap">
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="Type a city name and press Enter..."
                                        value={cityInput}
                                        onChange={e => {
                                            setCityInput(e.target.value)
                                        }}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault()
                                                addServiceArea(cityInput)
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        className="city-input-icon"
                                        onClick={() => addServiceArea(cityInput)}
                                        style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'inherit' }}
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Social handles */}
                        <div className="form-row">
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">
                                    <Instagram size={16} /> Instagram
                                    <span className="optional-tag">Optional</span>
                                </label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="@yourbusiness"
                                    value={form.instagramHandle}
                                    onChange={e => setForm(f => ({ ...f, instagramHandle: e.target.value }))}
                                />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">
                                    <Facebook size={16} /> Facebook
                                    <span className="optional-tag">Optional</span>
                                </label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="@yourbusiness"
                                    value={form.facebookHandle}
                                    onChange={e => setForm(f => ({ ...f, facebookHandle: e.target.value }))}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg submit-btn"
                            disabled={
                                submitting ||
                                !form.name ||
                                !form.category ||
                                (form.locationType === 'physical' && !form.location) ||
                                (form.locationType === 'service_area' && form.serviceAreas.length === 0)
                            }
                        >
                            {submitting ? (
                                <>
                                    <Loader2 size={18} className="spinning" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    Launch Your Business
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>
                </motion.div>
            </div>
        </div>
    )
}

export default BusinessOnboard

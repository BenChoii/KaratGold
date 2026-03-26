import { motion } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect } from 'react'
import { Users, Briefcase, ArrowRight, Coins, BarChart3 } from 'lucide-react'
import { useUser } from '@clerk/clerk-react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import './RoleSelect.css'

function RoleSelect() {
    const navigate = useNavigate()
    const { user: clerkUser } = useUser()
    const convexUser = useQuery(api.users.getByClerkId, {
        clerkId: clerkUser?.id ?? "none",
    })
    const updateRole = useMutation(api.users.updateRole)

    // If user already has a role, redirect
    if (convexUser && convexUser.role === 'customer') {
        navigate('/explore')
        return null
    }
    if (convexUser && convexUser.role === 'business') {
        // Check if they have a business — if not, send to onboarding
        navigate('/onboard')
        return null
    }

    const [searchParams] = useSearchParams()

    const handleSelect = async (role: 'customer' | 'business') => {
        if (!convexUser) return

        await updateRole({ userId: convexUser._id, role })

        if (role === 'customer') {
            navigate('/explore')
        } else {
            navigate('/onboard')
        }
    }

    useEffect(() => {
        const autoRole = searchParams.get('selected')
        if (convexUser && convexUser.role === 'pending' && (autoRole === 'customer' || autoRole === 'business')) {
            handleSelect(autoRole)
        }
    }, [convexUser, searchParams])

    return (
        <div className="role-select-page">
            <div className="container">
                <motion.div
                    className="role-select-content"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <h1 className="text-h2 text-center">Finalizing Account</h1>
                    <p className="text-body text-center" style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)', maxWidth: '440px', margin: 'var(--space-2) auto 0' }}>
                        If you are not automatically redirected, please select your role below.
                    </p>

                    <div className="role-cards">
                        <motion.button
                            className="role-card card-solid"
                            onClick={() => handleSelect('customer')}
                            whileHover={{ scale: 1.02, y: -4 }}
                            whileTap={{ scale: 0.98 }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                        >
                            <div className="role-icon customer-icon">
                                <Users size={32} />
                            </div>
                            <h3 className="text-h3">I'm a Customer</h3>
                            <p className="text-body-sm" style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
                                Earn real gold by sharing posts about businesses you love
                            </p>
                            <div className="role-perks">
                                <span><Coins size={14} /> Earn gold per post</span>
                                <span><ArrowRight size={14} /> Cash out via e-Transfer</span>
                            </div>
                            <div className="role-cta">
                                Start Earning <ArrowRight size={16} />
                            </div>
                        </motion.button>

                        <motion.button
                            className="role-card card-solid"
                            onClick={() => handleSelect('business')}
                            whileHover={{ scale: 1.02, y: -4 }}
                            whileTap={{ scale: 0.98 }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25 }}
                        >
                            <div className="role-icon business-icon">
                                <Briefcase size={32} />
                            </div>
                            <h3 className="text-h3">I'm a Business Owner</h3>
                            <p className="text-body-sm" style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
                                Create campaigns and reward your community with gold for authentic posts
                            </p>
                            <div className="role-perks">
                                <span><BarChart3 size={14} /> Track engagement</span>
                                <span><Users size={14} /> Build real reach</span>
                            </div>
                            <div className="role-cta">
                                Create Campaign <ArrowRight size={16} />
                            </div>
                        </motion.button>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}

export default RoleSelect

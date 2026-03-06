import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    SignedIn,
    SignedOut,
    SignInButton,
    UserButton,
    useUser,
} from '@clerk/clerk-react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import './Navbar.css'

function Navbar() {
    const [mobileOpen, setMobileOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)
    const [hidden, setHidden] = useState(false)
    const lastScrollY = useRef(0)
    const location = useLocation()
    const isLanding = location.pathname === '/'
    const { user: clerkUser, isSignedIn } = useUser()
    const syncUser = useMutation(api.users.getOrCreate)

    const convexUser = useQuery(
        api.users.getByClerkId,
        clerkUser ? { clerkId: clerkUser.id } : "skip"
    )

    const navLinks = [
        { label: 'Explore', path: '/explore' },
        { label: 'Submit', path: '/submit' },
        { label: 'Rewards', path: '/rewards' },
        ...(convexUser?.role === 'business' ? [{ label: 'Dashboard', path: '/dashboard' }] : []),
    ]

    useEffect(() => {
        const handleScroll = () => {
            const currentY = window.scrollY
            setScrolled(currentY > 20)
            // Hide on scroll down, show on scroll up (with 10px threshold to avoid flicker)
            if (currentY > lastScrollY.current + 10 && currentY > 80) {
                setHidden(true)
            } else if (currentY < lastScrollY.current - 10) {
                setHidden(false)
            }
            lastScrollY.current = currentY
        }
        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    // Close mobile menu on route change
    useEffect(() => {
        setMobileOpen(false)
    }, [location.pathname])

    // Sync Clerk user → Convex on sign in
    useEffect(() => {
        if (isSignedIn && clerkUser) {
            syncUser({
                clerkId: clerkUser.id,
                name: clerkUser.fullName ?? clerkUser.firstName ?? 'User',
                email: clerkUser.primaryEmailAddress?.emailAddress ?? '',
                avatarUrl: clerkUser.imageUrl,
            })
        }
    }, [isSignedIn, clerkUser?.id])

    const linkVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: { delay: 0.05 + i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }
        }),
        exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
    }

    return (
        <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''} ${hidden && !mobileOpen ? 'navbar-hidden' : ''} `}>
            <div className="navbar-inner container">
                <Link to="/" className="navbar-logo" aria-label="OKTD home" style={{ gap: '8px' }}>
                    <img src="/assets/karat-logo.png" alt="Karat" style={{ height: 28, width: 28, borderRadius: 6 }} />
                    <span className="logo-text">KARAT</span>
                    <span className="logo-text" style={{ opacity: 0.5 }}>×</span>
                    <div className="logo-oktd">
                        <span className="logo-oktd-text">OKTD</span>
                        <span className="logo-oktd-icon">🍁</span>
                    </div>
                </Link>

                {/* Desktop nav */}
                {isLanding ? (
                    <div className="navbar-links navbar-links-desktop">
                        <a href="#how-it-works" className="nav-link">How It Works</a>
                        <a href="#for-business" className="nav-link">For Business</a>
                        <a href="#about" className="nav-link">About</a>
                        <div className="navbar-actions">
                            <SignedOut>
                                <SignInButton mode="modal" forceRedirectUrl="/role" signUpForceRedirectUrl="/role">
                                    <button className="btn btn-ghost">Sign In</button>
                                </SignInButton>
                                <Link to="/join" className="btn btn-primary btn-sm">Get Started</Link>
                            </SignedOut>
                            <SignedIn>
                                <Link to="/explore" className="btn btn-ghost">Explore</Link>
                                <UserButton afterSignOutUrl="/" />
                            </SignedIn>
                        </div>
                    </div>
                ) : (
                    <div className="navbar-links navbar-links-desktop">
                        {navLinks.map((link) => (
                            <Link
                                key={link.label}
                                to={link.path}
                                className={`nav - link ${location.pathname === link.path ? 'active' : ''} `}
                            >
                                {link.label}
                            </Link>
                        ))}
                        <div className="navbar-actions">
                            <SignedIn>
                                <UserButton afterSignOutUrl="/" />
                            </SignedIn>
                            <SignedOut>
                                <SignInButton mode="modal" forceRedirectUrl="/role" signUpForceRedirectUrl="/role">
                                    <button className="btn btn-primary btn-sm">Sign In</button>
                                </SignInButton>
                            </SignedOut>
                        </div>
                    </div>
                )}

                {/* Mobile menu */}
                <AnimatePresence>
                    {mobileOpen && (
                        <motion.div
                            className="navbar-mobile-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="navbar-mobile-content">
                                {isLanding ? (
                                    <>
                                        {['How It Works', 'For Business', 'About'].map((label, i) => (
                                            <motion.a
                                                key={label}
                                                href={`#${label.toLowerCase().replace(/\s+/g, '-')} `}
                                                className="nav-link-mobile"
                                                onClick={() => setMobileOpen(false)}
                                                custom={i}
                                                variants={linkVariants}
                                                initial="hidden"
                                                animate="visible"
                                                exit="exit"
                                            >
                                                {label}
                                            </motion.a>
                                        ))}
                                        <motion.div
                                            className="navbar-mobile-actions"
                                            custom={3}
                                            variants={linkVariants}
                                            initial="hidden"
                                            animate="visible"
                                            exit="exit"
                                        >
                                            <SignedOut>
                                                <SignInButton mode="modal" forceRedirectUrl="/role" signUpForceRedirectUrl="/role">
                                                    <button className="btn btn-secondary btn-lg" onClick={() => setMobileOpen(false)}>Sign In</button>
                                                </SignInButton>
                                                <Link to="/join" className="btn btn-primary btn-lg" onClick={() => setMobileOpen(false)}>Get Started</Link>
                                            </SignedOut>
                                            <SignedIn>
                                                <Link to="/explore" className="btn btn-primary btn-lg" onClick={() => setMobileOpen(false)}>Explore</Link>
                                                <UserButton afterSignOutUrl="/" />
                                            </SignedIn>
                                        </motion.div>
                                    </>
                                ) : (
                                    <>
                                        {navLinks.map((link, i) => (
                                            <motion.div
                                                key={link.label}
                                                custom={i}
                                                variants={linkVariants}
                                                initial="hidden"
                                                animate="visible"
                                                exit="exit"
                                            >
                                                <Link
                                                    to={link.path}
                                                    className={`nav - link - mobile ${location.pathname === link.path ? 'active' : ''} `}
                                                    onClick={() => setMobileOpen(false)}
                                                >
                                                    {link.label}
                                                </Link>
                                            </motion.div>
                                        ))}
                                        <motion.div
                                            className="navbar-mobile-actions"
                                            custom={4}
                                            variants={linkVariants}
                                            initial="hidden"
                                            animate="visible"
                                            exit="exit"
                                        >
                                            <SignedIn>
                                                <UserButton afterSignOutUrl="/" />
                                            </SignedIn>
                                            <SignedOut>
                                                <SignInButton mode="modal" forceRedirectUrl="/role" signUpForceRedirectUrl="/role">
                                                    <button className="btn btn-primary btn-lg" onClick={() => setMobileOpen(false)}>Sign In</button>
                                                </SignInButton>
                                            </SignedOut>
                                        </motion.div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <button
                    className="navbar-toggle"
                    onClick={() => setMobileOpen(!mobileOpen)}
                    aria-label="Toggle navigation"
                >
                    {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
            </div>
        </nav>
    )
}

export default Navbar

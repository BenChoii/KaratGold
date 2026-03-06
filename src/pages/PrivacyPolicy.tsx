import './LegalPage.css'

function PrivacyPolicy() {
    return (
        <div className="legal-page">
            <div className="legal-container">
                <h1 className="text-h1">Privacy Policy</h1>
                <p className="legal-updated">Last updated: March 5, 2026</p>

                <section>
                    <h2>1. Introduction</h2>
                    <p>
                        KaratGold ("we", "our", or "us") operates the platform at localkarat.ca (the "Service").
                        This Privacy Policy explains how we collect, use, disclose, and safeguard your information
                        when you use our Service. By accessing or using the Service, you agree to this Privacy Policy.
                    </p>
                </section>

                <section>
                    <h2>2. Information We Collect</h2>
                    <h3>2.1 Information You Provide</h3>
                    <ul>
                        <li><strong>Account Information:</strong> Name, email address, and profile details provided through our authentication provider (Clerk).</li>
                        <li><strong>Business Information:</strong> Business name, category, location, Instagram handle, and other details submitted during business onboarding.</li>
                        <li><strong>Transaction Data:</strong> Records of gold earnings, campaign participation, and withdrawal requests.</li>
                        <li><strong>Payment Information:</strong> When funding campaigns through our third-party payment provider (Stripe), your payment details are collected and processed directly by Stripe under their own privacy policy. We do not store credit card numbers.</li>
                        <li><strong>Social Media Handles:</strong> Instagram or Facebook usernames submitted for post verification.</li>
                    </ul>

                    <h3>2.2 Information Collected Automatically</h3>
                    <ul>
                        <li><strong>Usage Data:</strong> Pages visited, features used, timestamps, and interaction patterns.</li>
                        <li><strong>Device Information:</strong> Browser type, operating system, IP address, and device identifiers.</li>
                        <li><strong>Cookies:</strong> We use essential cookies for authentication and session management.</li>
                    </ul>
                </section>

                <section>
                    <h2>3. How We Use Your Information</h2>
                    <ul>
                        <li>To provide, operate, and maintain the Service.</li>
                        <li>To process transactions, manage your account, and deliver earned gold rewards.</li>
                        <li>To verify social media posts and campaign submissions.</li>
                        <li>To communicate with you about your account, updates, and promotional offers.</li>
                        <li>To detect, prevent, and address fraud, abuse, or technical issues.</li>
                        <li>To comply with legal obligations and enforce our Terms of Service.</li>
                    </ul>
                </section>

                <section>
                    <h2>4. How We Share Your Information</h2>
                    <p>We do not sell your personal information. We may share data with:</p>
                    <ul>
                        <li><strong>Service Providers:</strong> Third-party vendors who assist in operating the platform (e.g., Clerk for authentication, Stripe for payment processing, Convex for database hosting).</li>
                        <li><strong>Business Partners:</strong> Campaign-participating businesses may see your submitted post data (username, post URL) for verification purposes.</li>
                        <li><strong>Legal Requirements:</strong> If required by law, regulation, or legal process.</li>
                    </ul>
                </section>

                <section>
                    <h2>5. Data Security</h2>
                    <p>
                        We implement industry-standard security measures to protect your information, including
                        encrypted connections (TLS), secure authentication, and access controls. However, no
                        method of transmission over the Internet is 100% secure.
                    </p>
                </section>

                <section>
                    <h2>6. Data Retention</h2>
                    <p>
                        We retain your personal information for as long as your account is active or as needed
                        to provide services. Transaction records are retained as required by applicable financial
                        regulations. You may request deletion of your account by contacting us.
                    </p>
                </section>

                <section>
                    <h2>7. Your Rights</h2>
                    <p>Depending on your jurisdiction, you may have the right to:</p>
                    <ul>
                        <li>Access, correct, or delete your personal data.</li>
                        <li>Withdraw consent for data processing.</li>
                        <li>Request a copy of your data in a portable format.</li>
                        <li>Object to or restrict certain processing activities.</li>
                    </ul>
                    <p>To exercise these rights, contact us at <strong>privacy@localkarat.ca</strong>.</p>
                </section>

                <section>
                    <h2>8. Third-Party Services</h2>
                    <p>
                        Our Service integrates with third-party platforms including Stripe, Instagram, Facebook,
                        and Clerk. These services have their own privacy policies, and we encourage you to review them.
                    </p>
                </section>

                <section>
                    <h2>9. Children's Privacy</h2>
                    <p>
                        The Service is not intended for individuals under the age of 18. We do not knowingly
                        collect personal information from minors.
                    </p>
                </section>

                <section>
                    <h2>10. Changes to This Policy</h2>
                    <p>
                        We may update this Privacy Policy from time to time. We will notify you of material
                        changes by posting the updated policy on this page with a revised "Last updated" date.
                    </p>
                </section>

                <section>
                    <h2>11. Contact Us</h2>
                    <p>
                        If you have questions about this Privacy Policy, contact us at:<br />
                        <strong>privacy@localkarat.ca</strong>
                    </p>
                </section>
            </div>
        </div>
    )
}

export default PrivacyPolicy

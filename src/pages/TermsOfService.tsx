import './LegalPage.css'

function TermsOfService() {
    return (
        <div className="legal-page">
            <div className="legal-container">
                <h1 className="text-h1">Terms of Service</h1>
                <p className="legal-updated">Last updated: March 5, 2026</p>

                <section>
                    <h2>1. Acceptance of Terms</h2>
                    <p>
                        By accessing or using KaratGold at localkarat.ca (the "Service"), you agree to be bound
                        by these Terms of Service ("Terms"). If you do not agree, do not use the Service.
                    </p>
                </section>

                <section>
                    <h2>2. Description of Service</h2>
                    <p>
                        KaratGold is a pay-per-performance marketing platform that connects local Okanagan
                        businesses with social media users. Businesses create campaigns that reward users with
                        fractional tokenized gold (PAXG) for creating authentic social media posts about
                        participating businesses.
                    </p>
                </section>

                <section>
                    <h2>3. Eligibility</h2>
                    <ul>
                        <li>You must be at least 18 years of age to use the Service.</li>
                        <li>You must provide accurate, current, and complete information during registration.</li>
                        <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                    </ul>
                </section>

                <section>
                    <h2>4. User Accounts</h2>
                    <p>
                        Accounts are managed through Clerk, our authentication provider. You are responsible for
                        all activity under your account. You must notify us immediately of any unauthorized use.
                        We reserve the right to suspend or terminate accounts that violate these Terms.
                    </p>
                </section>

                <section>
                    <h2>5. Campaigns & Rewards</h2>
                    <h3>5.1 For Businesses</h3>
                    <ul>
                        <li>You fund campaigns by purchasing gold reserves through our integrated payment provider (Stripe).</li>
                        <li>A 20% platform fee is deducted from each campaign budget at the time of creation.</li>
                        <li>Campaigns are subject to our content guidelines and may be removed at our discretion.</li>
                        <li>Refunds for unused campaign funds are handled on a case-by-case basis.</li>
                    </ul>

                    <h3>5.2 For Users</h3>
                    <ul>
                        <li>Rewards are credited to your internal gold ledger upon successful verification of your social media post.</li>
                        <li>Verification may be automatic (AI-powered) or manual (business review), depending on the campaign.</li>
                        <li>Gold balances can be withdrawn to an external cryptocurrency wallet (e.g., Coinbase) at any time.</li>
                        <li>Duplicate or fraudulent submissions will result in rejection and potential account suspension.</li>
                    </ul>
                </section>

                <section>
                    <h2>6. Payments & Financial Terms</h2>
                    <ul>
                        <li>All payments are processed through Stripe. By making a purchase, you also agree to Stripe's terms of service.</li>
                        <li>Gold balances on the platform represent fractional ownership claims tracked on our internal ledger.</li>
                        <li>Withdrawals are processed as cryptocurrency transfers from our custodial Master Wallet to your designated address.</li>
                        <li>We are not a bank, exchange, or licensed financial institution. Gold balances are not insured deposits.</li>
                        <li>Cryptocurrency values fluctuate. We are not responsible for changes in the value of PAXG, USDC, or any other asset.</li>
                    </ul>
                </section>

                <section>
                    <h2>7. Prohibited Conduct</h2>
                    <p>You agree not to:</p>
                    <ul>
                        <li>Submit fake, misleading, or plagiarized social media posts.</li>
                        <li>Create multiple accounts to exploit campaign rewards.</li>
                        <li>Use bots, scripts, or automated tools to interact with the Service.</li>
                        <li>Attempt to manipulate, hack, or reverse-engineer the platform.</li>
                        <li>Violate any applicable laws or third-party rights.</li>
                        <li>Post content that is defamatory, obscene, or harmful.</li>
                    </ul>
                </section>

                <section>
                    <h2>8. Intellectual Property</h2>
                    <p>
                        All content, design, code, and branding of the Service are owned by KaratGold.
                        You retain ownership of the social media content you create but grant us a non-exclusive,
                        royalty-free license to display and reference your submissions within the platform for
                        verification and campaign purposes.
                    </p>
                </section>

                <section>
                    <h2>9. Disclaimers</h2>
                    <ul>
                        <li>The Service is provided "as is" and "as available" without warranties of any kind.</li>
                        <li>We do not guarantee uninterrupted access, error-free operation, or specific financial outcomes.</li>
                        <li>AI-powered verification may occasionally produce incorrect results. We are not liable for verification errors.</li>
                    </ul>
                </section>

                <section>
                    <h2>10. Limitation of Liability</h2>
                    <p>
                        To the maximum extent permitted by law, KaratGold and its affiliates shall not be liable
                        for any indirect, incidental, special, consequential, or punitive damages arising from
                        your use of the Service, including but not limited to loss of profits, data, or
                        cryptocurrency value.
                    </p>
                </section>

                <section>
                    <h2>11. Indemnification</h2>
                    <p>
                        You agree to indemnify and hold harmless KaratGold, its officers, employees, and partners
                        from any claims, losses, or damages arising from your use of the Service or violation of
                        these Terms.
                    </p>
                </section>

                <section>
                    <h2>12. Modifications</h2>
                    <p>
                        We reserve the right to modify these Terms at any time. Changes will be posted on this page
                        with an updated date. Continued use of the Service after changes constitutes acceptance.
                    </p>
                </section>

                <section>
                    <h2>13. Governing Law</h2>
                    <p>
                        These Terms are governed by and construed in accordance with the laws of British Columbia,
                        Canada, without regard to conflict of law principles.
                    </p>
                </section>

                <section>
                    <h2>14. Contact</h2>
                    <p>
                        Questions about these Terms? Contact us at:<br />
                        <strong>legal@localkarat.ca</strong>
                    </p>
                </section>
            </div>
        </div>
    )
}

export default TermsOfService

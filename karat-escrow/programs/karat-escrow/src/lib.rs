use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("7yu3Vx9oYfpRchmxFbMQgFQUZ6iV6kPyEmtwEXcpyVLB");

// PAXG (Wormhole) Solana Mint Address
// Paxos Gold — 1 PAXG = 1 troy ounce of LBMA-certified gold
// Custodied by Brink's in London, regulated by NYDFS
pub const PAXG_MINT: Pubkey = pubkey!("C6oFsE8nXRDThzrMEQ5SxaNFGKoyyfWDDVPw37JKvPTe");

#[program]
pub mod karat_escrow {
    use super::*;

    /// Create a campaign escrow account.
    /// Business specifies reward per post and currency mode.
    pub fn create_campaign(
        ctx: Context<CreateCampaign>,
        campaign_id: String,
        reward_per_post: u64,
        currency_mode: u8,
        original_cad_amount: u64,
    ) -> Result<()> {
        require!(campaign_id.len() <= 64, KaratError::CampaignIdTooLong);
        require!(reward_per_post > 0, KaratError::InvalidAmount);
        require!(currency_mode <= 1, KaratError::InvalidCurrencyMode);

        let escrow = &mut ctx.accounts.campaign_escrow;
        escrow.campaign_id = campaign_id;
        escrow.business = ctx.accounts.business.key();
        escrow.oracle = ctx.accounts.oracle.key();
        escrow.mint = ctx.accounts.paxg_mint.key();
        escrow.total_funded = 0;
        escrow.total_paid_out = 0;
        escrow.reward_per_post = reward_per_post;
        escrow.currency_mode = currency_mode;
        escrow.original_cad_amount = original_cad_amount;
        escrow.is_active = true;
        escrow.bump = ctx.bumps.campaign_escrow;

        msg!(
            "Campaign escrow created: {} | reward_per_post={} | mode={}",
            escrow.campaign_id,
            reward_per_post,
            if currency_mode == 0 { "gold" } else { "cad" }
        );
        Ok(())
    }

    /// Fund a campaign escrow with PAXG tokens.
    pub fn fund_campaign(ctx: Context<FundCampaign>, amount: u64) -> Result<()> {
        require!(amount > 0, KaratError::InvalidAmount);

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.business_token_account.to_account_info(),
                    to: ctx.accounts.escrow_vault.to_account_info(),
                    authority: ctx.accounts.business.to_account_info(),
                },
            ),
            amount,
        )?;

        let escrow = &mut ctx.accounts.campaign_escrow;
        escrow.total_funded = escrow.total_funded.checked_add(amount)
            .ok_or(KaratError::Overflow)?;

        msg!("Funded {} PAXG lamports to campaign {}", amount, escrow.campaign_id);
        Ok(())
    }

    /// Approve a payout — oracle-signed transfer from escrow to customer.
    pub fn approve_payout(ctx: Context<ApprovePayout>, amount: u64) -> Result<()> {
        require!(amount > 0, KaratError::InvalidAmount);

        let vault_balance = ctx.accounts.escrow_vault.amount;
        require!(vault_balance >= amount, KaratError::InsufficientEscrow);

        let campaign_id = ctx.accounts.campaign_escrow.campaign_id.clone();
        let bump = ctx.accounts.campaign_escrow.bump;
        let seeds = &[
            b"campaign".as_ref(),
            campaign_id.as_bytes(),
            &[bump],
        ];
        let signer_seeds = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_vault.to_account_info(),
                    to: ctx.accounts.customer_token_account.to_account_info(),
                    authority: ctx.accounts.campaign_escrow.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
        )?;

        let escrow = &mut ctx.accounts.campaign_escrow;
        escrow.total_paid_out = escrow.total_paid_out.checked_add(amount)
            .ok_or(KaratError::Overflow)?;

        msg!("Payout {} PAXG from campaign {} to customer", amount, campaign_id);
        Ok(())
    }

    /// Refund remaining PAXG tokens from escrow back to the business.
    pub fn refund_balance(ctx: Context<RefundBalance>) -> Result<()> {
        let vault_balance = ctx.accounts.escrow_vault.amount;
        require!(vault_balance > 0, KaratError::NothingToRefund);

        let campaign_id = ctx.accounts.campaign_escrow.campaign_id.clone();
        let bump = ctx.accounts.campaign_escrow.bump;
        let seeds = &[
            b"campaign".as_ref(),
            campaign_id.as_bytes(),
            &[bump],
        ];
        let signer_seeds = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_vault.to_account_info(),
                    to: ctx.accounts.business_token_account.to_account_info(),
                    authority: ctx.accounts.campaign_escrow.to_account_info(),
                },
                signer_seeds,
            ),
            vault_balance,
        )?;

        msg!("Refunded {} PAXG to business", vault_balance);
        Ok(())
    }

    /// Close a campaign escrow. Refunds remaining PAXG and reclaims rent.
    pub fn close_campaign(ctx: Context<CloseCampaign>) -> Result<()> {
        let vault_balance = ctx.accounts.escrow_vault.amount;

        if vault_balance > 0 {
            let campaign_id = ctx.accounts.campaign_escrow.campaign_id.clone();
            let bump = ctx.accounts.campaign_escrow.bump;
            let seeds = &[
                b"campaign".as_ref(),
                campaign_id.as_bytes(),
                &[bump],
            ];
            let signer_seeds = &[&seeds[..]];

            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.escrow_vault.to_account_info(),
                        to: ctx.accounts.business_token_account.to_account_info(),
                        authority: ctx.accounts.campaign_escrow.to_account_info(),
                    },
                    signer_seeds,
                ),
                vault_balance,
            )?;
        }

        msg!("Campaign closed");
        Ok(())
    }
}

// ============================================================================
// Account Contexts
// ============================================================================

#[derive(Accounts)]
#[instruction(campaign_id: String)]
pub struct CreateCampaign<'info> {
    #[account(mut)]
    pub business: Signer<'info>,

    /// CHECK: Oracle pubkey stored for payout authorization
    pub oracle: UncheckedAccount<'info>,

    #[account(
        constraint = paxg_mint.key() == PAXG_MINT @ KaratError::InvalidMint
    )]
    pub paxg_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = business,
        space = 8 + CampaignEscrow::INIT_SPACE,
        seeds = [b"campaign", campaign_id.as_bytes()],
        bump,
    )]
    pub campaign_escrow: Account<'info, CampaignEscrow>,

    #[account(
        init,
        payer = business,
        associated_token::mint = paxg_mint,
        associated_token::authority = campaign_escrow,
    )]
    pub escrow_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FundCampaign<'info> {
    #[account(mut)]
    pub business: Signer<'info>,

    #[account(
        mut,
        has_one = business,
        constraint = campaign_escrow.is_active @ KaratError::CampaignNotActive,
    )]
    pub campaign_escrow: Account<'info, CampaignEscrow>,

    #[account(
        mut,
        associated_token::mint = paxg_mint,
        associated_token::authority = business,
    )]
    pub business_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = paxg_mint,
        associated_token::authority = campaign_escrow,
    )]
    pub escrow_vault: Account<'info, TokenAccount>,

    #[account(
        constraint = paxg_mint.key() == PAXG_MINT @ KaratError::InvalidMint
    )]
    pub paxg_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ApprovePayout<'info> {
    #[account(
        constraint = oracle.key() == campaign_escrow.oracle @ KaratError::UnauthorizedOracle,
    )]
    pub oracle: Signer<'info>,

    #[account(
        mut,
        constraint = campaign_escrow.is_active @ KaratError::CampaignNotActive,
    )]
    pub campaign_escrow: Account<'info, CampaignEscrow>,

    #[account(
        mut,
        associated_token::mint = paxg_mint,
        associated_token::authority = campaign_escrow,
    )]
    pub escrow_vault: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = paxg_mint,
        associated_token::authority = customer,
    )]
    pub customer_token_account: Account<'info, TokenAccount>,

    /// CHECK: Customer wallet receiving PAXG tokens
    pub customer: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        constraint = paxg_mint.key() == PAXG_MINT @ KaratError::InvalidMint
    )]
    pub paxg_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RefundBalance<'info> {
    #[account(mut)]
    pub business: Signer<'info>,

    #[account(
        mut,
        has_one = business,
    )]
    pub campaign_escrow: Account<'info, CampaignEscrow>,

    #[account(
        mut,
        associated_token::mint = paxg_mint,
        associated_token::authority = campaign_escrow,
    )]
    pub escrow_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = paxg_mint,
        associated_token::authority = business,
    )]
    pub business_token_account: Account<'info, TokenAccount>,

    #[account(
        constraint = paxg_mint.key() == PAXG_MINT @ KaratError::InvalidMint
    )]
    pub paxg_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CloseCampaign<'info> {
    #[account(mut)]
    pub business: Signer<'info>,

    #[account(
        mut,
        has_one = business,
        close = business,
    )]
    pub campaign_escrow: Account<'info, CampaignEscrow>,

    #[account(
        mut,
        associated_token::mint = paxg_mint,
        associated_token::authority = campaign_escrow,
    )]
    pub escrow_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = paxg_mint,
        associated_token::authority = business,
    )]
    pub business_token_account: Account<'info, TokenAccount>,

    #[account(
        constraint = paxg_mint.key() == PAXG_MINT @ KaratError::InvalidMint
    )]
    pub paxg_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

// ============================================================================
// State
// ============================================================================

#[account]
#[derive(InitSpace)]
pub struct CampaignEscrow {
    #[max_len(64)]
    pub campaign_id: String,
    pub business: Pubkey,
    pub oracle: Pubkey,
    pub mint: Pubkey,               // PAXG mint address
    pub total_funded: u64,          // PAXG lamports funded (8 decimals)
    pub total_paid_out: u64,        // PAXG lamports paid out
    pub reward_per_post: u64,       // PAXG lamports per approved post
    pub currency_mode: u8,          // 0 = gold-denominated, 1 = CAD-denominated
    pub original_cad_amount: u64,   // If CAD mode: original $ amount × 100 (cents)
    pub is_active: bool,
    pub bump: u8,
}

// ============================================================================
// Errors
// ============================================================================

#[error_code]
pub enum KaratError {
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Campaign is not active")]
    CampaignNotActive,
    #[msg("Insufficient PAXG tokens in escrow")]
    InsufficientEscrow,
    #[msg("Unauthorized oracle")]
    UnauthorizedOracle,
    #[msg("Campaign ID too long (max 64 chars)")]
    CampaignIdTooLong,
    #[msg("Nothing to refund")]
    NothingToRefund,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Invalid mint — only PAXG (Wormhole) is accepted")]
    InvalidMint,
    #[msg("Invalid currency mode (must be 0=gold or 1=cad)")]
    InvalidCurrencyMode,
}

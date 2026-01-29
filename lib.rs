use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo, Transfer};

declare_id!("LetsGoDue1111111111111111111111111111111111");

#[program]
pub mod letsgoduel {
    use super::*;

    /// Initialize a new duel with two token mints
    pub fn initialize_duel(
        ctx: Context<InitializeDuel>,
        token_a_name: String,
        token_a_symbol: String,
        token_b_name: String,
        token_b_symbol: String,
        founder_a: Pubkey,
        founder_b: Pubkey,
    ) -> Result<()> {
        let duel = &mut ctx.accounts.duel_account;
        
        duel.token_a_mint = ctx.accounts.token_a_mint.key();
        duel.token_b_mint = ctx.accounts.token_b_mint.key();
        duel.vault = ctx.accounts.vault.key();
        duel.founder_a = founder_a;
        duel.founder_b = founder_b;
        
        duel.token_a_sol_raised = 0;
        duel.token_b_sol_raised = 0;
        duel.token_a_supply = 0;
        duel.token_b_supply = 0;
        
        duel.winner = None;
        duel.is_active = true;
        duel.created_at = Clock::get()?.unix_timestamp;
        
        duel.target_sol = 85_000_000_000; // 85 SOL in lamports
        
        duel.token_a_name = token_a_name;
        duel.token_a_symbol = token_a_symbol;
        duel.token_b_name = token_b_name;
        duel.token_b_symbol = token_b_symbol;
        
        duel.bump = ctx.bumps.duel_account;
        
        msg!("Duel initialized: {} vs {}", duel.token_a_symbol, duel.token_b_symbol);
        
        Ok(())
    }

    /// Buy tokens from either side of the duel
    pub fn buy_tokens(
        ctx: Context<BuyTokens>,
        sol_amount: u64,
        token_side: TokenSide,
        min_tokens_out: u64,
    ) -> Result<()> {
        let duel = &mut ctx.accounts.duel_account;
        
        require!(duel.is_active, DuelError::DuelInactive);
        require!(duel.winner.is_none(), DuelError::DuelAlreadyWon);
        
        // Calculate tokens using bonding curve
        let tokens_out = calculate_buy_tokens(
            sol_amount,
            match token_side {
                TokenSide::TokenA => duel.token_a_sol_raised,
                TokenSide::TokenB => duel.token_b_sol_raised,
            },
        )?;
        
        require!(tokens_out >= min_tokens_out, DuelError::SlippageExceeded);
        
        // Transfer SOL to vault
        let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.buyer.key(),
            &ctx.accounts.vault.key(),
            sol_amount,
        );
        
        anchor_lang::solana_program::program::invoke(
            &transfer_ix,
            &[
                ctx.accounts.buyer.to_account_info(),
                ctx.accounts.vault.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
        
        // Mint tokens to buyer
        let mint_key = match token_side {
            TokenSide::TokenA => duel.token_a_mint,
            TokenSide::TokenB => duel.token_b_mint,
        };
        
        let seeds = &[
            b"duel",
            duel.token_a_mint.as_ref(),
            duel.token_b_mint.as_ref(),
            &[duel.bump],
        ];
        let signer = &[&seeds[..]];
        
        let cpi_accounts = MintTo {
            mint: match token_side {
                TokenSide::TokenA => ctx.accounts.token_a_mint.to_account_info(),
                TokenSide::TokenB => ctx.accounts.token_b_mint.to_account_info(),
            },
            to: ctx.accounts.buyer_token_account.to_account_info(),
            authority: ctx.accounts.duel_account.to_account_info(),
        };
        
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        
        token::mint_to(cpi_ctx, tokens_out)?;
        
        // Update duel state
        match token_side {
            TokenSide::TokenA => {
                duel.token_a_sol_raised += sol_amount;
                duel.token_a_supply += tokens_out;
                
                // Check win condition
                if duel.token_a_sol_raised >= duel.target_sol {
                    duel.winner = Some(TokenSide::TokenA);
                    duel.is_active = false;
                    duel.finished_at = Some(Clock::get()?.unix_timestamp);
                    msg!("🏆 Token A WINS! Migrating to Raydium...");
                }
            }
            TokenSide::TokenB => {
                duel.token_b_sol_raised += sol_amount;
                duel.token_b_supply += tokens_out;
                
                // Check win condition
                if duel.token_b_sol_raised >= duel.target_sol {
                    duel.winner = Some(TokenSide::TokenB);
                    duel.is_active = false;
                    duel.finished_at = Some(Clock::get()?.unix_timestamp);
                    msg!("🏆 Token B WINS! Migrating to Raydium...");
                }
            }
        }
        
        emit!(TradeEvent {
            duel: ctx.accounts.duel_account.key(),
            buyer: ctx.accounts.buyer.key(),
            token_side,
            sol_amount,
            tokens_amount: tokens_out,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    /// Sell tokens back to the bonding curve
    pub fn sell_tokens(
        ctx: Context<SellTokens>,
        token_amount: u64,
        token_side: TokenSide,
        min_sol_out: u64,
    ) -> Result<()> {
        let duel = &mut ctx.accounts.duel_account;
        
        require!(duel.is_active, DuelError::DuelInactive);
        require!(duel.winner.is_none(), DuelError::DuelAlreadyWon);
        
        // Calculate SOL out using bonding curve
        let sol_out = calculate_sell_sol(
            token_amount,
            match token_side {
                TokenSide::TokenA => duel.token_a_sol_raised,
                TokenSide::TokenB => duel.token_b_sol_raised,
            },
        )?;
        
        require!(sol_out >= min_sol_out, DuelError::SlippageExceeded);
        
        // Burn tokens from seller
        let cpi_accounts = token::Burn {
            mint: match token_side {
                TokenSide::TokenA => ctx.accounts.token_a_mint.to_account_info(),
                TokenSide::TokenB => ctx.accounts.token_b_mint.to_account_info(),
            },
            from: ctx.accounts.seller_token_account.to_account_info(),
            authority: ctx.accounts.seller.to_account_info(),
        };
        
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        
        token::burn(cpi_ctx, token_amount)?;
        
        // Transfer SOL from vault to seller
        let seeds = &[
            b"duel",
            duel.token_a_mint.as_ref(),
            duel.token_b_mint.as_ref(),
            &[duel.bump],
        ];
        let signer = &[&seeds[..]];
        
        **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= sol_out;
        **ctx.accounts.seller.to_account_info().try_borrow_mut_lamports()? += sol_out;
        
        // Update duel state
        match token_side {
            TokenSide::TokenA => {
                duel.token_a_sol_raised -= sol_out;
                duel.token_a_supply -= token_amount;
            }
            TokenSide::TokenB => {
                duel.token_b_sol_raised -= sol_out;
                duel.token_b_supply -= token_amount;
            }
        }
        
        emit!(TradeEvent {
            duel: ctx.accounts.duel_account.key(),
            buyer: ctx.accounts.seller.key(),
            token_side,
            sol_amount: sol_out,
            tokens_amount: token_amount,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    /// Migrate winning token to Raydium (authority only)
    pub fn migrate_to_raydium(ctx: Context<MigrateToRaydium>) -> Result<()> {
        let duel = &ctx.accounts.duel_account;
        
        require!(!duel.is_active, DuelError::DuelStillActive);
        require!(duel.winner.is_some(), DuelError::NoWinner);
        
        // Transfer all SOL from vault to Raydium pool initializer
        let vault_balance = ctx.accounts.vault.to_account_info().lamports();
        
        **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= vault_balance;
        **ctx.accounts.raydium_initializer.to_account_info().try_borrow_mut_lamports()? += vault_balance;
        
        msg!("Migrated {} SOL to Raydium for {:?}", vault_balance, duel.winner);
        
        Ok(())
    }
}

// Bonding curve implementation (constant product)
fn calculate_buy_tokens(sol_amount: u64, current_sol_raised: u64) -> Result<u64> {
    // Simplified bonding curve: tokens = sqrt(sol_amount) * 1_000_000
    // In production, use a more sophisticated curve
    let tokens = ((sol_amount as f64).sqrt() * 1_000_000.0) as u64;
    Ok(tokens)
}

fn calculate_sell_sol(token_amount: u64, current_sol_raised: u64) -> Result<u64> {
    // Inverse of buy function with 1% fee
    let sol = ((token_amount as f64 / 1_000_000.0).powi(2) * 0.99) as u64;
    Ok(sol)
}

#[derive(Accounts)]
pub struct InitializeDuel<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + DuelAccount::INIT_SPACE,
        seeds = [b"duel", token_a_mint.key().as_ref(), token_b_mint.key().as_ref()],
        bump
    )]
    pub duel_account: Account<'info, DuelAccount>,
    
    #[account(
        init,
        payer = authority,
        mint::decimals = 9,
        mint::authority = duel_account,
    )]
    pub token_a_mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = authority,
        mint::decimals = 9,
        mint::authority = duel_account,
    )]
    pub token_b_mint: Account<'info, Mint>,
    
    /// CHECK: Vault PDA
    #[account(
        mut,
        seeds = [b"vault", duel_account.key().as_ref()],
        bump
    )]
    pub vault: AccountInfo<'info>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct BuyTokens<'info> {
    #[account(
        mut,
        seeds = [b"duel", duel_account.token_a_mint.as_ref(), duel_account.token_b_mint.as_ref()],
        bump = duel_account.bump
    )]
    pub duel_account: Account<'info, DuelAccount>,
    
    #[account(mut)]
    pub token_a_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub token_b_mint: Account<'info, Mint>,
    
    /// CHECK: Vault PDA
    #[account(
        mut,
        seeds = [b"vault", duel_account.key().as_ref()],
        bump
    )]
    pub vault: AccountInfo<'info>,
    
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    #[account(mut)]
    pub buyer_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SellTokens<'info> {
    #[account(
        mut,
        seeds = [b"duel", duel_account.token_a_mint.as_ref(), duel_account.token_b_mint.as_ref()],
        bump = duel_account.bump
    )]
    pub duel_account: Account<'info, DuelAccount>,
    
    #[account(mut)]
    pub token_a_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub token_b_mint: Account<'info, Mint>,
    
    /// CHECK: Vault PDA
    #[account(
        mut,
        seeds = [b"vault", duel_account.key().as_ref()],
        bump
    )]
    pub vault: AccountInfo<'info>,
    
    #[account(mut)]
    pub seller: Signer<'info>,
    
    #[account(mut)]
    pub seller_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct MigrateToRaydium<'info> {
    #[account(
        seeds = [b"duel", duel_account.token_a_mint.as_ref(), duel_account.token_b_mint.as_ref()],
        bump = duel_account.bump
    )]
    pub duel_account: Account<'info, DuelAccount>,
    
    /// CHECK: Vault PDA
    #[account(
        mut,
        seeds = [b"vault", duel_account.key().as_ref()],
        bump
    )]
    pub vault: AccountInfo<'info>,
    
    /// CHECK: Raydium pool initializer
    #[account(mut)]
    pub raydium_initializer: AccountInfo<'info>,
    
    pub authority: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct DuelAccount {
    pub token_a_mint: Pubkey,
    pub token_b_mint: Pubkey,
    pub vault: Pubkey,
    pub founder_a: Pubkey,
    pub founder_b: Pubkey,
    
    pub token_a_sol_raised: u64,
    pub token_b_sol_raised: u64,
    pub token_a_supply: u64,
    pub token_b_supply: u64,
    
    pub winner: Option<TokenSide>,
    pub is_active: bool,
    pub created_at: i64,
    pub finished_at: Option<i64>,
    
    pub target_sol: u64,
    
    #[max_len(32)]
    pub token_a_name: String,
    #[max_len(10)]
    pub token_a_symbol: String,
    #[max_len(32)]
    pub token_b_name: String,
    #[max_len(10)]
    pub token_b_symbol: String,
    
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum TokenSide {
    TokenA,
    TokenB,
}

#[event]
pub struct TradeEvent {
    pub duel: Pubkey,
    pub buyer: Pubkey,
    pub token_side: TokenSide,
    pub sol_amount: u64,
    pub tokens_amount: u64,
    pub timestamp: i64,
}

#[error_code]
pub enum DuelError {
    #[msg("Duel is not active")]
    DuelInactive,
    #[msg("Duel has already been won")]
    DuelAlreadyWon,
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    #[msg("Duel is still active")]
    DuelStillActive,
    #[msg("No winner determined")]
    NoWinner,
}
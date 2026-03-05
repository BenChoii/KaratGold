import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { KaratEscrow } from "../target/types/karat_escrow";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getAccount,
} from "@solana/spl-token";
import { assert, expect } from "chai";

describe("karat-escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.karatEscrow as Program<KaratEscrow>;
  const admin = provider.wallet as anchor.Wallet;

  // Test keypairs
  const karatMintKeypair = Keypair.generate();
  const businessKeypair = Keypair.generate();
  const customerKeypair = Keypair.generate();
  const oracleKeypair = Keypair.generate();

  const CAMPAIGN_ID = "test-campaign-001";
  const KARAT_DECIMALS = 6;
  const MINT_AMOUNT = 1_000_000_000; // 1000 KARAT (6 decimals)
  const FUND_AMOUNT = 500_000_000;   // 500 KARAT
  const PAYOUT_AMOUNT = 10_000_000;  // 10 KARAT

  // PDAs
  let mintAuthority: PublicKey;
  let mintAuthorityBump: number;
  let campaignEscrow: PublicKey;
  let campaignEscrowBump: number;

  before(async () => {
    // Derive PDAs
    [mintAuthority, mintAuthorityBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint-authority")],
      program.programId
    );

    [campaignEscrow, campaignEscrowBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("campaign"), Buffer.from(CAMPAIGN_ID)],
      program.programId
    );

    // Fund test wallets
    const airdropBusiness = await provider.connection.requestAirdrop(
      businessKeypair.publicKey,
      5 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropBusiness);

    const airdropCustomer = await provider.connection.requestAirdrop(
      customerKeypair.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropCustomer);

    const airdropOracle = await provider.connection.requestAirdrop(
      oracleKeypair.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropOracle);
  });

  it("1. Creates KARAT mint with 6 decimals", async () => {
    const tx = await program.methods
      .initializeMint(KARAT_DECIMALS)
      .accounts({
        admin: admin.publicKey,
        karatMint: karatMintKeypair.publicKey,
        mintAuthority: mintAuthority,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([karatMintKeypair])
      .rpc();

    console.log("  ✅ Mint created:", karatMintKeypair.publicKey.toBase58());
    console.log("  ✅ Mint authority PDA:", mintAuthority.toBase58());

    // Verify mint
    const mintInfo = await provider.connection.getParsedAccountInfo(
      karatMintKeypair.publicKey
    );
    const mintData = (mintInfo.value?.data as any)?.parsed?.info;
    assert.equal(mintData?.decimals, KARAT_DECIMALS);
    assert.equal(mintData?.mintAuthority, mintAuthority.toBase58());
  });

  it("2. Mints 1000 KARAT to business wallet", async () => {
    const businessATA = await getAssociatedTokenAddress(
      karatMintKeypair.publicKey,
      businessKeypair.publicKey
    );

    const tx = await program.methods
      .mintTokens(new anchor.BN(MINT_AMOUNT))
      .accounts({
        admin: admin.publicKey,
        karatMint: karatMintKeypair.publicKey,
        mintAuthority: mintAuthority,
        recipientTokenAccount: businessATA,
        recipient: businessKeypair.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const tokenAccount = await getAccount(provider.connection, businessATA);
    console.log("  ✅ Business balance:", Number(tokenAccount.amount) / 1e6, "KARAT");
    assert.equal(Number(tokenAccount.amount), MINT_AMOUNT);
  });

  it("3. Creates campaign escrow", async () => {
    const escrowVault = await getAssociatedTokenAddress(
      karatMintKeypair.publicKey,
      campaignEscrow,
      true // allowOwnerOffCurve for PDA
    );

    const tx = await program.methods
      .createCampaign(CAMPAIGN_ID)
      .accounts({
        business: businessKeypair.publicKey,
        oracle: oracleKeypair.publicKey,
        karatMint: karatMintKeypair.publicKey,
        campaignEscrow: campaignEscrow,
        escrowVault: escrowVault,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([businessKeypair])
      .rpc();

    const escrowAccount = await program.account.campaignEscrow.fetch(campaignEscrow);
    console.log("  ✅ Campaign escrow PDA:", campaignEscrow.toBase58());
    assert.equal(escrowAccount.campaignId, CAMPAIGN_ID);
    assert.equal(escrowAccount.business.toBase58(), businessKeypair.publicKey.toBase58());
    assert.equal(escrowAccount.oracle.toBase58(), oracleKeypair.publicKey.toBase58());
    assert.equal(escrowAccount.isActive, true);
    assert.equal(escrowAccount.totalFunded.toNumber(), 0);
    assert.equal(escrowAccount.totalPaidOut.toNumber(), 0);
  });

  it("4. Funds 500 KARAT into campaign escrow", async () => {
    const businessATA = await getAssociatedTokenAddress(
      karatMintKeypair.publicKey,
      businessKeypair.publicKey
    );
    const escrowVault = await getAssociatedTokenAddress(
      karatMintKeypair.publicKey,
      campaignEscrow,
      true
    );

    const tx = await program.methods
      .fundCampaign(new anchor.BN(FUND_AMOUNT))
      .accounts({
        business: businessKeypair.publicKey,
        campaignEscrow: campaignEscrow,
        businessTokenAccount: businessATA,
        escrowVault: escrowVault,
        karatMint: karatMintKeypair.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([businessKeypair])
      .rpc();

    // Verify vault balance
    const vaultAccount = await getAccount(provider.connection, escrowVault);
    console.log("  ✅ Escrow vault balance:", Number(vaultAccount.amount) / 1e6, "KARAT");
    assert.equal(Number(vaultAccount.amount), FUND_AMOUNT);

    // Verify business balance
    const businessAccount = await getAccount(provider.connection, businessATA);
    assert.equal(Number(businessAccount.amount), MINT_AMOUNT - FUND_AMOUNT);

    // Verify escrow state
    const escrowAccount = await program.account.campaignEscrow.fetch(campaignEscrow);
    assert.equal(escrowAccount.totalFunded.toNumber(), FUND_AMOUNT);
  });

  it("5. Oracle approves payout of 10 KARAT to customer", async () => {
    const escrowVault = await getAssociatedTokenAddress(
      karatMintKeypair.publicKey,
      campaignEscrow,
      true
    );
    const customerATA = await getAssociatedTokenAddress(
      karatMintKeypair.publicKey,
      customerKeypair.publicKey
    );

    const tx = await program.methods
      .approvePayout(new anchor.BN(PAYOUT_AMOUNT))
      .accounts({
        oracle: oracleKeypair.publicKey,
        campaignEscrow: campaignEscrow,
        escrowVault: escrowVault,
        customerTokenAccount: customerATA,
        customer: customerKeypair.publicKey,
        payer: oracleKeypair.publicKey,
        karatMint: karatMintKeypair.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([oracleKeypair])
      .rpc();

    // Verify customer received tokens
    const customerAccount = await getAccount(provider.connection, customerATA);
    console.log("  ✅ Customer balance:", Number(customerAccount.amount) / 1e6, "KARAT");
    assert.equal(Number(customerAccount.amount), PAYOUT_AMOUNT);

    // Verify escrow vault decreased
    const vaultAccount = await getAccount(provider.connection, escrowVault);
    assert.equal(Number(vaultAccount.amount), FUND_AMOUNT - PAYOUT_AMOUNT);

    // Verify escrow state
    const escrowAccount = await program.account.campaignEscrow.fetch(campaignEscrow);
    assert.equal(escrowAccount.totalPaidOut.toNumber(), PAYOUT_AMOUNT);
  });

  it("6. Business refunds remaining KARAT from escrow", async () => {
    const businessATA = await getAssociatedTokenAddress(
      karatMintKeypair.publicKey,
      businessKeypair.publicKey
    );
    const escrowVault = await getAssociatedTokenAddress(
      karatMintKeypair.publicKey,
      campaignEscrow,
      true
    );

    const vaultBefore = await getAccount(provider.connection, escrowVault);
    const refundAmount = Number(vaultBefore.amount);

    const tx = await program.methods
      .refundBalance()
      .accounts({
        business: businessKeypair.publicKey,
        campaignEscrow: campaignEscrow,
        escrowVault: escrowVault,
        businessTokenAccount: businessATA,
        karatMint: karatMintKeypair.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([businessKeypair])
      .rpc();

    // Verify vault is empty
    const vaultAfter = await getAccount(provider.connection, escrowVault);
    console.log("  ✅ Refunded", refundAmount / 1e6, "KARAT to business");
    assert.equal(Number(vaultAfter.amount), 0);

    // Verify business got tokens back
    const businessAccount = await getAccount(provider.connection, businessATA);
    assert.equal(
      Number(businessAccount.amount),
      MINT_AMOUNT - FUND_AMOUNT + refundAmount
    );
  });

  it("7. Closes campaign escrow and reclaims rent", async () => {
    const businessATA = await getAssociatedTokenAddress(
      karatMintKeypair.publicKey,
      businessKeypair.publicKey
    );
    const escrowVault = await getAssociatedTokenAddress(
      karatMintKeypair.publicKey,
      campaignEscrow,
      true
    );

    const businessBalanceBefore = await provider.connection.getBalance(
      businessKeypair.publicKey
    );

    const tx = await program.methods
      .closeCampaign()
      .accounts({
        business: businessKeypair.publicKey,
        campaignEscrow: campaignEscrow,
        escrowVault: escrowVault,
        businessTokenAccount: businessATA,
        karatMint: karatMintKeypair.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([businessKeypair])
      .rpc();

    // Verify escrow account is closed
    const escrowInfo = await provider.connection.getAccountInfo(campaignEscrow);
    assert.isNull(escrowInfo, "Escrow account should be closed");

    const businessBalanceAfter = await provider.connection.getBalance(
      businessKeypair.publicKey
    );
    console.log(
      "  ✅ Campaign closed, reclaimed",
      (businessBalanceAfter - businessBalanceBefore) / anchor.web3.LAMPORTS_PER_SOL,
      "SOL in rent"
    );
  });
});

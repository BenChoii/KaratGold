import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Keypair, Connection, PublicKey, clusterApiUrl, VersionedTransaction } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, transfer } from "@solana/spl-token";
import bs58 from "bs58";
// Uses Solana Devnet for now - can switch to mainnet-beta via env vars later
// @ts-ignore
const RPC_URL = process.env.SOLANA_RPC_URL || clusterApiUrl("devnet");

// Helper to extract Keypair from environment variable for the global Master Wallet
function getMasterKeypair(): Keypair {
    const keyString = process.env.MASTER_WALLET_PRIVATE_KEY;
    if (!keyString) {
        throw new Error("Missing MASTER_WALLET_PRIVATE_KEY in Convex Dashboard.");
    }
    try {
        // Handle array representation if configured that way
        if (keyString.startsWith("[")) {
            return Keypair.fromSecretKey(new Uint8Array(JSON.parse(keyString)));
        }
        // Handle base58 representation (Phantom export format)
        return Keypair.fromSecretKey(bs58.decode(keyString));
    } catch (err: any) {
        throw new Error("Failed to decode Master Wallet key: " + err.message);
    }
}

// Helper to execute a Jupiter swap
async function executeJupiterSwap(
    inputMint: string,
    outputMint: string,
    amountLamports: number,
    walletPublicKey: string,
    slippageBps: number = 50 // 0.5% default slippage
) {
    // 1. Get Quote
    const quoteResponse = await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountLamports}&slippageBps=${slippageBps}`
    );
    const quoteData = await quoteResponse.json();

    if (!quoteData || quoteData.error) {
        throw new Error(`Jupiter Quote Error: ${quoteData?.error || "Unknown error"}`);
    }

    // 2. Build Swap Transaction
    // Needs the user's base58 public key to build the instructions
    const swapResponse = await fetch("https://quote-api.jup.ag/v6/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            quoteResponse: quoteData,
            userPublicKey: walletPublicKey,
            wrapAndUnwrapSol: true,
        }),
    });
    const swapData = await swapResponse.json();

    if (!swapData || swapData.error) {
        throw new Error(`Jupiter Swap Error: ${swapData?.error || "Unknown error"}`);
    }

    // swapData.swapTransaction contains a base64 encoded transaction that needs to be 
    // signed and sent by the backend.
    return {
        quoteData,
        swapTransactionBase64: swapData.swapTransaction,
    };
}

// Helper to sign and send a Jupiter VersionedTransaction
async function sendJupiterTransaction(
    connection: Connection,
    swapTransactionBase64: string,
    signerKeypair: Keypair
) {
    // Deserialize the transaction
    // @ts-ignore
    const swapTransactionBuf = Buffer.from(swapTransactionBase64, 'base64');
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

    // Sign the transaction
    transaction.sign([signerKeypair]);

    // Execute the transaction
    const rawTransaction = transaction.serialize();
    const txid = await connection.sendRawTransaction(rawTransaction, {
        skipPreflight: true,
        maxRetries: 2
    });

    const latestBlockHash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: txid
    });

    return txid;
}

// Token Mints (Mainnet values - devnet values would be different if testing swaps)
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const PAXG_MINT = "2E2rEnEa5Wc28YQtzUuS3xHqf39hG9t9fKq98EaL8TfF"; // Wormhole PAXG on Solana usually

export const getQuoteUsdcToPaxg = action({
    args: { amountUsdc: v.number() },
    handler: async (_ctx, args) => {
        // Amount is in 6 decimals for USDC
        const amountAtomic = Math.floor(args.amountUsdc * 1_000_000);
        const quoteResponse = await fetch(
            `https://quote-api.jup.ag/v6/quote?inputMint=${USDC_MINT}&outputMint=${PAXG_MINT}&amount=${amountAtomic}&slippageBps=50`
        );
        return await quoteResponse.json();
    }
});

export const swapUsdcToPaxg = internalAction({
    args: {
        amountUsdc: v.number(),
    },
    handler: async (_ctx, args) => {
        const masterKeypair = getMasterKeypair();
        const amountAtomic = Math.floor(args.amountUsdc * 1_000_000); // 6 decimals

        try {
            // This returns the base64 transaction. The backend then signs it and sends it via RPC.
            const swapData = await executeJupiterSwap(
                USDC_MINT,
                PAXG_MINT,
                amountAtomic,
                masterKeypair.publicKey.toBase58()
            );

            // Send and confirm on-chain
            const connection = new Connection(RPC_URL);
            const txid = await sendJupiterTransaction(
                connection,
                swapData.swapTransactionBase64,
                masterKeypair
            );

            return { success: true, txid, quote: swapData.quoteData };
        } catch (error: any) {
            console.error("Jupiter Swap Error (USDC -> PAXG):", error);
            // In a production environment, if this fails after fiat collection, 
            // you must queue up a retry mechanism or flag it for manual intervention.
            return { success: false, error: error.message };
        }
    }
});

export const swapPaxgToUsdc = internalAction({
    args: {
        userId: v.id("users"),
        paxgAmountAtomic: v.number(),
        destinationCoinbaseAddress: v.string(), // The ultimate destination
    },
    handler: async (_ctx, args) => {
        const masterKeypair = getMasterKeypair();
        const connection = new Connection(RPC_URL, 'confirmed');

        try {
            // 1. Swap PAXG to USDC on the Master Wallet
            const swapData = await executeJupiterSwap(
                PAXG_MINT,
                USDC_MINT,
                args.paxgAmountAtomic,
                masterKeypair.publicKey.toBase58()
            );

            // 2. Send and confirm Swap on-chain
            const swapTxid = await sendJupiterTransaction(
                connection,
                swapData.swapTransactionBase64,
                masterKeypair
            );

            console.log(`Successfully swapped PAXG to USDC on Master Wallet. TXID: ${swapTxid}`);

            // 3. Extract exactly how much USDC we received from the quote so we can send it
            const executionOutAmount = parseInt(swapData.quoteData.outAmount, 10);

            // 4. Send the resulting USDC to the user's destination (Coinbase) address via SPL Transfer
            const destinationPubkey = new PublicKey(args.destinationCoinbaseAddress);
            const usdcMintPubkey = new PublicKey(USDC_MINT);

            const sourceATA = await getOrCreateAssociatedTokenAccount(
                connection,
                masterKeypair,
                usdcMintPubkey,
                masterKeypair.publicKey
            );

            const destATA = await getOrCreateAssociatedTokenAccount(
                connection,
                masterKeypair,
                usdcMintPubkey,
                destinationPubkey
            );

            const transferTxid = await transfer(
                connection,
                masterKeypair, // fee payer
                sourceATA.address, // source ATA
                destATA.address, // dest ATA
                masterKeypair.publicKey, // owner authority
                executionOutAmount // amount in atomic units (6 decimals)
            );

            console.log(`Successfully transferred ${executionOutAmount / 1_000_000} USDC to user. TXID: ${transferTxid}`);

            return { success: true, swapTxid, transferTxid };
        } catch (error: any) {
            console.error("Jupiter Swap & Transfer Error (PAXG -> USDC):", error);
            // In a production environment, if this fails during cashout, you likely need to 
            // refund the user's Convex goldBalance and mark the transaction as failed.
            return { success: false, error: error.message };
        }
    }
});

export const getBalance = action({
    args: { address: v.string() },
    handler: async (_ctx, args) => {
        const connection = new Connection(RPC_URL);
        const pubKey = new PublicKey(args.address);
        const balance = await connection.getBalance(pubKey);
        return balance / 1e9; // Convert lamports to SOL
    }
});

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Keypair, Connection, PublicKey, clusterApiUrl, VersionedTransaction } from "@solana/web3.js";


// Uses Solana Devnet for now - can switch to mainnet-beta via env vars later
// @ts-ignore
const RPC_URL = process.env.SOLANA_RPC_URL || clusterApiUrl("devnet");

export const generateWallet = internalAction({
    args: {},
    handler: async () => {
        // Generate a fresh random Keypair
        const keypair = Keypair.generate();

        // The private key is a Uint8Array. We encode it as comma-separated string for local storage.
        // In a production system, you would want to encrypt this with a KMS or Master Key before storing.
        const privateKeyString = keypair.secretKey.toString();
        const publicKeyString = keypair.publicKey.toBase58();

        return {
            publicKey: publicKeyString,
            privateKey: privateKeyString
        };
    }
});

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
        userId: v.id("users"),
        amountUsdc: v.number(),
    },
    handler: async (ctx, args) => {
        const keyDoc = await ctx.runQuery(internal.users.getWalletKeys, { userId: args.userId });
        if (!keyDoc) throw new Error("Wallet keys not found");

        const amountAtomic = Math.floor(args.amountUsdc * 1_000_000); // 6 decimals

        try {
            // This returns the base64 transaction. The backend then signs it and sends it via RPC.
            const swapData = await executeJupiterSwap(
                USDC_MINT,
                PAXG_MINT,
                amountAtomic,
                keyDoc.publicKey
            );

            // 3. Decode the private key and build the Keypair object
            const secretKey = new Uint8Array(
                keyDoc.encryptedPrivateKey.split("").map((c: string) => c.charCodeAt(0))
            );
            const signerKeypair = Keypair.fromSecretKey(secretKey);

            // 4. Send and confirm on-chain
            const connection = new Connection(RPC_URL);
            const txid = await sendJupiterTransaction(
                connection,
                swapData.swapTransactionBase64,
                signerKeypair
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
    handler: async (ctx, args) => {
        const keyDoc = await ctx.runQuery(internal.users.getWalletKeys, { userId: args.userId });
        if (!keyDoc) throw new Error("Wallet keys not found");

        try {
            // 1. Swap PAXG back to USDC
            const swapData = await executeJupiterSwap(
                PAXG_MINT,
                USDC_MINT,
                args.paxgAmountAtomic,
                keyDoc.publicKey
            );

            // 2. Decode the private key
            const secretKey = new Uint8Array(
                keyDoc.encryptedPrivateKey.split("").map((c: string) => c.charCodeAt(0))
            );
            const signerKeypair = Keypair.fromSecretKey(secretKey);

            // 3. Send and confirm on-chain
            const connection = new Connection(RPC_URL);
            const txid = await sendJupiterTransaction(
                connection,
                swapData.swapTransactionBase64,
                signerKeypair
            );

            // 4. Send the resulting USDC to the user's destination (Coinbase) address
            console.log(`Successfully swapped PAXG to USDC on-chain. TXID: ${txid}`);
            // TODO: ADD SPL TRANSFER TO args.destinationCoinbaseAddress HERE

            return { success: true, txid };
        } catch (error: any) {
            console.error("Jupiter Swap Error (PAXG -> USDC):", error);
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

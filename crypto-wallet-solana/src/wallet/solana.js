import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
} from '@solana/web3.js';

export const NETWORKS = {
  devnet: { label: 'Devnet', url: clusterApiUrl('devnet') },
  'mainnet-beta': { label: 'Mainnet', url: clusterApiUrl('mainnet-beta') },
};
export const DEFAULT_NETWORK = 'devnet';
export const FALLBACK_FEE_LAMPORTS = 5000n;

const connections = {};
export function getConnection(network) {
  if (!NETWORKS[network]) throw new Error(`Unknown network: ${network}`);
  if (!connections[network]) {
    connections[network] = new Connection(NETWORKS[network].url, 'confirmed');
  }
  return connections[network];
}

export function explorerTxUrl(signature, network) {
  const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
  return `https://explorer.solana.com/tx/${signature}${cluster}`;
}

export function explorerAddressUrl(address, network) {
  const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
  return `https://explorer.solana.com/address/${address}${cluster}`;
}

// Returns a PublicKey or throws with a user-facing message.
export function parseAddress(input) {
  const text = String(input ?? '').trim();
  if (!text) throw new Error('Enter a recipient address.');
  let key;
  try {
    key = new PublicKey(text);
  } catch {
    throw new Error('That is not a valid Solana address.');
  }
  if (key.toBase58() !== text) {
    throw new Error('That is not a valid Solana address.');
  }
  return key;
}

export async function getBalance(connection, publicKey) {
  return BigInt(await connection.getBalance(publicKey, 'confirmed'));
}

function buildTransfer(from, to, lamports, blockhash) {
  const tx = new Transaction({ feePayer: from, recentBlockhash: blockhash });
  tx.add(SystemProgram.transfer({ fromPubkey: from, toPubkey: to, lamports }));
  return tx;
}

// Everything the confirmation screen needs, computed before signing.
export async function prepareTransfer(connection, from, to, lamports) {
  const [{ blockhash }, balance, recipientInfo, rentMin] = await Promise.all([
    connection.getLatestBlockhash('confirmed'),
    getBalance(connection, from),
    connection.getAccountInfo(to, 'confirmed'),
    connection.getMinimumBalanceForRentExemption(0),
  ]);

  const tx = buildTransfer(from, to, lamports, blockhash);
  let fee = FALLBACK_FEE_LAMPORTS;
  try {
    const result = await connection.getFeeForMessage(tx.compileMessage(), 'confirmed');
    if (result && result.value != null) fee = BigInt(result.value);
  } catch {
    // keep fallback
  }

  const rent = BigInt(rentMin);
  const remaining = balance - lamports - fee;
  const warnings = [];

  if (remaining < 0n) {
    throw new Error('Insufficient balance to cover the amount plus the network fee.');
  }
  // The runtime rejects leaving an account with a non-zero balance below rent exemption.
  if (remaining > 0n && remaining < rent) {
    throw new Error(
      'This would leave your account below the rent-exempt minimum. Send a little less, or use Max to empty it.'
    );
  }
  // A new (empty) recipient account must receive at least the rent-exempt minimum.
  if (!recipientInfo && lamports < rent) {
    throw new Error(
      `The recipient account does not exist yet, so it must receive at least ${(Number(rent) / 1e9).toString()} SOL.`
    );
  }
  if (to.equals(from)) warnings.push('You are sending to your own address.');
  if (!PublicKey.isOnCurve(to.toBytes())) {
    warnings.push('The recipient is a program-derived address, not a regular wallet. Make sure that is intended.');
  }
  if (recipientInfo && recipientInfo.executable) {
    throw new Error('The recipient is a program account and cannot hold SOL transfers.');
  }

  return { fee, balance, remaining, recipientExists: !!recipientInfo, warnings };
}

// Largest amount that can be sent while paying the fee (empties the account).
export async function maxSendable(connection, from, to) {
  const [{ blockhash }, balance] = await Promise.all([
    connection.getLatestBlockhash('confirmed'),
    getBalance(connection, from),
  ]);
  let fee = FALLBACK_FEE_LAMPORTS;
  try {
    const tx = buildTransfer(from, to ?? from, 1n, blockhash);
    const result = await connection.getFeeForMessage(tx.compileMessage(), 'confirmed');
    if (result && result.value != null) fee = BigInt(result.value);
  } catch {
    // keep fallback
  }
  const max = balance - fee;
  return max > 0n ? max : 0n;
}

export async function sendSol(connection, keypair, to, lamports) {
  const latest = await connection.getLatestBlockhash('confirmed');
  const tx = buildTransfer(keypair.publicKey, to, lamports, latest.blockhash);
  tx.sign(keypair);
  const signature = await connection.sendRawTransaction(tx.serialize(), {
    preflightCommitment: 'confirmed',
  });
  let confirmation;
  try {
    confirmation = await connection.confirmTransaction(
      {
        signature,
        blockhash: latest.blockhash,
        lastValidBlockHeight: latest.lastValidBlockHeight,
      },
      'confirmed'
    );
  } catch (error) {
    // It was broadcast; the user needs the signature to check the explorer.
    error.signature = signature;
    throw error;
  }
  if (confirmation.value.err) {
    const error = new Error('The transaction failed on-chain.');
    error.signature = signature;
    throw error;
  }
  return signature;
}

export async function requestAirdrop(connection, publicKey, lamports = 1000000000) {
  const latest = await connection.getLatestBlockhash('confirmed');
  const signature = await connection.requestAirdrop(publicKey, lamports);
  await connection.confirmTransaction(
    { signature, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight },
    'confirmed'
  );
  return signature;
}

// Recent activity with the SOL delta for this wallet.
export async function getRecentActivity(connection, publicKey, limit = 10) {
  const signatures = await connection.getSignaturesForAddress(publicKey, { limit }, 'confirmed');
  if (signatures.length === 0) return [];

  let parsed = [];
  try {
    parsed = await connection.getParsedTransactions(
      signatures.map((s) => s.signature),
      { maxSupportedTransactionVersion: 0, commitment: 'confirmed' }
    );
  } catch {
    // Public RPCs sometimes rate-limit batch requests; show the list without amounts.
  }

  const owner = publicKey.toBase58();
  return signatures.map((s, i) => {
    const tx = parsed[i];
    let delta = null;
    if (tx && tx.meta) {
      const index = tx.transaction.message.accountKeys.findIndex(
        (k) => (k.pubkey ? k.pubkey.toBase58() : String(k)) === owner
      );
      if (index >= 0) {
        delta = BigInt(tx.meta.postBalances[index]) - BigInt(tx.meta.preBalances[index]);
      }
    }
    return {
      signature: s.signature,
      blockTime: s.blockTime,
      failed: !!s.err,
      delta,
    };
  });
}

// Turns RPC errors into something a person can act on.
export function friendlyError(error) {
  const message = String(error?.message || error);
  if (/429|Too Many Requests|airdrop limit|rate limit/i.test(message)) {
    return 'The public faucet is rate-limited right now. Try again later, or use faucet.solana.com.';
  }
  if (/Network request failed|fetch failed|ENOTFOUND|timeout/i.test(message)) {
    return 'Could not reach the Solana network. Check your connection and try again.';
  }
  if (/insufficient (funds|lamports)/i.test(message)) {
    return 'Insufficient balance for this transaction.';
  }
  if (/block height exceeded|expired/i.test(message)) {
    return 'The transaction expired before confirming. Check the explorer before retrying.';
  }
  return message;
}

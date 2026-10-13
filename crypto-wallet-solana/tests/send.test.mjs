import assert from 'node:assert/strict';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import * as S from '../src/wallet/solana.js';

const RENT = 890880;
function mockConn({ balance, recipientExists = true, executable = false, fee = 5000 }) {
  const sent = [];
  return {
    sent,
    getLatestBlockhash: async () => ({ blockhash: Keypair.generate().publicKey.toBase58(), lastValidBlockHeight: 100 }),
    getBalance: async () => balance,
    getAccountInfo: async () => (recipientExists ? { executable, lamports: 1 } : null),
    getMinimumBalanceForRentExemption: async () => RENT,
    getFeeForMessage: async () => ({ value: fee }),
    sendRawTransaction: async (raw) => { sent.push(Transaction.from(raw)); return 'SIG123'; },
    confirmTransaction: async () => ({ value: { err: null } }),
  };
}
const me = Keypair.generate();
const other = Keypair.generate().publicKey;

// happy path
let r = await S.prepareTransfer(mockConn({ balance: 2e9 }), me.publicKey, other, 1000000000n);
assert.equal(r.fee, 5000n); assert.equal(r.remaining, 2000000000n - 1000000000n - 5000n); assert.deepEqual(r.warnings, []);
// insufficient
await assert.rejects(S.prepareTransfer(mockConn({ balance: 1e9 }), me.publicKey, other, 1000000000n), /Insufficient/);
// leaves dust below rent
await assert.rejects(S.prepareTransfer(mockConn({ balance: 1e9 }), me.publicKey, other, 1000000000n - 5000n - 100n), /rent-exempt/);
// exact empty is ok
r = await S.prepareTransfer(mockConn({ balance: 1e9 }), me.publicKey, other, 1000000000n - 5000n);
assert.equal(r.remaining, 0n);
// new recipient below rent
await assert.rejects(S.prepareTransfer(mockConn({ balance: 2e9, recipientExists: false }), me.publicKey, other, 1000n), /does not exist/);
r = await S.prepareTransfer(mockConn({ balance: 2e9, recipientExists: false }), me.publicKey, other, 1000000n);
assert.equal(r.recipientExists, false);
// program account
await assert.rejects(S.prepareTransfer(mockConn({ balance: 2e9, executable: true }), me.publicKey, other, 1000000n), /program account/);
// self + PDA warnings
r = await S.prepareTransfer(mockConn({ balance: 2e9 }), me.publicKey, me.publicKey, 1000000n);
assert.ok(r.warnings.some((w) => /own address/.test(w)));
const [pda] = PublicKey.findProgramAddressSync([Buffer.from('x')], new PublicKey('11111111111111111111111111111111'));
r = await S.prepareTransfer(mockConn({ balance: 2e9 }), me.publicKey, pda, 1000000n);
assert.ok(r.warnings.some((w) => /program-derived/.test(w)));
// max
assert.equal(await S.maxSendable(mockConn({ balance: 1e9 }), me.publicKey, other), 1000000000n - 5000n);
assert.equal(await S.maxSendable(mockConn({ balance: 1000 }), me.publicKey, null), 0n);
// send builds a correct signed transfer
const c = mockConn({ balance: 2e9 });
assert.equal(await S.sendSol(c, me, other, 123n), 'SIG123');
const tx = c.sent[0];
assert.ok(tx.verifySignatures());
assert.equal(tx.instructions[0].programId.toBase58(), '11111111111111111111111111111111');
assert.equal(tx.instructions[0].keys[1].pubkey.toBase58(), other.toBase58());
assert.equal(tx.instructions[0].data.readBigUInt64LE(4), 123n);
// failed confirmation keeps signature
const bad = { ...mockConn({ balance: 2e9 }), confirmTransaction: async () => { throw new Error('block height exceeded'); } };
await assert.rejects(S.sendSol(bad, me, other, 1n), (e) => e.signature === 'SIG123');
// addresses
assert.throws(() => S.parseAddress(''), /recipient/);
assert.throws(() => S.parseAddress('abc'), /valid/);
assert.throws(() => S.parseAddress(other.toBase58() + 'x'), /valid/);
assert.equal(S.parseAddress('  ' + other.toBase58() + ' ').toBase58(), other.toBase58());
// explorer + errors
assert.equal(S.explorerTxUrl('S', 'devnet'), 'https://explorer.solana.com/tx/S?cluster=devnet');
assert.equal(S.explorerTxUrl('S', 'mainnet-beta'), 'https://explorer.solana.com/tx/S');
assert.match(S.friendlyError(new Error('429 Too Many Requests')), /rate-limited/);
console.log('SEND CHECKS PASSED');

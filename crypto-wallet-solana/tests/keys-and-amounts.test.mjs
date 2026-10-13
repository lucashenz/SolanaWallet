import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { Keypair } from '@solana/web3.js';
import { binary_to_base58 } from 'base58-js';
import * as K from '../src/wallet/keys.js';
import * as A from '../src/wallet/amount.js';
const req = createRequire(import.meta.url);
const hd = req('ed25519-hd-key');
const bip39 = req('bip39');

// 1) Derivation matches an independent implementation on many random phrases
for (let i = 0; i < 25; i++) {
  const m = K.newMnemonic();
  assert.equal(m.split(' ').length, 12);
  assert.ok(K.isValidMnemonic(m));
  const ours = await K.keypairFromMnemonic(m);
  const seed = bip39.mnemonicToSeedSync(m);
  const ref = Keypair.fromSeed(hd.derivePath("m/44'/501'/0'/0'", seed.toString('hex')).key);
  assert.equal(ours.publicKey.toBase58(), ref.publicKey.toBase58());
}
// 24 words, messy spacing and case
const m24 = bip39.generateMnemonic(256);
const messy = '  ' + m24.toUpperCase().split(' ').join('   ') + ' \n';
const ref24 = Keypair.fromSeed(hd.derivePath("m/44'/501'/0'/0'", bip39.mnemonicToSeedSync(m24).toString('hex')).key);
assert.equal((await K.keypairFromMnemonic(messy)).publicKey.toBase58(), ref24.publicKey.toBase58());
assert.equal(K.isValidMnemonic('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon'), false);

// 2) Secret key import: base58 and JSON round-trip, bad input rejected
const kp = Keypair.generate();
assert.equal(K.keypairFromSecret(binary_to_base58(kp.secretKey)).publicKey.toBase58(), kp.publicKey.toBase58());
assert.equal(K.keypairFromSecret(JSON.stringify(Array.from(kp.secretKey))).publicKey.toBase58(), kp.publicKey.toBase58());
assert.throws(() => K.keypairFromSecret('0OIl'), /base58/);
assert.throws(() => K.keypairFromSecret(binary_to_base58(kp.secretKey.slice(0, 32))), /64 bytes/);
const tampered = Uint8Array.from(kp.secretKey); tampered[40] ^= 1;
assert.throws(() => K.keypairFromSecret(binary_to_base58(tampered)));
assert.equal(K.detectImportType(m24), 'mnemonic');
assert.equal(K.detectImportType(binary_to_base58(kp.secretKey)), 'secretKey');
assert.equal(K.detectImportType('one two three'), null);

// 3) Amount parsing is exact
assert.equal(A.parseSolToLamports('0.1'), 100000000n);
assert.equal(A.parseSolToLamports('0,3'), 300000000n);
assert.equal(A.parseSolToLamports('1.000000001'), 1000000001n);
assert.equal(A.parseSolToLamports('.5'), 500000000n);
assert.equal(A.parseSolToLamports('12'), 12000000000n);
for (const bad of ['', '0', '0.0', 'abc', '1.0000000001', '-1', '.', '1e3', '1.2.3']) {
  assert.throws(() => A.parseSolToLamports(bad), undefined, bad);
}
assert.equal(A.formatLamports(1500000000n), '1.5');
assert.equal(A.formatLamports(0n), '0');
assert.equal(A.formatLamports(5000n), '<0.0001');
assert.equal(A.formatLamports(-5000n), '-<0.0001');
assert.equal(A.lamportsToSolString(1000000001n), '1.000000001');
assert.equal(A.parseSolToLamports(A.lamportsToSolString(123456789n)), 123456789n);
console.log('ALL CHECKS PASSED');

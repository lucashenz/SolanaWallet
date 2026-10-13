// Key generation, import and derivation. Pure JS, no React Native APIs,
// so it can be unit-tested in Node.
import { Keypair } from '@solana/web3.js';
import { generateMnemonic, mnemonicToSeed, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { hmac } from '@noble/hashes/hmac';
import { sha512 } from '@noble/hashes/sha512';
import { utf8ToBytes } from '@noble/hashes/utils';
import { base58_to_binary } from 'base58-js';

// Same path Phantom and Solflare use, so the phrase can be imported there.
export const DERIVATION_PATH = "m/44'/501'/0'/0'";

const HARDENED = 0x80000000;

// SLIP-0010 ed25519 derivation (hardened children only).
export function deriveEd25519Seed(seed, path = DERIVATION_PATH) {
  let I = hmac(sha512, utf8ToBytes('ed25519 seed'), seed);
  let key = I.slice(0, 32);
  let chain = I.slice(32);

  const segments = path.split('/').slice(1);
  for (const segment of segments) {
    if (!segment.endsWith("'")) {
      throw new Error('ed25519 only supports hardened derivation');
    }
    const index = (parseInt(segment.slice(0, -1), 10) + HARDENED) >>> 0;
    const data = new Uint8Array(1 + 32 + 4);
    data[0] = 0;
    data.set(key, 1);
    new DataView(data.buffer).setUint32(33, index, false);
    I = hmac(sha512, chain, data);
    key = I.slice(0, 32);
    chain = I.slice(32);
  }
  return key;
}

export function normalizeMnemonic(input) {
  return input.trim().toLowerCase().split(/\s+/).join(' ');
}

export function newMnemonic() {
  return generateMnemonic(wordlist, 128); // 12 words
}

export function isValidMnemonic(phrase) {
  return validateMnemonic(normalizeMnemonic(phrase), wordlist);
}

export async function keypairFromMnemonic(phrase) {
  const seed = await mnemonicToSeed(normalizeMnemonic(phrase));
  return Keypair.fromSeed(deriveEd25519Seed(seed));
}

// Accepts a base58 secret key (Phantom "export private key")
// or a JSON byte array (solana-keygen file contents).
export function keypairFromSecret(input) {
  const text = input.trim();
  let bytes;
  if (text.startsWith('[')) {
    let arr;
    try {
      arr = JSON.parse(text);
    } catch {
      throw new Error('Invalid JSON key file.');
    }
    if (!Array.isArray(arr) || arr.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
      throw new Error('Invalid JSON key file.');
    }
    bytes = Uint8Array.from(arr);
  } else {
    try {
      bytes = base58_to_binary(text);
    } catch {
      throw new Error('Private key is not valid base58.');
    }
  }
  if (bytes.length !== 64) {
    throw new Error('Private key must be 64 bytes.');
  }
  // fromSecretKey validates that the public half matches the private half.
  return Keypair.fromSecretKey(bytes);
}

// Figures out what the user pasted on the import screen.
export function detectImportType(input) {
  const text = input.trim();
  if (!text) return null;
  const words = text.split(/\s+/);
  if (words.length === 12 || words.length === 24) return 'mnemonic';
  if (words.length === 1) return 'secretKey';
  return null;
}

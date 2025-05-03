import 'react-native-get-random-values';
import { Buffer } from 'buffer';
global.Buffer = Buffer;
import { base58_to_binary, binary_to_base58 } from 'base58-js';
import { Keypair, Connection, clusterApiUrl, LAMPORTS_PER_SOL, Transaction, SystemProgram, sendAndConfirmTransaction, PublicKey } from '@solana/web3.js';

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");


let myWallet = null;


export function createWallet() {
  const kp = Keypair.generate();
  const publicKeyDecoded = binary_to_base58(kp.publicKey.toBytes());
  const secretKeyDecoded = binary_to_base58(kp.secretKey);
  return { publicKeyDecoded, secretKeyDecoded };
}

export function recoverWallet(secretKey) {
  const binarySecretKey = base58_to_binary(secretKey);
  myWallet = Keypair.fromSecretKey(binarySecretKey); 
  myWallet.publicKeyDecoded = myWallet.publicKey.toBase58();
  myWallet.secretKeyDecoded = secretKey;
  return myWallet;
}

export async function getBalance() {
  if (!myWallet) throw new Error("Carteira não encontrada");

  const balance = await connection.getBalance(myWallet.publicKey);
  return {
      lamports: balance,
      sol: balance / LAMPORTS_PER_SOL
  }
}

export async function transfer(to, amountInSol) {
  const transaction = new Transaction();

  const sendSolInstruction = SystemProgram.transfer({
    fromPubkey: new PublicKey(myWallet.publicKey),
    toPubkey: new PublicKey(to),
    lamports: Math.floor(parseFloat(amountInSol) * LAMPORTS_PER_SOL),
  });

  transaction.add(sendSolInstruction);

  const tx = await sendAndConfirmTransaction(connection, transaction, [myWallet]);
  return tx;

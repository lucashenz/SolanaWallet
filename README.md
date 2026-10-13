# SolanaWallet

A minimal, open-source, self-custodial Solana wallet for Android, built with React Native (Expo SDK 53) and `@solana/web3.js`.

Create or import a wallet, check your SOL balance, send and receive SOL, and see your recent activity. Keys are generated on the device and stored only in the Android Keystore.

> **Status:** works on Devnet by default. Mainnet can be enabled in-app, but the code has **not** been audited. Use small amounts only.

## Features

- **Create a wallet** with a 12-word BIP39 recovery phrase. The user must write it down and confirm two random words before the wallet is saved.
- **Import a wallet** from a 12/24-word phrase, a base58 private key (Phantom "export private key"), or a `solana-keygen` JSON key array.
- **Compatible with Phantom and Solflare**: uses the same derivation path, `m/44'/501'/0'/0'`, so the same phrase opens the same account in all three.
- **Send SOL** with a review screen that shows recipient, amount, network fee, total, and balance afterwards before anything is signed.
- **Receive** with a QR code (`solana:` URI), copy and share.
- **Recent activity** with received/sent amounts, linking to Solana Explorer.
- **Devnet airdrop** button for testing.
- **Network switch** between Devnet and Mainnet, with a warning before switching to Mainnet.

## Security model

| Concern | How it is handled |
|---|---|
| Key storage | `expo-secure-store` with `WHEN_UNLOCKED_THIS_DEVICE_ONLY` (Android Keystore / iOS Keychain). Never in AsyncStorage, never logged. |
| App backups | `android:allowBackup` disabled, so the encrypted key is not copied to cloud backups. |
| Screenshots | Screen capture is blocked on the recovery-phrase and import screens. |
| Randomness | `crypto.getRandomValues` via `react-native-get-random-values` (OS CSPRNG). |
| Amounts | SOL is parsed to lamports with integer (BigInt) math, never floats. |
| Bad transfers | Before signing, the app rejects invalid addresses, insufficient balance (amount + fee), transfers that would leave the account below the rent-exempt minimum, sends below rent-exempt to brand-new accounts, and sends to executable program accounts. It warns on self-sends and off-curve (PDA) recipients. |
| Confirmation | Uses blockhash-based confirmation (`lastValidBlockHeight`). If confirmation times out, the user still gets the signature to check on the explorer instead of retrying blindly. |

There is **no on-chain program**. The wallet only uses the native System Program for transfers.

## Run it

```bash
cd crypto-wallet-solana
npm install
npx expo start          # scan the QR with a development build or Expo Go
```

Run the tests (key derivation is checked against the independent `ed25519-hd-key` + `bip39` libraries, plus amount parsing and every send-validation rule against a mocked RPC):

```bash
npm test
```

## Build the APK

```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview   # produces an installable .apk
```

## Project structure

```
crypto-wallet-solana/
├── App.js                 # screen routing, wallet lifecycle
├── index.js               # entry point, loads polyfills first
├── src/
│   ├── polyfills.js       # secure RNG + Buffer
│   ├── wallet/
│   │   ├── keys.js        # BIP39 + SLIP-0010 derivation, key import
│   │   ├── storage.js     # Secure Store persistence
│   │   ├── amount.js      # exact SOL <-> lamports
│   │   └── solana.js      # RPC, fee estimate, transfer checks, send, history
│   ├── screens/           # Welcome, Backup, Import, Home, Send, Receive
│   └── ui/                # theme + shared components
└── tests/                 # npm test
```

## Roadmap to mainnet

- Biometric unlock before signing
- Mobile Wallet Adapter so other dApps can request signatures
- Seed Vault integration on Solana Seeker
- SPL token balances and transfers
- Dedicated RPC provider (the public endpoints are rate-limited)
- Independent security review

## License

MIT

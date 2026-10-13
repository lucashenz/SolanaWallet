// SOL <-> lamports without floating point. 0.1 + 0.2 style errors
// are not acceptable when moving money.
export const LAMPORTS_PER_SOL = 1000000000n;
const SOL_DECIMALS = 9;

// Returns lamports as BigInt, or throws with a user-facing message.
export function parseSolToLamports(input) {
  const text = String(input ?? '').trim().replace(',', '.');
  if (!text) throw new Error('Enter an amount.');
  if (!/^\d*\.?\d*$/.test(text) || text === '.') {
    throw new Error('Amount must be a number.');
  }
  const [whole = '', fraction = ''] = text.split('.');
  if (fraction.length > SOL_DECIMALS) {
    throw new Error('SOL supports at most 9 decimal places.');
  }
  const lamports =
    BigInt(whole || '0') * LAMPORTS_PER_SOL +
    BigInt((fraction + '0'.repeat(SOL_DECIMALS)).slice(0, SOL_DECIMALS) || '0');
  if (lamports <= 0n) throw new Error('Amount must be greater than zero.');
  return lamports;
}

export function formatLamports(lamports, maxDecimals = 4) {
  const value = BigInt(lamports);
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const whole = abs / LAMPORTS_PER_SOL;
  let fraction = (abs % LAMPORTS_PER_SOL).toString().padStart(SOL_DECIMALS, '0');
  fraction = fraction.slice(0, maxDecimals).replace(/0+$/, '');
  // Don't render a tiny non-zero balance as "0".
  if (!fraction && whole === 0n && abs > 0n) {
    return `${negative ? '-' : ''}<0.${'0'.repeat(maxDecimals - 1)}1`;
  }
  return `${negative ? '-' : ''}${whole.toString()}${fraction ? '.' + fraction : ''}`;
}

// Exact representation, for the "Max" button and confirmations.
export function lamportsToSolString(lamports) {
  return formatLamports(lamports, SOL_DECIMALS);
}

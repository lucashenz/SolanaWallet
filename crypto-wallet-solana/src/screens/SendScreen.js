import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Field, Notice, Title, shortAddress } from '../ui/components';
import { colors, space } from '../ui/theme';
import { formatLamports, lamportsToSolString, parseSolToLamports } from '../wallet/amount';
import {
  NETWORKS,
  explorerTxUrl,
  friendlyError,
  getConnection,
  maxSendable,
  parseAddress,
  prepareTransfer,
  sendSol,
} from '../wallet/solana';

export default function SendScreen({ keypair, network, onBack, onSent }) {
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState('form'); // form | review | sending | done
  const [review, setReview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const connection = getConnection(network);
  const isMainnet = network === 'mainnet-beta';

  async function useMax() {
    setBusy(true);
    try {
      let recipient = null;
      try {
        recipient = parseAddress(to);
      } catch {
        // fee estimate does not depend on the recipient
      }
      const max = await maxSendable(connection, keypair.publicKey, recipient);
      setAmount(lamportsToSolString(max));
      setErrors({});
    } catch (e) {
      setErrors({ form: friendlyError(e) });
    } finally {
      setBusy(false);
    }
  }

  async function goToReview() {
    const next = {};
    let recipient;
    let lamports;
    try {
      recipient = parseAddress(to);
    } catch (e) {
      next.to = e.message;
    }
    try {
      lamports = parseSolToLamports(amount);
    } catch (e) {
      next.amount = e.message;
    }
    setErrors(next);
    if (next.to || next.amount) return;

    setBusy(true);
    try {
      const info = await prepareTransfer(connection, keypair.publicKey, recipient, lamports);
      setReview({ recipient, lamports, ...info });
      setStep('review');
    } catch (e) {
      setErrors({ form: friendlyError(e) });
    } finally {
      setBusy(false);
    }
  }

  async function confirmSend() {
    setStep('sending');
    try {
      const signature = await sendSol(connection, keypair, review.recipient, review.lamports);
      setResult({ ok: true, signature });
      onSent?.();
    } catch (e) {
      setResult({ ok: false, signature: e.signature, message: friendlyError(e) });
      onSent?.();
    }
    setStep('done');
  }

  if (step === 'done' && result) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Title sub={result.ok ? `${lamportsToSolString(review.lamports)} SOL sent.` : result.message}>
          {result.ok ? 'Sent' : 'Transaction not confirmed'}
        </Title>
        {result.signature ? (
          <Button
            title="View on Solana Explorer"
            variant="secondary"
            onPress={() => Linking.openURL(explorerTxUrl(result.signature, network))}
          />
        ) : null}
        <Button title="Back to wallet" onPress={onBack} />
      </ScrollView>
    );
  }

  if ((step === 'review' || step === 'sending') && review) {
    const total = review.lamports + review.fee;
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Title sub="Check every detail. Transactions on Solana cannot be reversed.">Review</Title>
        <Card>
          <Row label="To" value={shortAddress(review.recipient.toBase58(), 8)} />
          <Row label="Amount" value={`${lamportsToSolString(review.lamports)} SOL`} />
          <Row label="Network fee" value={`${lamportsToSolString(review.fee)} SOL`} />
          <Row label="Total" value={`${lamportsToSolString(total)} SOL`} strong />
          <Row label="Balance after" value={`${formatLamports(review.remaining)} SOL`} />
          <Row label="Network" value={NETWORKS[network].label} />
        </Card>
        {!review.recipientExists ? (
          <Notice tone="info">The recipient address has never been used. Double-check it.</Notice>
        ) : null}
        {review.warnings.map((w) => (
          <Notice key={w}>{w}</Notice>
        ))}
        {isMainnet ? <Notice tone="danger">You are on Mainnet. This sends real SOL.</Notice> : null}
        <Button title="Confirm and send" onPress={confirmSend} loading={step === 'sending'} />
        <Button title="Edit" variant="ghost" onPress={() => setStep('form')} disabled={step === 'sending'} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Title sub={`Sending on ${NETWORKS[network].label}.`}>Send SOL</Title>
      <Field
        label="Recipient address"
        placeholder="Solana address"
        value={to}
        onChangeText={(t) => {
          setTo(t);
          setErrors({});
        }}
        error={errors.to}
      />
      <View>
        <Field
          label="Amount (SOL)"
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={(t) => {
            setAmount(t.replace(',', '.'));
            setErrors({});
          }}
          error={errors.amount}
        />
        <Pressable onPress={useMax} style={styles.max} disabled={busy} accessibilityRole="button">
          <Text style={styles.maxText}>MAX</Text>
        </Pressable>
      </View>
      {errors.form ? <Notice tone="danger">{errors.form}</Notice> : null}
      <Button title="Review" onPress={goToReview} loading={busy} disabled={!to.trim() || !amount.trim()} />
      <Button title="Cancel" variant="ghost" onPress={onBack} />
    </ScrollView>
  );
}

function Row({ label, value, strong }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, strong && { fontWeight: '800' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: space(6), flexGrow: 1 },
  max: { position: 'absolute', right: space(3), top: 34, padding: space(2) },
  maxText: { color: colors.primary, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space(2) },
  rowLabel: { color: colors.muted, fontSize: 14 },
  rowValue: { color: colors.text, fontSize: 14, fontWeight: '600', flexShrink: 1, textAlign: 'right', marginLeft: space(3) },
});

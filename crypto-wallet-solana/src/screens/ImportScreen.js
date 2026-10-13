import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { Button, Field, Notice, Title } from '../ui/components';
import {
  detectImportType,
  isValidMnemonic,
  keypairFromMnemonic,
  keypairFromSecret,
  normalizeMnemonic,
} from '../wallet/keys';
import { space } from '../ui/theme';

export default function ImportScreen({ onImported, onCancel }) {
  usePreventScreenCapture();
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError('');
    const type = detectImportType(input);
    if (!type) {
      setError('Paste a 12 or 24-word recovery phrase, or a private key.');
      return;
    }
    setBusy(true);
    try {
      if (type === 'mnemonic') {
        if (!isValidMnemonic(input)) throw new Error('That recovery phrase is not valid. Check each word.');
        const value = normalizeMnemonic(input);
        const keypair = await keypairFromMnemonic(value);
        await onImported({ type: 'mnemonic', value }, keypair);
      } else {
        const keypair = keypairFromSecret(input);
        await onImported({ type: 'secretKey', value: input.trim() }, keypair);
      }
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Title sub="Recovery phrases from Phantom and Solflare work here, and so do exported private keys.">
        Import a wallet
      </Title>
      <Field
        label="Recovery phrase or private key"
        placeholder="word1 word2 word3 …"
        value={input}
        onChangeText={(t) => {
          setInput(t);
          setError('');
        }}
        multiline
        secureTextEntry={false}
        importantForAutofill="no"
        error={error}
      />
      <Notice tone="info">Your secret is encrypted with the device keystore and never leaves this phone.</Notice>
      <Button title="Import" onPress={submit} loading={busy} disabled={!input.trim()} />
      <Button title="Cancel" variant="ghost" onPress={onCancel} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space(6), flexGrow: 1 },
});

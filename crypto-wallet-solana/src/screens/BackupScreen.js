import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { Button, Field, Notice, Title } from '../ui/components';
import { colors, radius, space } from '../ui/theme';

function pickTwoPositions(count) {
  const values = new Uint32Array(2);
  crypto.getRandomValues(values);
  const a = values[0] % count;
  let b = values[1] % (count - 1);
  if (b >= a) b += 1;
  return [a, b].sort((x, y) => x - y);
}

// mode 'create': show phrase, then quiz two words before saving.
// mode 'reveal': show an existing phrase (from Settings), no quiz.
export default function BackupScreen({ mnemonic, mode = 'create', onDone, onCancel }) {
  usePreventScreenCapture();
  const words = useMemo(() => mnemonic.split(' '), [mnemonic]);
  const [step, setStep] = useState('show');
  const [positions] = useState(() => pickTwoPositions(words.length));
  const [answers, setAnswers] = useState(['', '']);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function verify() {
    const ok = positions.every((p, i) => answers[i].trim().toLowerCase() === words[p]);
    if (!ok) {
      setError('Those words do not match. Check your written copy.');
      return;
    }
    setSaving(true);
    try {
      await onDone();
    } finally {
      setSaving(false);
    }
  }

  if (step === 'verify') {
    return (
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Title sub="Confirm you wrote the phrase down correctly.">Verify your phrase</Title>
        {positions.map((p, i) => (
          <Field
            key={p}
            label={`Word #${p + 1}`}
            value={answers[i]}
            onChangeText={(t) => {
              const next = [...answers];
              next[i] = t;
              setAnswers(next);
              setError('');
            }}
          />
        ))}
        {error ? <Notice tone="danger">{error}</Notice> : null}
        <Button title="Confirm and finish" onPress={verify} loading={saving} />
        <Button title="Show the phrase again" variant="ghost" onPress={() => setStep('show')} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Title sub="These 12 words are the only way to recover your wallet. Write them down on paper, in order.">
        {mode === 'create' ? 'Your recovery phrase' : 'Recovery phrase'}
      </Title>
      <Notice tone="danger">
        Anyone with this phrase can take your funds. Never share it, never type it into a website, and never
        store it in a screenshot or cloud note.
      </Notice>
      <View style={styles.grid}>
        {words.map((w, i) => (
          <View key={i} style={styles.word}>
            <Text style={styles.index}>{i + 1}</Text>
            <Text style={styles.wordText} selectable={false}>
              {w}
            </Text>
          </View>
        ))}
      </View>
      {mode === 'create' ? (
        <>
          <Button title="I wrote it down" onPress={() => setStep('verify')} />
          <Button title="Cancel" variant="ghost" onPress={onCancel} />
        </>
      ) : (
        <Button title="Done" onPress={onCancel} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space(6), flexGrow: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: space(6) },
  word: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: space(3),
    paddingHorizontal: space(3),
    marginBottom: space(2),
  },
  index: { color: colors.muted, width: 24, fontSize: 13 },
  wordText: { color: colors.text, fontSize: 16, fontWeight: '600' },
});

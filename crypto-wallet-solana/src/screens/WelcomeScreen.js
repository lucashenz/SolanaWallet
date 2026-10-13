import { Image, StyleSheet, Text, View } from 'react-native';
import { Button } from '../ui/components';
import { colors, space } from '../ui/theme';

export default function WelcomeScreen({ onCreate, onImport }) {
  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Image source={require('../../assets/icon.png')} style={styles.logo} />
        <Text style={styles.title}>SolanaWallet</Text>
        <Text style={styles.sub}>
          A simple, self-custodial Solana wallet. Your keys are generated and stored only on this device.
        </Text>
      </View>
      <View>
        <Button title="Create a new wallet" onPress={onCreate} />
        <Button title="I already have a wallet" variant="secondary" onPress={onImport} />
        <Text style={styles.footer}>Open source · github.com/lucashenz/SolanaWallet</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', padding: space(6) },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 112, height: 112, borderRadius: 28, marginBottom: space(6) },
  title: { color: colors.text, fontSize: 32, fontWeight: '800', marginBottom: space(3) },
  sub: { color: colors.muted, fontSize: 16, textAlign: 'center', lineHeight: 24, maxWidth: 320 },
  footer: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: space(2) },
});

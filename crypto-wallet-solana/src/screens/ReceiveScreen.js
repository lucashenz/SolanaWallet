import { useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { Button, Notice, Title } from '../ui/components';
import { colors, radius, space } from '../ui/theme';
import { NETWORKS } from '../wallet/solana';

export default function ReceiveScreen({ address, network, onBack }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await Clipboard.setStringAsync(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Title sub={`Share this address to receive SOL on ${NETWORKS[network].label}.`}>Receive</Title>
      <View style={styles.qr}>
        <QRCode value={`solana:${address}`} size={220} backgroundColor="#FFFFFF" color="#0B0B14" />
      </View>
      <Text style={styles.address} selectable>
        {address}
      </Text>
      {network === 'devnet' ? (
        <Notice>This wallet is on Devnet. Do not send real (mainnet) SOL expecting it to appear here.</Notice>
      ) : null}
      <Button title={copied ? 'Copied' : 'Copy address'} onPress={copy} />
      <Button title="Share" variant="secondary" onPress={() => Share.share({ message: address })} />
      <Button title="Back" variant="ghost" onPress={onBack} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space(6), flexGrow: 1 },
  qr: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    padding: space(4),
    borderRadius: radius.lg,
    marginBottom: space(5),
  },
  address: {
    color: colors.text,
    fontSize: 15,
    textAlign: 'center',
    fontFamily: 'monospace',
    marginBottom: space(5),
    lineHeight: 22,
  },
});

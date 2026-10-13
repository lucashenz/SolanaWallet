import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Button, Card, Notice, shortAddress } from '../ui/components';
import { colors, radius, space } from '../ui/theme';
import { formatLamports } from '../wallet/amount';
import {
  NETWORKS,
  explorerAddressUrl,
  explorerTxUrl,
  friendlyError,
  getBalance,
  getConnection,
  getRecentActivity,
  requestAirdrop,
} from '../wallet/solana';

function timeAgo(blockTime) {
  if (!blockTime) return 'pending';
  const seconds = Math.max(0, Math.floor(Date.now() / 1000 - blockTime));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function HomeScreen({
  keypair,
  network,
  canRevealPhrase,
  refreshKey,
  onSend,
  onReceive,
  onSwitchNetwork,
  onRevealPhrase,
  onRemoveWallet,
}) {
  const address = keypair.publicKey.toBase58();
  const [balance, setBalance] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [airdropping, setAirdropping] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const connection = getConnection(network);
    try {
      const [bal, act] = await Promise.all([
        getBalance(connection, keypair.publicKey),
        getRecentActivity(connection, keypair.publicKey).catch(() => []),
      ]);
      setBalance(bal);
      setActivity(act);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, [keypair, network]);

  useEffect(() => {
    setBalance(null);
    setActivity([]);
    load();
  }, [load, refreshKey]);

  async function copyAddress() {
    await Clipboard.setStringAsync(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function airdrop() {
    setAirdropping(true);
    try {
      await requestAirdrop(getConnection(network), keypair.publicKey);
      await load();
    } catch (e) {
      Alert.alert('Airdrop failed', friendlyError(e));
    } finally {
      setAirdropping(false);
    }
  }

  function openSettings() {
    const options = [];
    if (canRevealPhrase) options.push({ text: 'Show recovery phrase', onPress: onRevealPhrase });
    options.push({ text: 'View on explorer', onPress: () => Linking.openURL(explorerAddressUrl(address, network)) });
    options.push({ text: 'Remove wallet from device', style: 'destructive', onPress: onRemoveWallet });
    options.push({ text: 'Close', style: 'cancel' });
    Alert.alert('Wallet', undefined, options);
  }

  const isDevnet = network === 'devnet';

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading && balance !== null} onRefresh={load} tintColor={colors.text} />}
    >
      <View style={styles.header}>
        <Pressable
          onPress={onSwitchNetwork}
          style={[styles.pill, { borderColor: isDevnet ? colors.warning : colors.accent }]}
          accessibilityRole="button"
          accessibilityLabel={`Network: ${NETWORKS[network].label}. Tap to switch.`}
        >
          <View style={[styles.dot, { backgroundColor: isDevnet ? colors.warning : colors.accent }]} />
          <Text style={styles.pillText}>{NETWORKS[network].label}</Text>
        </Pressable>
        <Pressable onPress={openSettings} hitSlop={12} accessibilityRole="button" accessibilityLabel="Wallet settings">
          <Text style={styles.settings}>•••</Text>
        </Pressable>
      </View>

      <Card style={styles.balanceCard}>
        <Pressable onPress={copyAddress} accessibilityRole="button" accessibilityLabel="Copy address">
          <Text style={styles.address}>{copied ? 'Address copied' : `${shortAddress(address, 6)}  ⧉`}</Text>
        </Pressable>
        <Text style={styles.balance} accessibilityLabel="Balance">
          {balance === null ? (loading ? '…' : '—') : formatLamports(balance)}
          <Text style={styles.unit}> SOL</Text>
        </Text>
        {isDevnet ? <Text style={styles.devnetNote}>Devnet SOL is test money with no value.</Text> : null}
      </Card>

      {error ? <Notice tone="danger">{error}</Notice> : null}

      <View style={styles.actions}>
        <Button title="Send" onPress={onSend} style={styles.action} disabled={!balance} />
        <Button title="Receive" variant="secondary" onPress={onReceive} style={styles.action} />
      </View>
      {isDevnet ? (
        <Button title="Get 1 devnet SOL (airdrop)" variant="secondary" onPress={airdrop} loading={airdropping} />
      ) : null}

      <Text style={styles.section}>Recent activity</Text>
      {activity.length === 0 ? (
        <Text style={styles.empty}>{loading ? 'Loading…' : 'No transactions yet.'}</Text>
      ) : (
        activity.map((item) => (
          <Pressable
            key={item.signature}
            style={styles.row}
            onPress={() => Linking.openURL(explorerTxUrl(item.signature, network))}
            accessibilityRole="link"
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>
                {item.failed ? 'Failed' : item.delta === null ? 'Transaction' : item.delta >= 0n ? 'Received' : 'Sent'}
              </Text>
              <Text style={styles.rowSub}>
                {shortAddress(item.signature, 6)} · {timeAgo(item.blockTime)}
              </Text>
            </View>
            {item.delta !== null && !item.failed ? (
              <Text style={[styles.rowAmount, { color: item.delta >= 0n ? colors.accent : colors.text }]}>
                {item.delta >= 0n ? '+' : ''}
                {formatLamports(item.delta)}
              </Text>
            ) : null}
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space(5), paddingBottom: space(10) },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space(4) },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: space(3),
    paddingVertical: space(2),
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: space(2) },
  pillText: { color: colors.text, fontWeight: '600' },
  settings: { color: colors.text, fontSize: 22, paddingHorizontal: space(2) },
  balanceCard: { alignItems: 'center', paddingVertical: space(8) },
  address: { color: colors.muted, fontSize: 14, marginBottom: space(3) },
  balance: { color: colors.text, fontSize: 44, fontWeight: '800' },
  unit: { fontSize: 20, color: colors.muted, fontWeight: '600' },
  devnetNote: { color: colors.warning, fontSize: 12, marginTop: space(3) },
  actions: { flexDirection: 'row', justifyContent: 'space-between' },
  action: { flex: 1, marginHorizontal: space(1) },
  section: { color: colors.muted, fontSize: 13, fontWeight: '600', marginTop: space(4), marginBottom: space(3), textTransform: 'uppercase' },
  empty: { color: colors.muted, fontSize: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space(4),
    marginBottom: space(2),
  },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  rowSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  rowAmount: { fontSize: 15, fontWeight: '700' },
});

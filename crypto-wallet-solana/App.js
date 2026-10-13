import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { colors } from './src/ui/theme';
import { keypairFromMnemonic, keypairFromSecret, newMnemonic } from './src/wallet/keys';
import { deleteSecret, loadNetwork, loadSecret, saveNetwork, saveSecret } from './src/wallet/storage';
import { DEFAULT_NETWORK, NETWORKS } from './src/wallet/solana';
import WelcomeScreen from './src/screens/WelcomeScreen';
import BackupScreen from './src/screens/BackupScreen';
import ImportScreen from './src/screens/ImportScreen';
import HomeScreen from './src/screens/HomeScreen';
import SendScreen from './src/screens/SendScreen';
import ReceiveScreen from './src/screens/ReceiveScreen';

async function keypairFor(secret) {
  return secret.type === 'mnemonic' ? keypairFromMnemonic(secret.value) : keypairFromSecret(secret.value);
}

export default function App() {
  const [screen, setScreen] = useState('loading');
  const [secret, setSecret] = useState(null);
  const [keypair, setKeypair] = useState(null);
  const [pendingMnemonic, setPendingMnemonic] = useState(null);
  const [network, setNetwork] = useState(DEFAULT_NETWORK);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [stored, storedNetwork] = await Promise.all([loadSecret(), loadNetwork()]);
        if (storedNetwork && NETWORKS[storedNetwork]) setNetwork(storedNetwork);
        if (stored) {
          setKeypair(await keypairFor(stored));
          setSecret(stored);
          setScreen('home');
          return;
        }
      } catch (e) {
        Alert.alert('Could not unlock wallet', 'The stored key could not be read on this device.');
      }
      setScreen('welcome');
    })();
  }, []);

  // Android hardware back: return to the wallet instead of closing the app.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'send' || screen === 'receive' || screen === 'reveal') {
        setScreen('home');
        return true;
      }
      if (screen === 'import' || screen === 'backup') {
        setPendingMnemonic(null);
        setScreen('welcome');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [screen]);

  const activate = useCallback(async (newSecret, newKeypair) => {
    await saveSecret(newSecret);
    setSecret(newSecret);
    setKeypair(newKeypair);
    setPendingMnemonic(null);
    setScreen('home');
  }, []);

  function startCreate() {
    setPendingMnemonic(newMnemonic());
    setScreen('backup');
  }

  async function finishCreate() {
    try {
      const value = pendingMnemonic;
      await activate({ type: 'mnemonic', value }, await keypairFromMnemonic(value));
    } catch (e) {
      Alert.alert('Could not save wallet', String(e?.message || e));
    }
  }

  function switchNetwork() {
    const target = network === 'devnet' ? 'mainnet-beta' : 'devnet';
    const apply = () => {
      setNetwork(target);
      saveNetwork(target).catch(() => {});
    };
    if (target === 'mainnet-beta') {
      Alert.alert(
        'Switch to Mainnet?',
        'On Mainnet you will be moving real SOL. This wallet has not been audited. Only use small amounts.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Switch', style: 'destructive', onPress: apply },
        ]
      );
    } else {
      apply();
    }
  }

  function removeWallet() {
    Alert.alert(
      'Remove wallet?',
      'This deletes the key from this device. Without your recovery phrase or private key, the funds are lost forever.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await deleteSecret();
            setSecret(null);
            setKeypair(null);
            setScreen('welcome');
          },
        },
      ]
    );
  }

  function revealPhrase() {
    Alert.alert('Show recovery phrase?', 'Make sure nobody can see your screen.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Show', onPress: () => setScreen('reveal') },
    ]);
  }

  let content;
  switch (screen) {
    case 'loading':
      content = (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      );
      break;
    case 'welcome':
      content = <WelcomeScreen onCreate={startCreate} onImport={() => setScreen('import')} />;
      break;
    case 'backup':
      content = (
        <BackupScreen
          mnemonic={pendingMnemonic}
          onDone={finishCreate}
          onCancel={() => {
            setPendingMnemonic(null);
            setScreen('welcome');
          }}
        />
      );
      break;
    case 'reveal':
      content = <BackupScreen mnemonic={secret.value} mode="reveal" onCancel={() => setScreen('home')} />;
      break;
    case 'import':
      content = <ImportScreen onImported={activate} onCancel={() => setScreen('welcome')} />;
      break;
    case 'send':
      content = (
        <SendScreen
          keypair={keypair}
          network={network}
          onBack={() => setScreen('home')}
          onSent={() => setRefreshKey((k) => k + 1)}
        />
      );
      break;
    case 'receive':
      content = (
        <ReceiveScreen address={keypair.publicKey.toBase58()} network={network} onBack={() => setScreen('home')} />
      );
      break;
    default:
      content = (
        <HomeScreen
          keypair={keypair}
          network={network}
          refreshKey={refreshKey}
          canRevealPhrase={secret?.type === 'mnemonic'}
          onSend={() => setScreen('send')}
          onReceive={() => setScreen('receive')}
          onSwitchNetwork={switchNetwork}
          onRevealPhrase={revealPhrase}
          onRemoveWallet={removeWallet}
        />
      );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root}>
        <StatusBar style="light" />
        <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {content}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

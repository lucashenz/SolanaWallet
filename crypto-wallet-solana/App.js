
global.Buffer = require("buffer").Buffer;
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, TouchableOpacity, View, Image, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { createWallet, recoverWallet, getBalance, transfer } from './WalletServices';
import 'react-native-get-random-values';
import { useState } from 'react';

export default function App() {

  const [wallet, setWallet] = useState({});
  const [privateKey, setPrivateKey] = useState("");
  const [balance, setBalance] = useState("0");
  const [modoTransferencia, setModoTransferencia] = useState(false);
  const [newTranfer, setNewTransfer] = useState({
    to: "",
    amount: "0.01",
  });



  async function refresBalance() {
    const balance = await getBalance();
    setBalance(`${balance.sol}`);
    console.log("Saldo: ", balance);
  }

  function btn_createClick() {
    const kp = createWallet();
    setWallet(kp);
    console.log("Chave privada", kp);
    console.log("Chave pública: ", kp.publicKeyDecoded);
  }

  function btn_recoverClick() {
    const kp = recoverWallet(privateKey);
    setWallet(kp);
    refresBalance();
  }

  function btn_refreshSaldoClick() {
    refresBalance();
  }

  function btnTransferClick() {
    transfer(newTranfer.to, newTranfer.value)
      .then((tx) => {
        Alert.alert("Transferência", `Transferência de ${newTranfer.value} SOL realizada com sucesso!`);
        refresBalance();
        setModoTransferencia(false);
        console.log(tx);
      })
      .catch((err) => {
        console.error("Erro na transferência:", err);
        Alert.alert("Erro na Transferência", err.message || String(err));
      });
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Image
          source={require('./assets/solana.webp')}
          style={styles.logo}
        />

        <Text style={styles.title}>CARTEIRA DE SOLANA</Text>

        <Text style={styles.negrito}>
          Código disponível no GitHub: @lucashenz
        </Text>

        {
          !wallet || !wallet.publicKeyDecoded ? (
            <>
            
              <Text style={styles.orText}>digite sua chave privada para entrar em uma carteira:</Text>

              <TextInput
                style={styles.input}
                placeholder="Digite sua chave privada"
                textAlign="center"
                placeholderTextColor="#aaa"
                value={privateKey}
                onChangeText={setPrivateKey}
              />

              <TouchableOpacity style={styles.button} onPress={btn_recoverClick}>
                <Text style={styles.buttonText}>Entrar na minha carteira</Text>
              </TouchableOpacity>




              <TouchableOpacity style={styles.button} onPress={btn_createClick}>
                <Text style={styles.buttonText}>Criar minha carteira</Text>
              </TouchableOpacity>

              <StatusBar style="auto" />
            </>
          ) 
          : (
            !modoTransferencia ? (
              <>
              
                  
                <Text style={styles.divisor}></Text>

                 
                <Text style={styles.negrito}>Sua chave pública:</Text>
                <Text style={styles.subtitle}>{wallet.publicKeyDecoded}</Text>
                <Text style={styles.negrito}>SEU SALDO:</Text>
                <Text style={styles.subtitle}>{balance} SOL</Text>
          
                <TouchableOpacity style={styles.button} onPress={() => setModoTransferencia(true)}>
                  <Text style={styles.buttonText}>TRANSFERIR</Text>
                </TouchableOpacity>
          
                <TouchableOpacity style={styles.button} onPress={btn_refreshSaldoClick}>
                  <Text style={styles.buttonText}>RECARREGAR SEU SALDO</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>

                <Text style={styles.divisor}></Text>
                
                <Text style={styles.negrito}>SOL:</Text>
                <Text style={styles.subtitle}>{balance} SOL</Text>
                <Text style={styles.negrito}>Transferir para:</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="ascii-capable"
                  value={newTranfer.to}
                  onChangeText={txt => setNewTransfer({ ...newTranfer, to: txt})}
                  placeholder='Endereço público da carteira'
                />
                <Text style={styles.negrito}>Valor a ser transferido:</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  value={newTranfer.value}
                  onChangeText={txt => {
                    const normalizedValue = txt.replace(",", ".");
                    setNewTransfer({ ...newTranfer, value: normalizedValue });
                  }}
                  placeholder= 'Quantia em SOL'
                />
          
                <TouchableOpacity style={styles.button} onPress={btnTransferClick}>
                  <Text style={styles.buttonText}>ENVIAR</Text>
                </TouchableOpacity>
          
                <TouchableOpacity style={styles.button} onPress={() => setModoTransferencia(false)}>
                  <Text style={styles.buttonText}>VOLTAR</Text>
                </TouchableOpacity>
              </>
            )
          )          
        }

      </ScrollView>
    </KeyboardAvoidingView>
  );

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: 25,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  title: {
    fontSize: 33,
    fontWeight: 'bold',
    color: '#4F46E5',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 15,
  },
  description: {
    fontSize: 15,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  button: {
    backgroundColor: '#6366F1',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 19,
    marginTop: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
    marginVertical: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  orText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    textAlign: 'center',
    marginTop: 30,
    marginBottom: 10,
  },
  input: {
    height: 45,
    width: '90%',
    borderColor: '#D1D5DB',
    borderWidth: 3,
    borderRadius: 5,
    paddingHorizontal: 12,
    fontSize: 20,
    backgroundColor: '#FFFFFF',
    color: '#111827',
    paddingVertical: 10,
  },
  negrito: {
    fontWeight: 'bold',
  },
  divisor: {
    height: 2,
    backgroundColor: 'gray',
    marginVertical: 30, 
    width: '100%',
  },
});


import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { db } from '../firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

const ADMIN_EMAILS = ['mossaab.jlt@gmail.com', 'rozomaki@gmail.com', 'jellitm210@gmail.com'];

export const SystemAdminTool: React.FC<{ onDone?: () => void }> = ({ onDone }) => {
  const [status, setStatus] = useState('IDLE');
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  const runReset = async () => {
    Alert.alert('Warning', 'This will delete app data except the whitelisted admins.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Continue',
        style: 'destructive',
        onPress: async () => {
          setStatus('RUNNING');
          addLog('Starting full database reset...');
          try {
            addLog('Cleaning requests collection...');
            const reqSnapshot = await getDocs(collection(db, 'requests'));
            for (const d of reqSnapshot.docs) {
              await deleteDoc(doc(db, 'requests', d.id));
            }
            addLog(`Deleted ${reqSnapshot.docs.length} requests.`);

            addLog('Cleaning users collection...');
            const userSnapshot = await getDocs(collection(db, 'users'));
            let deleted = 0;
            let kept = 0;
            for (const d of userSnapshot.docs) {
              const userData = d.data();
              if (ADMIN_EMAILS.includes(userData.email)) {
                kept += 1;
                continue;
              }
              await deleteDoc(doc(db, 'users', d.id));
              deleted += 1;
            }

            addLog(`Deleted ${deleted} user profiles. Kept ${kept} admins.`);
            addLog('Reset complete successfully.');
            setStatus('COMPLETED');
          } catch (err: any) {
            addLog(`ERROR: ${err?.message ?? 'Unknown error'}`);
            setStatus('ERROR');
          }
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>System Master Reset</Text>
        <Text style={styles.subtitle}>Bricola Admin Utility</Text>

        <ScrollView style={styles.logBox}>
          {log.length === 0 ? <Text style={styles.logLine}>Waiting for trigger...</Text> : null}
          {log.map(line => (
            <Text key={line} style={styles.logLine}>
              {line}
            </Text>
          ))}
        </ScrollView>

        <Pressable style={styles.resetBtn} onPress={runReset} disabled={status === 'RUNNING'}>
          <Text style={styles.resetText}>{status === 'RUNNING' ? 'PROCESSING...' : 'RESET DATABASE'}</Text>
        </Pressable>

        <Pressable onPress={onDone}>
          <Text style={styles.exitText}>Return to App</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', padding: 16 },
  card: { backgroundColor: '#1E293B', borderRadius: 28, padding: 20 },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '900' },
  subtitle: { color: '#94A3B8', marginBottom: 12 },
  logBox: {
    backgroundColor: '#020617',
    borderRadius: 14,
    minHeight: 180,
    maxHeight: 220,
    padding: 10,
    marginBottom: 12
  },
  logLine: { color: '#94A3B8', fontSize: 11, marginBottom: 4 },
  resetBtn: { backgroundColor: '#DC2626', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  resetText: { color: '#FFFFFF', fontWeight: '900' },
  exitText: { textAlign: 'center', marginTop: 10, color: '#CBD5E1', fontWeight: '700' }
});

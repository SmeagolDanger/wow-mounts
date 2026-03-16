import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import { colors } from '../theme';
import api from '../services/api';

export default function RootLayout() {
  const init = useRef(false);
  useEffect(() => { if (init.current) return; init.current=true; (async()=>{ await api.init(); try{await api.getMe();}catch{const d=await api.getDeviceId();await api.deviceAuth(d);} })(); }, []);
  useEffect(() => {
    const handle = (e:{url:string}) => processAuth(e.url);
    Linking.getInitialURL().then(u=>{if(u)processAuth(u);});
    const sub = Linking.addEventListener('url', handle);
    return ()=>sub.remove();
  }, []);
  async function processAuth(url:string) {
    const p = Linking.parse(url);
    if (p.path!=='auth/callback'&&p.hostname!=='auth') return;
    const q = p.queryParams||{};
    if (q.error) { Alert.alert('Login Failed',String(q.error)); return; }
    const t = q.token;
    if (!t||typeof t!=='string') return;
    await SecureStore.setItemAsync('auth_token',t);
    api.setToken(t);
    Alert.alert('Battle.net Linked!',typeof q.battletag==='string'?`Welcome, ${q.battletag}`:'Account linked.');
  }
  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor={colors.bg.primary}/>
      <Stack screenOptions={{headerShown:false,contentStyle:{backgroundColor:colors.bg.primary}}}><Stack.Screen name="(tabs)"/></Stack>
    </SafeAreaProvider>
  );
}

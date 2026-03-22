import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, radii, spacing } from '../../theme';

function TabBarBackground() {
  return Platform.OS === 'ios' ? (
    <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
  ) : (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg.glass }]} />
  );
}

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: z.bar,
      tabBarActiveTintColor: colors.gold.primary,
      tabBarInactiveTintColor: colors.text.tertiary,
      tabBarLabelStyle: z.label,
      tabBarBackground: () => <TabBarBackground />,
      tabBarItemStyle: z.item,
    }}>
      <Tabs.Screen name="index" options={{ title: 'Collection', tabBarIcon: ({ color, size }) => <Ionicons name="trophy" size={size} color={color} /> }} />
      <Tabs.Screen name="routes" options={{ title: 'Planner', tabBarIcon: ({ color, size }) => <Ionicons name="map" size={size} color={color} /> }} />
      <Tabs.Screen name="quickwins" options={{ title: 'Quick Wins', tabBarIcon: ({ color, size }) => <Ionicons name="flash" size={size} color={color} /> }} />
      <Tabs.Screen name="stats" options={{ title: 'Overview', tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} /> }} />
      {/* Hidden tabs — still routable but not in tab bar */}
      <Tabs.Screen name="pets" options={{ href: null }} />
      <Tabs.Screen name="achievements" options={{ href: null }} />
      <Tabs.Screen name="reputations" options={{ href: null }} />
      <Tabs.Screen name="farm" options={{ href: null }} />
      <Tabs.Screen name="transmog" options={{ href: null }} />
      <Tabs.Screen name="professions" options={{ href: null }} />
      <Tabs.Screen name="missingtoys" options={{ href: null }} />
      <Tabs.Screen name="missingpets" options={{ href: null }} />
      <Tabs.Screen name="missingtitles" options={{ href: null }} />
      <Tabs.Screen name="heirlooms" options={{ href: null }} />
    </Tabs>
  );
}

const z = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    height: 64,
    borderRadius: radii.xxl,
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: colors.border.glass,
    backgroundColor: 'transparent',
    elevation: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    overflow: 'hidden',
    paddingBottom: 0,
  },
  label: { fontSize: 9, fontWeight: '600', letterSpacing: 0.3, marginBottom: 6 },
  item: { paddingTop: 6 },
});

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import { colors } from '../../theme';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerShown:false,
      tabBarStyle:z.bar,
      tabBarActiveTintColor:colors.gold.primary,
      tabBarInactiveTintColor:colors.text.tertiary,
      tabBarLabelStyle:z.label,
    }}>
      <Tabs.Screen name="index" options={{title:'Mounts',tabBarIcon:({color,size})=><Ionicons name="trophy" size={size} color={color}/>}}/>
      <Tabs.Screen name="pets" options={{title:'Pets',tabBarIcon:({color,size})=><Ionicons name="paw" size={size} color={color}/>}}/>
      <Tabs.Screen name="achievements" options={{title:'Achieve',tabBarIcon:({color,size})=><Ionicons name="ribbon" size={size} color={color}/>}}/>
      <Tabs.Screen name="reputations" options={{title:'Reps',tabBarIcon:({color,size})=><Ionicons name="people" size={size} color={color}/>}}/>
      <Tabs.Screen name="stats" options={{title:'Overview',tabBarIcon:({color,size})=><Ionicons name="stats-chart" size={size} color={color}/>}}/>
      <Tabs.Screen name="farm" options={{title:'Farm',tabBarIcon:({color,size})=><Ionicons name="checkbox" size={size} color={color}/>}}/>
      <Tabs.Screen name="quickwins" options={{title:'Quick Wins',tabBarIcon:({color,size})=><Ionicons name="flash" size={size} color={color}/>}}/>
      <Tabs.Screen name="routes" options={{title:'Planner',tabBarIcon:({color,size})=><Ionicons name="map" size={size} color={color}/>}}/>
      <Tabs.Screen name="profile" options={{title:'Profile',tabBarIcon:({color,size})=><Ionicons name="person" size={size} color={color}/>}}/>
    </Tabs>
  );
}

const z = StyleSheet.create({
  bar:{backgroundColor:colors.bg.secondary,borderTopColor:colors.border.default,borderTopWidth:1,height:88,paddingTop:8,paddingBottom:28,elevation:0,shadowOpacity:0},
  label:{fontSize:9,fontWeight:'600',letterSpacing:0.2},
});

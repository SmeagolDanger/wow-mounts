import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii, spacing, shadows } from '../theme';

type V = 'default'|'gold'|'arcane'|'success'|'elevated'|'glass';
interface P { children:React.ReactNode; variant?:V; onPress?:()=>void; style?:ViewStyle; noPadding?:boolean; }

const b:Record<V,string[]> = {
  default:[colors.border.default,colors.border.subtle],
  gold:[colors.gold.dim,colors.gold.primary,colors.gold.dim],
  arcane:[colors.arcane.dim,colors.arcane.primary,colors.arcane.dim],
  success:[colors.fel.dim,colors.fel.primary,colors.fel.dim],
  elevated:[colors.border.subtle,colors.border.subtle],
  glass:[colors.border.glass,colors.border.glass],
};

export default function Card({children,variant='default',onPress,style,noPadding}:P) {
  const glow = variant==='gold'||variant==='arcane'||variant==='success';
  const isGlass = variant === 'glass';
  const bgColor = isGlass ? colors.bg.glass : variant==='elevated' ? colors.bg.elevated : colors.bg.secondary;
  const inner = <View style={[s.inner,{backgroundColor:bgColor},!noPadding&&s.pad,style]}>{children}</View>;
  const card = glow
    ? <LinearGradient colors={b[variant] as [string,string,...string[]]} start={{x:0,y:0}} end={{x:1,y:1}} style={s.grad}>{inner}</LinearGradient>
    : <View style={[isGlass ? s.glass : s.plain,{borderColor:b[variant][0]}]}>{inner}</View>;
  return onPress ? <Pressable onPress={onPress} style={({pressed})=>[pressed&&s.pressed]}>{card}</Pressable> : card;
}

const s = StyleSheet.create({
  grad:{borderRadius:radii.lg,padding:1.5,...shadows.card,flex:1},
  plain:{borderRadius:radii.lg,borderWidth:1,...shadows.card,flex:1},
  glass:{borderRadius:radii.lg,borderWidth:1,...shadows.soft,flex:1},
  inner:{borderRadius:radii.lg-1,overflow:'hidden',flex:1},
  pad:{padding:spacing.lg},
  pressed:{opacity:0.92,transform:[{scale:0.98}]},
});

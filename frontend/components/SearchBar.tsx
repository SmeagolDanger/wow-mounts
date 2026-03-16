import React from 'react';
import { View, TextInput, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../theme';

interface P { value:string; onChangeText:(t:string)=>void; placeholder?:string; }

export default function SearchBar({value,onChangeText,placeholder='Search...'}:P) {
  return (
    <View style={s.c}>
      <Ionicons name="search" size={16} color={colors.text.tertiary} style={{marginRight:spacing.sm}}/>
      <TextInput style={s.i} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.text.tertiary} autoCorrect={false} autoCapitalize="none"/>
      {value.length>0&&<Pressable onPress={()=>onChangeText('')} hitSlop={8}><Ionicons name="close-circle" size={16} color={colors.text.tertiary}/></Pressable>}
    </View>
  );
}

const s = StyleSheet.create({
  c:{flexDirection:'row',alignItems:'center',backgroundColor:colors.bg.input,borderRadius:radii.md,borderWidth:1,borderColor:colors.border.default,paddingHorizontal:spacing.md,height:42},
  i:{flex:1,fontSize:14,color:colors.text.primary,paddingVertical:0},
});

import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../theme';

interface P { value:string; onChangeText:(t:string)=>void; placeholder?:string; }

export default function SearchBar({value,onChangeText,placeholder='Search...'}:P) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[s.c, focused && s.cFocus]}>
      <Ionicons name="search" size={15} color={focused ? colors.text.secondary : colors.text.tertiary} style={{marginRight:spacing.sm}}/>
      <TextInput
        style={s.i} value={value} onChangeText={onChangeText}
        placeholder={placeholder} placeholderTextColor={colors.text.tertiary}
        autoCorrect={false} autoCapitalize="none"
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      />
      {value.length>0&&<Pressable onPress={()=>onChangeText('')} hitSlop={8}><Ionicons name="close-circle" size={16} color={colors.text.tertiary}/></Pressable>}
    </View>
  );
}

const s = StyleSheet.create({
  c:{flexDirection:'row',alignItems:'center',backgroundColor:colors.bg.input,borderRadius:radii.full,borderWidth:1,borderColor:colors.border.default,paddingHorizontal:spacing.lg,height:44},
  cFocus:{borderColor:colors.gold.dim+'80',backgroundColor:colors.bg.tertiary+'40'},
  i:{flex:1,fontSize:14,color:colors.text.primary,paddingVertical:0},
});

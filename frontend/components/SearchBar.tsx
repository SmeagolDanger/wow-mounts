import React from 'react';
import { View, TextInput, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../theme';

interface Props { value: string; onChangeText: (t: string) => void; placeholder?: string; autoFocus?: boolean; }

export default function SearchBar({ value, onChangeText, placeholder = 'Search mounts...', autoFocus = false }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name="search" size={18} color={colors.text.tertiary} style={styles.icon} />
      <TextInput style={styles.input} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.text.tertiary} autoFocus={autoFocus} autoCorrect={false} autoCapitalize="none" returnKeyType="search" />
      {value.length > 0 && <Pressable onPress={() => onChangeText('')} hitSlop={8}><Ionicons name="close-circle" size={18} color={colors.text.tertiary} /></Pressable>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg.input, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border.default, paddingHorizontal: spacing.md, height: 44 },
  icon: { marginRight: spacing.sm },
  input: { flex: 1, fontSize: 15, color: colors.text.primary, paddingVertical: 0 },
});

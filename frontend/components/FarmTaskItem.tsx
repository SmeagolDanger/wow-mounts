/**
 * FarmTaskItem — A single farm task row with checkbox, source badge, and reset indicator.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '../theme';

interface FarmTaskItemProps {
  id: number;
  title: string;
  description?: string;
  sourceType?: string;
  zoneName?: string;
  resetType: string;
  completed: boolean;
  onToggle: () => void;
  onPress?: () => void;
  onDelete?: () => void;
}

const resetIcons: Record<string, string> = {
  daily: 'sunny-outline',
  weekly: 'calendar-outline',
  none: 'infinite-outline',
};

const resetLabels: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  none: 'One-time',
};

export default function FarmTaskItem({
  title,
  description,
  sourceType,
  zoneName,
  resetType,
  completed,
  onToggle,
  onPress,
  onDelete,
}: FarmTaskItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      {/* Checkbox */}
      <Pressable onPress={onToggle} hitSlop={12} style={styles.checkArea}>
        <View style={[styles.checkbox, completed && styles.checkboxDone]}>
          {completed && <Ionicons name="checkmark" size={14} color={colors.bg.primary} />}
        </View>
      </Pressable>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.title, completed && styles.titleDone]} numberOfLines={1}>
          {title}
        </Text>

        <View style={styles.meta}>
          {/* Reset type badge */}
          <View style={styles.badge}>
            <Ionicons
              name={resetIcons[resetType] as any || 'time-outline'}
              size={11}
              color={colors.text.tertiary}
            />
            <Text style={styles.badgeText}>{resetLabels[resetType] || resetType}</Text>
          </View>

          {/* Source type */}
          {sourceType && (
            <View style={[styles.badge, { backgroundColor: (colors.source as any)[sourceType] + '18' }]}>
              <Text
                style={[
                  styles.badgeText,
                  { color: (colors.source as any)[sourceType] || colors.text.tertiary },
                ]}
              >
                {sourceType}
              </Text>
            </View>
          )}

          {/* Zone */}
          {zoneName && (
            <Text style={styles.zone} numberOfLines={1}>
              {zoneName}
            </Text>
          )}
        </View>
      </View>

      {/* Delete */}
      {onDelete && (
        <Pressable onPress={onDelete} hitSlop={12} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={16} color={colors.fire.dim} />
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
    gap: spacing.md,
  },
  pressed: {
    backgroundColor: colors.bg.tertiary,
  },
  checkArea: {
    padding: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: colors.fel.primary,
    borderColor: colors.fel.primary,
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.subheading,
    fontSize: 15,
  },
  titleDone: {
    color: colors.text.tertiary,
    textDecorationLine: 'line-through',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.bg.tertiary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  zone: {
    ...typography.caption,
    fontSize: 11,
    color: colors.text.tertiary,
  },
  deleteBtn: {
    padding: spacing.xs,
  },
});

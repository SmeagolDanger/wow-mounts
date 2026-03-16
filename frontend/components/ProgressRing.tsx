import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, typography } from '../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props { collected: number; total: number; size?: number; strokeWidth?: number; color?: string; }

export default function ProgressRing({ collected, total, size = 120, strokeWidth = 8, color = colors.gold.primary }: Props) {
  const progress = total > 0 ? collected / total : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => { Animated.timing(animValue, { toValue: progress, duration: 1200, useNativeDriver: false }).start(); }, [progress]);

  const strokeDashoffset = animValue.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.border.default} strokeWidth={strokeWidth} fill="none" />
        <AnimatedCircle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </Svg>
      <View style={styles.center}>
        <Text style={styles.percent}>{Math.round(progress * 100)}%</Text>
        <Text style={styles.count}>{collected}/{total}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  percent: { fontSize: 24, fontWeight: '700', color: colors.text.primary, letterSpacing: -0.5 },
  count: { ...typography.caption, color: colors.text.secondary, marginTop: 2 },
});

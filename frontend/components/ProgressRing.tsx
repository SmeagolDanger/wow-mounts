import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, typography } from '../theme';

const AC = Animated.createAnimatedComponent(Circle);
interface P { collected:number; total:number; size?:number; strokeWidth?:number; color?:string; }

export default function ProgressRing({collected,total,size=100,strokeWidth=7,color=colors.gold.primary}:P) {
  const pct = total>0?collected/total:0;
  const r = (size-strokeWidth)/2;
  const circ = 2*Math.PI*r;
  const av = useRef(new Animated.Value(0)).current;
  useEffect(()=>{Animated.timing(av,{toValue:pct,duration:1000,useNativeDriver:false}).start();},[pct]);
  const off = av.interpolate({inputRange:[0,1],outputRange:[circ,0]});

  return (
    <View style={[z.c,{width:size,height:size}]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={size/2} cy={size/2} r={r} stroke={colors.border.default} strokeWidth={strokeWidth} fill="none"/>
        <AC cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off} transform={`rotate(-90 ${size/2} ${size/2})`}/>
      </Svg>
      <View style={z.center}>
        <Text style={z.pct}>{Math.round(pct*100)}%</Text>
        <Text style={z.cnt}>{collected}/{total}</Text>
      </View>
    </View>
  );
}

const z = StyleSheet.create({
  c:{position:'relative',alignItems:'center',justifyContent:'center'},
  center:{...StyleSheet.absoluteFillObject,alignItems:'center',justifyContent:'center'},
  pct:{fontSize:20,fontWeight:'700',color:colors.text.primary,letterSpacing:-0.5},
  cnt:{...typography.caption,color:colors.text.secondary,marginTop:1,fontSize:10},
});

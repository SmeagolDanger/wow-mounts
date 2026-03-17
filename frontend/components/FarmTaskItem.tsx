import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '../theme';

interface P { title:string; sourceType?:string; zoneName?:string; resetType:string; completed:boolean; onToggle:()=>void; onDelete?:()=>void; }

const DELETE_THRESHOLD = 80;

export default function FarmTaskItem({title,sourceType,zoneName,resetType,completed,onToggle,onDelete}:P) {
  const translateX = useRef(new Animated.Value(0)).current;
  const deleteOpacity = translateX.interpolate({inputRange:[-DELETE_THRESHOLD,-20,0],outputRange:[1,0.5,0],extrapolate:'clamp'});

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder:(_,g) => Math.abs(g.dx) > Math.abs(g.dy) * 1.5 && g.dx < -5,
    onPanResponderMove:(_,g) => { if (g.dx < 0) translateX.setValue(Math.max(g.dx, -120)); },
    onPanResponderRelease:(_,g) => {
      if (g.dx < -DELETE_THRESHOLD && onDelete) {
        Animated.timing(translateX,{toValue:-500,duration:200,useNativeDriver:true}).start(()=>onDelete());
      } else {
        Animated.spring(translateX,{toValue:0,useNativeDriver:true,tension:100,friction:10}).start();
      }
    },
    onPanResponderTerminate:() => {
      Animated.spring(translateX,{toValue:0,useNativeDriver:true}).start();
    },
  })).current;

  const ri:Record<string,string> = {daily:'sunny-outline',weekly:'calendar-outline',none:'infinite-outline'};
  const rl:Record<string,string> = {daily:'Daily',weekly:'Weekly',none:'One-time'};

  return (
    <View style={z.outer}>
      {/* Red delete background revealed on swipe */}
      <Animated.View style={[z.deleteBg,{opacity:deleteOpacity}]}>
        <Ionicons name="trash" size={20} color="#fff"/>
        <Text style={z.deleteT}>Delete</Text>
      </Animated.View>
      <Animated.View style={{transform:[{translateX}]}} {...panResponder.panHandlers}>
        <View style={z.c}>
          <Pressable onPress={onToggle} hitSlop={12}>
            <View style={[z.cb,completed&&z.cbDone]}>
              {completed&&<Ionicons name="checkmark" size={13} color={colors.bg.primary}/>}
            </View>
          </Pressable>
          <View style={z.body}>
            <Text style={[z.title,completed&&z.titleDone]} numberOfLines={1}>{title}</Text>
            <View style={z.meta}>
              <View style={z.badge}>
                <Ionicons name={ri[resetType] as any||'time-outline'} size={10} color={colors.text.tertiary}/>
                <Text style={z.badgeT}>{rl[resetType]||resetType}</Text>
              </View>
              {sourceType&&<View style={[z.badge,{backgroundColor:(colors.source[sourceType]||colors.text.tertiary)+'15'}]}>
                <Text style={[z.badgeT,{color:colors.source[sourceType]||colors.text.tertiary}]}>{sourceType}</Text>
              </View>}
              {zoneName&&<Text style={z.zone} numberOfLines={1}>{zoneName}</Text>}
            </View>
          </View>
          {onDelete&&(
            <Pressable onPress={onDelete} hitSlop={12}>
              <Ionicons name="trash-outline" size={15} color={colors.fire.dim}/>
            </Pressable>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const z = StyleSheet.create({
  outer:{position:'relative',borderRadius:radii.md,overflow:'hidden'},
  deleteBg:{
    ...StyleSheet.absoluteFillObject,
    backgroundColor:colors.fire.dim,
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'flex-end',
    paddingRight:spacing.xl,
    gap:spacing.xs,
  },
  deleteT:{color:'#fff',fontSize:12,fontWeight:'700'},
  c:{flexDirection:'row',alignItems:'center',backgroundColor:colors.bg.secondary,borderRadius:radii.md,borderWidth:1,borderColor:colors.border.default,padding:spacing.md,gap:spacing.md},
  cb:{width:22,height:22,borderRadius:radii.sm,borderWidth:2,borderColor:colors.border.subtle,alignItems:'center',justifyContent:'center'},
  cbDone:{backgroundColor:colors.fel.primary,borderColor:colors.fel.primary},
  body:{flex:1,gap:2},
  title:{...typography.subheading,fontSize:14},
  titleDone:{color:colors.text.tertiary,textDecorationLine:'line-through'},
  meta:{flexDirection:'row',alignItems:'center',gap:spacing.sm,flexWrap:'wrap'},
  badge:{flexDirection:'row',alignItems:'center',gap:2,backgroundColor:colors.bg.tertiary,paddingHorizontal:5,paddingVertical:1,borderRadius:radii.sm},
  badgeT:{fontSize:9,fontWeight:'600',color:colors.text.tertiary,textTransform:'uppercase',letterSpacing:0.3},
  zone:{...typography.caption,fontSize:10,color:colors.text.tertiary},
});

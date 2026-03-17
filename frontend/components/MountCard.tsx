import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, shadows } from '../theme';

interface P { id:number; name:string; iconUrl?:string|null; sourceType?:string|null; collected?:boolean; faction?:string|null; onPress?:()=>void; }

const src:Record<string,string> = {raid:'Raid',dungeon:'Dungeon',world_boss:'Boss',reputation:'Rep',achievement:'Achiev',vendor:'Vendor',quest:'Quest',drop:'Drop',promotion:'Promo'};
const FACTION_COLOR: Record<string,string> = { alliance:'#4A90D9', horde:'#C41F3B' };

export default function MountCard({name,iconUrl,sourceType,collected,faction,onPress}:P) {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!iconUrl) {
      const a = Animated.loop(Animated.sequence([
        Animated.timing(shimmer,{toValue:1,duration:1600,useNativeDriver:true}),
        Animated.timing(shimmer,{toValue:0,duration:1600,useNativeDriver:true}),
      ]));
      a.start();
      return () => a.stop();
    }
  }, [iconUrl]);

  const op = shimmer.interpolate({inputRange:[0,1],outputRange:[0.08,0.25]});
  const sc = sourceType ? (colors.source[sourceType]||colors.text.tertiary) : null;
  const fc = faction ? FACTION_COLOR[faction] : null;

  return (
    <Pressable onPress={onPress} style={({pressed})=>[s.wrap,collected&&s.collected,pressed&&s.pressed]}>
      {/* Square image area */}
      <View style={s.imgWrap}>
        {iconUrl
          ? <Image source={{uri:iconUrl}} style={s.img} resizeMode="cover"/>
          : <Animated.View style={[s.ph,{opacity:op}]}><Ionicons name="sparkles-outline" size={20} color={colors.gold.dim}/></Animated.View>
        }
        {collected && (
          <View style={s.check}><Ionicons name="checkmark-circle" size={15} color={colors.fel.bright}/></View>
        )}
        {sc && <View style={[s.srcDot,{backgroundColor:sc}]}/>}
        {fc && (
          <View style={[s.factionBadge,{backgroundColor:fc+'22',borderColor:fc+'55'}]}>
            <Text style={[s.factionT,{color:fc}]}>{faction==='alliance'?'A':'H'}</Text>
          </View>
        )}
      </View>
      {/* Fixed-height info area so all cards are equal */}
      <View style={s.info}>
        <Text style={s.name} numberOfLines={2}>{name}</Text>
        {sourceType && sc ? (
          <View style={[s.badge,{backgroundColor:sc+'20',borderColor:sc+'40'}]}>
            <Text style={[s.badgeT,{color:sc}]}>{src[sourceType]||sourceType}</Text>
          </View>
        ) : <View style={s.badgeSpacer}/>}
      </View>
      {collected===false && <View style={s.dim}/>}
    </Pressable>
  );
}

const INFO_H = 58; // fixed info section height — enough for 2 name lines + badge

const s = StyleSheet.create({
  wrap:{
    backgroundColor:colors.bg.secondary,
    borderRadius:radii.md,
    borderWidth:1,
    borderColor:colors.border.default,
    overflow:'hidden',
    ...shadows.card,
  },
  collected:{borderColor:colors.fel.dim+'CC'},
  pressed:{opacity:0.8,transform:[{scale:0.95}]},
  imgWrap:{aspectRatio:1,backgroundColor:colors.bg.tertiary},
  img:{width:'100%',height:'100%'},
  ph:{width:'100%',height:'100%',alignItems:'center',justifyContent:'center'},
  check:{position:'absolute',top:3,right:3,backgroundColor:colors.bg.primary+'CC',borderRadius:radii.full,padding:1},
  srcDot:{position:'absolute',bottom:4,right:4,width:6,height:6,borderRadius:3,opacity:0.9},
  factionBadge:{position:'absolute',top:4,left:4,width:18,height:18,borderRadius:9,borderWidth:1,alignItems:'center',justifyContent:'center'},
  factionT:{fontSize:9,fontWeight:'900',lineHeight:18},
  info:{height:INFO_H,padding:spacing.sm,gap:2,justifyContent:'space-between'},
  name:{fontSize:11,fontWeight:'600',color:colors.text.primary,lineHeight:14,flex:1},
  badge:{alignSelf:'flex-start',paddingHorizontal:5,paddingVertical:2,borderRadius:radii.sm,borderWidth:1},
  badgeT:{fontSize:9,fontWeight:'700',letterSpacing:0.4,textTransform:'uppercase'},
  badgeSpacer:{height:17},
  dim:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(7,8,15,0.45)'},
});

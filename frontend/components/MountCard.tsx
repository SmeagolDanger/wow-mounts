import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, shadows } from '../theme';

interface P { id:number; name:string; iconUrl?:string|null; sourceType?:string|null; collected?:boolean; onPress?:()=>void; }

const src:Record<string,string> = {raid:'Raid',dungeon:'Dungeon',world_boss:'Boss',reputation:'Rep',achievement:'Achiev',vendor:'Vendor',quest:'Quest',drop:'Drop',promotion:'Promo'};

export default function MountCard({name,iconUrl,sourceType,collected,onPress}:P) {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => { if (!iconUrl) { const a=Animated.loop(Animated.sequence([Animated.timing(shimmer,{toValue:1,duration:1400,useNativeDriver:true}),Animated.timing(shimmer,{toValue:0,duration:1400,useNativeDriver:true})])); a.start(); return ()=>a.stop(); } }, [iconUrl]);
  const op = shimmer.interpolate({inputRange:[0,1],outputRange:[0.15,0.35]});
  const sc = sourceType ? (colors.source[sourceType]||colors.text.tertiary) : colors.text.tertiary;

  return (
    <Pressable onPress={onPress} style={({pressed})=>[s.wrap,collected&&s.collected,pressed&&s.pressed]}>
      <View style={s.imgWrap}>
        {iconUrl ? <Image source={{uri:iconUrl}} style={s.img} resizeMode="cover"/> : <Animated.View style={[s.ph,{opacity:op}]}><Ionicons name="sparkles-outline" size={22} color={colors.gold.dim}/></Animated.View>}
        {collected&&<View style={s.check}><Ionicons name="checkmark-circle" size={16} color={colors.fel.bright}/></View>}
      </View>
      <View style={s.info}>
        <Text style={s.name} numberOfLines={2}>{name}</Text>
        {sourceType&&<View style={[s.badge,{backgroundColor:sc+'15'}]}><Text style={[s.badgeT,{color:sc}]}>{src[sourceType]||sourceType}</Text></View>}
      </View>
      {collected===false&&<View style={s.dim}/>}
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap:{backgroundColor:colors.bg.secondary,borderRadius:radii.md,borderWidth:1,borderColor:colors.border.default,overflow:'hidden',...shadows.card},
  collected:{borderColor:colors.fel.dim},
  pressed:{opacity:0.85,transform:[{scale:0.96}]},
  imgWrap:{aspectRatio:1,backgroundColor:colors.bg.primary},
  img:{width:'100%',height:'100%'},
  ph:{width:'100%',height:'100%',alignItems:'center',justifyContent:'center',backgroundColor:colors.bg.tertiary},
  check:{position:'absolute',top:4,right:4,backgroundColor:colors.bg.primary+'DD',borderRadius:radii.full,padding:1},
  info:{padding:spacing.sm,gap:2},
  name:{fontSize:11,fontWeight:'600',color:colors.text.primary,lineHeight:14},
  badge:{alignSelf:'flex-start',paddingHorizontal:4,paddingVertical:1,borderRadius:radii.sm,marginTop:2},
  badgeT:{fontSize:9,fontWeight:'700',letterSpacing:0.4,textTransform:'uppercase'},
  dim:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(8,9,13,0.4)'},
});

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Image, ScrollView, Animated, PanResponder, Dimensions, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../theme';
import api from '../services/api';

const { width: SW } = Dimensions.get('window');
const IMG = SW * 0.55;
const src:Record<string,string> = {raid:'Raid',dungeon:'Dungeon',world_boss:'World Boss',reputation:'Reputation',achievement:'Achievement',vendor:'Vendor',quest:'Quest',drop:'World Drop',promotion:'Promotion'};

interface P { mountId:number|null; visible:boolean; onClose:()=>void; onAddToFarm:(m:{id:number;name:string;source_type?:string})=>void; }

export default function MountDetailModal({mountId,visible,onClose,onAddToFarm}:P) {
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const pan = useRef(new Animated.ValueXY({x:0,y:0})).current;
  const scale = useRef(new Animated.Value(1)).current;

  const pr = useRef(PanResponder.create({
    onStartShouldSetPanResponder:()=>true,
    onPanResponderGrant:()=>{Animated.spring(scale,{toValue:1.06,useNativeDriver:true}).start();},
    onPanResponderMove:(_,g)=>{pan.setValue({x:Math.max(-12,Math.min(12,g.dx/10)),y:Math.max(-12,Math.min(12,-g.dy/10))});},
    onPanResponderRelease:()=>{Animated.parallel([Animated.spring(pan,{toValue:{x:0,y:0},useNativeDriver:true}),Animated.spring(scale,{toValue:1,useNativeDriver:true})]).start();},
  })).current;

  const rx = pan.y.interpolate({inputRange:[-12,12],outputRange:['-12deg','12deg']});
  const ry = pan.x.interpolate({inputRange:[-12,12],outputRange:['-12deg','12deg']});

  useEffect(() => { if (visible&&mountId) { setLoading(true); setDetail(null); api.getMountDetail(mountId).then(setDetail).catch(()=>{}).finally(()=>setLoading(false)); } }, [visible,mountId]);

  if (!visible) return null;
  const icon = detail?.icon_url;
  const st = detail?.source?.type;
  const sc = st?(colors.source[st]||colors.text.secondary):colors.text.secondary;
  const faction = detail?.faction?.name;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={z.bd}>
        <View style={z.sheet}>
          <View style={z.handle}/>
          <Pressable onPress={onClose} style={z.closeBtn} hitSlop={12}><Ionicons name="close" size={20} color={colors.text.secondary}/></Pressable>
          <ScrollView contentContainerStyle={z.content} showsVerticalScrollIndicator={false}>
            {loading ? <View style={z.loadW}><ActivityIndicator size="large" color={colors.gold.primary}/></View> : detail ? <>
              <View style={z.viewerW}>
                <Animated.View {...pr.panHandlers} style={[z.viewer,{transform:[{perspective:800},{rotateX:rx},{rotateY:ry},{scale}]}]}>
                  <View style={[z.glowRing,shadows.glow(sc)]}/>
                  {icon ? <Image source={{uri:icon}} style={z.mountImg} resizeMode="contain"/> : <Ionicons name="image-outline" size={56} color={colors.text.tertiary}/>}
                </Animated.View>
                <Text style={z.hint}>Drag to rotate</Text>
              </View>
              <Text style={z.mountName}>{detail.name}</Text>
              {faction&&<Text style={[z.faction,{color:faction==='Alliance'?'#0070DD':faction==='Horde'?'#C41F3B':colors.text.secondary}]}>{faction}</Text>}
              {st&&<View style={[z.srcBadge,{backgroundColor:sc+'18',borderColor:sc+'40'}]}><Text style={[z.srcText,{color:sc}]}>{src[st]||st}</Text></View>}
              {detail.description&&<View style={z.lore}><Text style={z.loreLabel}>LORE</Text><Text style={z.loreText}>{detail.description}</Text></View>}
              <View style={z.actions}>
                <Pressable onPress={()=>onAddToFarm({id:detail.id,name:detail.name,source_type:st})} style={({pressed})=>[z.farmBtn,pressed&&{opacity:0.8}]}>
                  <Ionicons name="add-circle" size={18} color={colors.bg.primary}/><Text style={z.farmBtnT}>Add to Farm</Text>
                </Pressable>
                <Pressable onPress={()=>Linking.openURL(`https://www.wowhead.com/mount/${detail.id}`)} style={({pressed})=>[z.whBtn,pressed&&{opacity:0.8}]}>
                  <Ionicons name="globe-outline" size={18} color={colors.text.primary}/><Text style={z.whBtnT}>Wowhead 3D</Text>
                </Pressable>
              </View>
            </> : <View style={z.loadW}><Ionicons name="alert-circle-outline" size={48} color={colors.text.tertiary}/><Text style={z.loadT}>Mount not found</Text></View>}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const z = StyleSheet.create({
  bd:{flex:1,backgroundColor:colors.bg.modal,justifyContent:'flex-end'},
  sheet:{backgroundColor:colors.bg.secondary,borderTopLeftRadius:radii.xl,borderTopRightRadius:radii.xl,maxHeight:'90%',paddingBottom:44},
  handle:{width:32,height:4,borderRadius:2,backgroundColor:colors.border.subtle,alignSelf:'center',marginTop:spacing.md,marginBottom:spacing.sm},
  closeBtn:{position:'absolute',top:spacing.lg,right:spacing.lg,zIndex:10,backgroundColor:colors.bg.elevated,borderRadius:radii.full,padding:spacing.sm},
  content:{paddingHorizontal:spacing.xl,paddingTop:spacing.sm,paddingBottom:spacing.xxxl,alignItems:'center'},
  loadW:{paddingVertical:80,alignItems:'center',gap:spacing.lg},
  loadT:{...typography.body,color:colors.text.secondary},
  viewerW:{alignItems:'center',marginBottom:spacing.xl},
  viewer:{width:IMG,height:IMG,borderRadius:IMG/2,backgroundColor:colors.bg.primary,alignItems:'center',justifyContent:'center',borderWidth:1.5,borderColor:colors.border.subtle,overflow:'hidden'},
  glowRing:{...StyleSheet.absoluteFillObject,borderRadius:IMG/2},
  mountImg:{width:'80%',height:'80%'},
  hint:{...typography.caption,color:colors.text.tertiary,marginTop:spacing.sm,fontSize:10},
  mountName:{...typography.display,fontSize:22,textAlign:'center',marginBottom:spacing.xs},
  faction:{...typography.caption,fontWeight:'700',fontSize:12,marginBottom:spacing.md},
  srcBadge:{paddingHorizontal:spacing.lg,paddingVertical:spacing.sm,borderRadius:radii.full,borderWidth:1,marginBottom:spacing.xl},
  srcText:{fontSize:12,fontWeight:'700',letterSpacing:0.5},
  lore:{width:'100%',marginBottom:spacing.xl},
  loreLabel:{...typography.label,color:colors.gold.dim,marginBottom:spacing.sm},
  loreText:{...typography.body,color:colors.text.secondary,lineHeight:22,fontStyle:'italic'},
  actions:{width:'100%',gap:spacing.md},
  farmBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:spacing.sm,backgroundColor:colors.gold.primary,borderRadius:radii.md,paddingVertical:14},
  farmBtnT:{fontSize:15,fontWeight:'700',color:colors.bg.primary},
  whBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:spacing.sm,backgroundColor:colors.bg.elevated,borderRadius:radii.md,paddingVertical:14,borderWidth:1,borderColor:colors.border.subtle},
  whBtnT:{fontSize:15,fontWeight:'600',color:colors.text.primary},
});

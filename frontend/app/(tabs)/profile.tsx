import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Image, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '../../theme';
import { Card } from '../../components';
import api, { FavChar } from '../../services/api';
import { useApp } from '../../contexts/AppContext';

interface LR { name:string;realm:string;realm_slug:string;level:number;race:string;class:string;faction:string;avatar_url:string|null;mount_count:number|null; }

export default function ProfileScreen() {
  const { refreshMe, selectCharacter, selectedChar } = useApp();
  const [favs,setFavs]=useState<FavChar[]>([]);
  const [hasBnet,setHasBnet]=useState(false);
  const [btag,setBtag]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);
  const [realm,setRealm]=useState('');
  const [cName,setCName]=useState('');
  const [searching,setSearching]=useState(false);
  const [result,setResult]=useState<LR|null>(null);

  const loadP=useCallback(async()=>{
    try{
      const[m,f]=await Promise.all([api.getMe(),api.getFavorites()]);
      setHasBnet(m.has_bnet);setBtag(m.battletag);setFavs(f.characters);
      await refreshMe();
    }catch{}finally{setLoading(false);}
  },[refreshMe]);
  useFocusEffect(useCallback(()=>{loadP();},[loadP]));

  const search=async()=>{if(!realm.trim()||!cName.trim())return;setSearching(true);setResult(null);try{setResult(await api.lookupCharacter(realm.trim().toLowerCase(),cName.trim()));}catch(e:any){Alert.alert('Not Found',e.message||'Check realm and name.');}finally{setSearching(false);}};
  const addFav=async()=>{if(!result)return;try{await api.addFavorite(result.realm_slug,result.name);await loadP();setResult(null);setRealm('');setCName('');}catch(e:any){Alert.alert('Error',e.message);}};
  const rmFav=(id:number,n:string)=>Alert.alert('Remove',`Remove ${n}?`,[{text:'Cancel',style:'cancel'},{text:'Remove',style:'destructive',onPress:async()=>{try{await api.removeFavorite(id);setFavs(p=>p.filter(c=>c.id!==id));}catch{}}}]);
  const bnetLink=async()=>{try{const{authorize_url}=await api.getBnetLoginUrl();Linking.openURL(authorize_url);}catch{Alert.alert('Error','Failed to start login');}};

  return (
    <SafeAreaView style={z.safe} edges={['top']}>
      <ScrollView contentContainerStyle={z.content}>
        <Text style={z.title}>Profile</Text>
        <Card variant={hasBnet?'gold':'default'}>
          <View style={z.bRow}>
            <Ionicons name={hasBnet?'shield-checkmark':'shield-outline'} size={24} color={hasBnet?colors.gold.primary:colors.text.tertiary}/>
            <View style={z.bInfo}>
              <Text style={z.bTag}>{hasBnet?btag:'Link Battle.net'}</Text>
              <Text style={z.bSub}>{hasBnet?'Account linked — tap Re-link if characters stop loading':'Optional — enables character auto-load'}</Text>
            </View>
            <Pressable onPress={bnetLink} style={z.linkBtn}><Text style={z.linkBtnT}>{hasBnet?'Re-link':'Link'}</Text></Pressable>
          </View>
        </Card>
        <View style={z.sec}><Text style={z.secT}>Search Character</Text>
          <View style={z.sRow}>
            <TextInput style={[z.sIn,{flex:2}]} value={realm} onChangeText={setRealm} placeholder="Realm slug" placeholderTextColor={colors.text.tertiary} autoCapitalize="none" autoCorrect={false}/>
            <TextInput style={[z.sIn,{flex:3}]} value={cName} onChangeText={setCName} placeholder="Character name" placeholderTextColor={colors.text.tertiary} autoCapitalize="none" autoCorrect={false} onSubmitEditing={search}/>
            <Pressable onPress={search} style={[z.sBtn,(!realm.trim()||!cName.trim())&&z.sBtnD]} disabled={!realm.trim()||!cName.trim()||searching}>
              {searching?<ActivityIndicator size="small" color={colors.bg.primary}/>:<Ionicons name="search" size={16} color={colors.bg.primary}/>}
            </Pressable>
          </View>
        </View>
        {result&&(
          <Card variant="arcane">
            <View style={z.rRow}>
              {result.avatar_url?<Image source={{uri:result.avatar_url}} style={z.av}/>:<View style={[z.av,z.avPh]}><Ionicons name="person" size={20} color={colors.text.tertiary}/></View>}
              <View style={z.rInfo}>
                <Text style={z.rName}>{result.name}</Text>
                <Text style={z.rMeta}>Lv {result.level} <Text style={{color:colors.classColor[result.class]||colors.text.primary}}>{result.race} {result.class}</Text></Text>
                <Text style={z.rRealm}>{result.realm}</Text>
                {result.mount_count!=null&&<Text style={z.rMounts}>{result.mount_count} mounts</Text>}
              </View>
              <Pressable onPress={addFav} style={z.favBtn}><Ionicons name="heart-outline" size={20} color={colors.fire.primary}/></Pressable>
            </View>
            <View style={z.rActions}>
              <Pressable onPress={()=>{selectCharacter({realm_slug:result.realm_slug,character_name:result.name,display:`${result.name}-${result.realm_slug}`,faction:result.faction?.toLowerCase(),avatar_url:result.avatar_url||undefined});Alert.alert('Character Selected',`${result.name} is now your active character for collection tracking.`);}} style={z.selectBtn}>
                <Ionicons name="checkmark-circle" size={16} color={colors.bg.primary}/>
                <Text style={z.selectBtnT}>Track This Character</Text>
              </Pressable>
            </View>
          </Card>
        )}
        <View style={z.sec}>
          <Text style={z.secT}>Favorites <Text style={z.secC}>({favs.length})</Text></Text>
          {favs.length===0&&!loading
            ?<View style={z.eFav}><Ionicons name="heart-outline" size={28} color={colors.text.tertiary}/><Text style={z.eFavT}>No favorites yet</Text><Text style={z.eFavS}>Search a character above and tap the heart to save them</Text></View>
            :<View style={z.fList}>{favs.map(c=>{
              const isActive = selectedChar?.character_name === c.character_name && selectedChar?.realm_slug === c.realm_slug;
              return (
              <Card key={c.id} variant={isActive?'gold':c.is_primary?'default':'default'}
                onPress={()=>selectCharacter({realm_slug:c.realm_slug,character_name:c.character_name,display:`${c.character_name}-${c.realm_slug}`,avatar_url:c.avatar_url||undefined})}>
                <View style={z.fRow}>
                  {c.avatar_url?<Image source={{uri:c.avatar_url}} style={z.fAv}/>:<View style={[z.fAv,z.avPh]}><Ionicons name="person" size={16} color={colors.text.tertiary}/></View>}
                  <View style={z.fInfo}>
                    <Text style={z.fName}>{c.character_name}</Text>
                    <Text style={[z.fClass,{color:colors.classColor[c.class_name]||colors.text.primary}]}>{c.race_name} {c.class_name}</Text>
                    <Text style={z.fRealm}>{c.realm_slug}</Text>
                  </View>
                  <View style={z.fActs}>
                    {isActive&&<Ionicons name="checkmark-circle" size={18} color={colors.gold.primary}/>}
                    {!isActive&&c.is_primary&&<View style={z.mainB}><Text style={z.mainT}>MAIN</Text></View>}
                    <Pressable onPress={()=>rmFav(c.id,c.character_name)} hitSlop={8}><Ionicons name="close-circle" size={18} color={colors.text.tertiary}/></Pressable>
                  </View>
                </View>
              </Card>
              );
            })}</View>
          }
        </View>

        {/* About */}
        <View style={z.aboutCard}>
          <Text style={z.aboutName}>WoW Mount Tracker</Text>
          <Text style={z.aboutVersion}>v1.2.0</Text>
          <Text style={z.aboutCopy}>Inspired by SimpleArmory. Not affiliated with Blizzard Entertainment.</Text>
          <Text style={z.aboutCopy}>Data from the official Battle.net API.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const z=StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.bg.primary},
  content:{paddingHorizontal:spacing.lg,paddingTop:spacing.md,paddingBottom:120,gap:spacing.xl},
  title:{...typography.display,color:colors.frost.primary},
  bRow:{flexDirection:'row',alignItems:'center',gap:spacing.lg},
  bInfo:{flex:1,gap:2},
  bTag:{...typography.subheading},
  bSub:{...typography.caption,color:colors.text.secondary,fontSize:11},
  linkBtn:{paddingHorizontal:spacing.lg,paddingVertical:spacing.sm,borderRadius:radii.full,backgroundColor:colors.gold.primary},
  linkBtnT:{fontWeight:'700',fontSize:12,color:colors.bg.primary},
  sec:{gap:spacing.md},
  secT:{...typography.heading},
  secC:{color:colors.text.tertiary,fontWeight:'400'},
  sRow:{flexDirection:'row',gap:spacing.sm},
  sIn:{backgroundColor:colors.bg.input,borderRadius:radii.full,borderWidth:1,borderColor:colors.border.default,paddingHorizontal:spacing.lg,height:42,fontSize:13,color:colors.text.primary},
  sBtn:{width:42,height:42,borderRadius:radii.full,backgroundColor:colors.gold.primary,alignItems:'center',justifyContent:'center'},
  sBtnD:{opacity:0.4},
  rRow:{flexDirection:'row',alignItems:'center',gap:spacing.md},
  av:{width:48,height:48,borderRadius:radii.full,backgroundColor:colors.bg.tertiary},
  avPh:{alignItems:'center',justifyContent:'center'},
  rInfo:{flex:1,gap:2},
  rName:{...typography.subheading,fontSize:15},
  rMeta:{...typography.caption,color:colors.text.secondary},
  rRealm:{fontSize:10,color:colors.text.tertiary},
  rMounts:{fontSize:10,color:colors.gold.dim,marginTop:1},
  favBtn:{width:36,height:36,borderRadius:radii.full,backgroundColor:colors.fire.muted,alignItems:'center',justifyContent:'center'},
  rActions:{flexDirection:'row',marginTop:spacing.md,paddingTop:spacing.md,borderTopWidth:1,borderTopColor:colors.border.default},
  selectBtn:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:spacing.xs,backgroundColor:colors.gold.primary,borderRadius:radii.full,paddingVertical:10},
  selectBtnT:{fontSize:13,fontWeight:'700',color:colors.bg.primary},
  eFav:{alignItems:'center',paddingVertical:spacing.xxxl,gap:spacing.md},
  eFavT:{...typography.subheading,color:colors.text.secondary},
  eFavS:{...typography.caption,color:colors.text.tertiary,textAlign:'center'},
  fList:{gap:spacing.sm},
  fRow:{flexDirection:'row',alignItems:'center',gap:spacing.md},
  fAv:{width:40,height:40,borderRadius:radii.full,backgroundColor:colors.bg.tertiary},
  fInfo:{flex:1,gap:1},
  fName:{...typography.subheading,textTransform:'capitalize',fontSize:14},
  fClass:{...typography.caption,fontWeight:'600',fontSize:11},
  fRealm:{fontSize:10,color:colors.text.tertiary},
  fActs:{alignItems:'flex-end',gap:spacing.sm},
  mainB:{backgroundColor:colors.gold.muted,paddingHorizontal:spacing.sm,paddingVertical:1,borderRadius:radii.full,borderWidth:1,borderColor:colors.gold.dim},
  mainT:{fontSize:8,fontWeight:'800',color:colors.gold.primary,letterSpacing:1},
  aboutCard:{backgroundColor:colors.bg.secondary,borderRadius:radii.lg,borderWidth:1,borderColor:colors.border.default,padding:spacing.xl,gap:spacing.sm,alignItems:'center'},
  aboutName:{...typography.subheading,color:colors.gold.primary},
  aboutVersion:{...typography.caption,color:colors.text.tertiary},
  aboutCopy:{fontSize:10,color:colors.text.tertiary,textAlign:'center',lineHeight:16},
});

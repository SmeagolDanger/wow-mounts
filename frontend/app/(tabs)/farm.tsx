import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, RefreshControl, TextInput, Modal, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../theme';
import { Card, FarmTaskItem } from '../../components';
import api, { FarmTask } from '../../services/api';

export default function FarmScreen() {
  const [tasks,setTasks]=useState<FarmTask[]>([]);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [showAdd,setShowAdd]=useState(false);
  const [cd,setCd]=useState('');
  const [nTitle,setNTitle]=useState('');
  const [nSrc,setNSrc]=useState('');
  const [nZone,setNZone]=useState('');
  const [nReset,setNReset]=useState<'daily'|'weekly'|'none'>('daily');

  const load=useCallback(async()=>{try{setTasks((await api.getFarmTasks()).tasks);}catch{}finally{setLoading(false);}},[]);
  const onRefresh=useCallback(async()=>{setRefreshing(true);await load();setRefreshing(false);},[load]);
  useEffect(()=>{load();},[load]);
  useFocusEffect(useCallback(()=>{load();},[load]));

  useEffect(()=>{const t=setInterval(()=>{const n=new Date(),nx=new Date(n);nx.setUTCHours(15,0,0,0);if(n>=nx)nx.setUTCDate(nx.getUTCDate()+1);const d=nx.getTime()-n.getTime();setCd(`${Math.floor(d/3600000)}h ${Math.floor((d%3600000)/60000)}m ${Math.floor((d%60000)/1000)}s`);},1000);return()=>clearInterval(t);},[]);

  const toggle=async(id:number)=>{try{const r=await api.toggleFarmTask(id);setTasks(p=>p.map(t=>t.id===id?{...t,completed:r.completed}:t));}catch{}};
  const del=(id:number)=>Alert.alert('Delete','Delete this task?',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:async()=>{try{await api.deleteFarmTask(id);setTasks(p=>p.filter(t=>t.id!==id));}catch{}}}]);
  const add=async()=>{if(!nTitle.trim())return;try{const r=await api.createFarmTask({title:nTitle.trim(),source_type:nSrc.trim()||undefined,zone_name:nZone.trim()||undefined,reset_type:nReset});setTasks(p=>[...p,{id:r.id,title:nTitle.trim(),source_type:nSrc.trim()||undefined,zone_name:nZone.trim()||undefined,reset_type:nReset,completed:false,sort_order:p.length}]);setNTitle('');setNSrc('');setNZone('');setNReset('daily');setShowAdd(false);}catch{}};

  const groups=useMemo(()=>[
    {title:'Daily',key:'daily',icon:'sunny' as const,data:tasks.filter(t=>t.reset_type==='daily')},
    {title:'Weekly',key:'weekly',icon:'calendar' as const,data:tasks.filter(t=>t.reset_type==='weekly')},
    {title:'One-time',key:'none',icon:'infinite' as const,data:tasks.filter(t=>t.reset_type==='none')},
  ].filter(g=>g.data.length>0),[tasks]);

  const dD=tasks.filter(t=>t.reset_type==='daily'&&t.completed).length,dT=tasks.filter(t=>t.reset_type==='daily').length;
  const wD=tasks.filter(t=>t.reset_type==='weekly'&&t.completed).length,wT=tasks.filter(t=>t.reset_type==='weekly').length;

  return (
    <SafeAreaView style={z.safe} edges={['top']}>
      <FlatList data={groups} keyExtractor={i=>i.key} contentContainerStyle={z.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold.primary} progressBackgroundColor={colors.bg.secondary}/>}
        ListHeaderComponent={
          <View style={z.hdr}>
            <View style={z.tRow}><Text style={z.title}>Daily Farm</Text><Pressable onPress={()=>setShowAdd(true)} style={z.addBtn}><Ionicons name="add" size={18} color={colors.bg.primary}/></Pressable></View>
            <Card variant="arcane">
              <View style={z.cdRow}>
                <View><Text style={z.cdL}>DAILY RESET</Text><Text style={z.cdV}>{cd}</Text></View>
                <View style={z.cdS}>
                  <View style={z.sb}><Text style={z.sv}>{dD}/{dT}</Text><Text style={z.sl}>Daily</Text></View>
                  <View style={z.sb}><Text style={z.sv}>{wD}/{wT}</Text><Text style={z.sl}>Weekly</Text></View>
                </View>
              </View>
            </Card>
          </View>
        }
        renderItem={({item:g})=>(
          <View style={z.grp}>
            <View style={z.grpH}><Ionicons name={g.icon} size={14} color={colors.text.tertiary}/><Text style={z.grpT}>{g.title}</Text><Text style={z.grpC}>{g.data.filter(t=>t.completed).length}/{g.data.length}</Text></View>
            <View style={z.grpL}>{g.data.map(t=><FarmTaskItem key={t.id} title={t.title} sourceType={t.source_type} zoneName={t.zone_name} resetType={t.reset_type} completed={t.completed} onToggle={()=>toggle(t.id)} onDelete={()=>del(t.id)}/>)}</View>
          </View>
        )}
        ListEmptyComponent={!loading?<View style={z.empty}><Ionicons name="checkbox-outline" size={40} color={colors.text.tertiary}/><Text style={z.emptyT}>No farm tasks yet</Text><Text style={z.emptyS}>Tap + or add from mount details</Text></View>:null}
      />
      <Modal visible={showAdd} animationType="slide" transparent onRequestClose={()=>setShowAdd(false)}>
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={z.mo}>
          <Pressable style={z.moBd} onPress={()=>setShowAdd(false)}/>
          <View style={z.moC}>
            <View style={z.moH}/><Text style={z.moT}>Add Farm Task</Text>
            <View style={z.f}><Text style={z.fl}>TASK NAME</Text><TextInput style={z.fi} value={nTitle} onChangeText={setNTitle} placeholder="e.g. Sha of Anger" placeholderTextColor={colors.text.tertiary} autoFocus/></View>
            <View style={z.f}><Text style={z.fl}>SOURCE</Text><TextInput style={z.fi} value={nSrc} onChangeText={setNSrc} placeholder="raid, dungeon, world_boss" placeholderTextColor={colors.text.tertiary}/></View>
            <View style={z.f}><Text style={z.fl}>ZONE</Text><TextInput style={z.fi} value={nZone} onChangeText={setNZone} placeholder="e.g. Kun-Lai Summit" placeholderTextColor={colors.text.tertiary}/></View>
            <View style={z.f}><Text style={z.fl}>RESET</Text><View style={z.rr}>{(['daily','weekly','none']as const).map(r=><Pressable key={r} onPress={()=>setNReset(r)} style={[z.ro,nReset===r&&z.roA]}><Text style={[z.roT,nReset===r&&z.roTA]}>{r==='none'?'One-time':r[0].toUpperCase()+r.slice(1)}</Text></Pressable>)}</View></View>
            <Pressable onPress={add} style={[z.subBtn,!nTitle.trim()&&z.subBtnD]} disabled={!nTitle.trim()}><Ionicons name="add-circle" size={18} color={colors.bg.primary}/><Text style={z.subBtnT}>Add Task</Text></Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const z=StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.bg.primary},
  list:{paddingHorizontal:spacing.lg,paddingBottom:100},
  hdr:{gap:spacing.md,paddingTop:spacing.md,paddingBottom:spacing.sm},
  tRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  title:{...typography.display,color:colors.arcane.light},
  addBtn:{width:36,height:36,borderRadius:radii.full,backgroundColor:colors.gold.primary,alignItems:'center',justifyContent:'center'},
  cdRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  cdL:{...typography.label,color:colors.arcane.light,marginBottom:spacing.xs},
  cdV:{fontSize:20,fontWeight:'700',color:colors.text.primary,fontVariant:['tabular-nums']},
  cdS:{flexDirection:'row',gap:spacing.xl},
  sb:{alignItems:'center',gap:2},
  sv:{fontSize:16,fontWeight:'700',color:colors.text.primary},
  sl:{...typography.caption,fontSize:9},
  grp:{marginBottom:spacing.xl},
  grpH:{flexDirection:'row',alignItems:'center',gap:spacing.sm,marginBottom:spacing.sm},
  grpT:{...typography.subheading,flex:1,fontSize:14},
  grpC:{...typography.caption,color:colors.text.tertiary},
  grpL:{gap:spacing.sm},
  empty:{alignItems:'center',paddingVertical:80,gap:spacing.md},
  emptyT:{...typography.heading,color:colors.text.secondary},
  emptyS:{...typography.caption,color:colors.text.tertiary},
  mo:{flex:1,justifyContent:'flex-end'},
  moBd:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,0.6)'},
  moC:{backgroundColor:colors.bg.secondary,borderTopLeftRadius:radii.xl,borderTopRightRadius:radii.xl,padding:spacing.xl,paddingBottom:40,gap:spacing.md},
  moH:{width:32,height:4,borderRadius:2,backgroundColor:colors.border.subtle,alignSelf:'center',marginBottom:spacing.sm},
  moT:{...typography.heading,color:colors.gold.primary},
  f:{gap:spacing.sm},
  fl:{...typography.label},
  fi:{backgroundColor:colors.bg.input,borderRadius:radii.md,borderWidth:1,borderColor:colors.border.default,paddingHorizontal:spacing.md,paddingVertical:spacing.md,fontSize:14,color:colors.text.primary},
  rr:{flexDirection:'row',gap:spacing.sm},
  ro:{flex:1,alignItems:'center',paddingVertical:spacing.md,borderRadius:radii.md,backgroundColor:colors.bg.tertiary,borderWidth:1,borderColor:colors.border.default},
  roA:{borderColor:colors.gold.dim,backgroundColor:colors.gold.muted},
  roT:{fontSize:11,fontWeight:'600',color:colors.text.secondary},
  roTA:{color:colors.gold.primary},
  subBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:spacing.sm,backgroundColor:colors.gold.primary,borderRadius:radii.md,paddingVertical:14,marginTop:spacing.sm},
  subBtnD:{opacity:0.4},
  subBtnT:{fontSize:15,fontWeight:'700',color:colors.bg.primary},
});

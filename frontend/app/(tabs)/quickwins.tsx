import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '../../theme';
import { Card, MountDetailModal } from '../../components';
import api, { MountSummary } from '../../services/api';

const DIFF: Record<string,{rank:number;label:string;icon:string;color:string;tip:string}> = {
  vendor:{rank:1,label:'Vendor',icon:'cart-outline',color:'#1EFF00',tip:'Just buy it!'},
  quest:{rank:2,label:'Quest',icon:'flag-outline',color:'#FFD100',tip:'Complete a questline'},
  achievement:{rank:3,label:'Achievement',icon:'trophy-outline',color:'#E8A931',tip:'Check achievement progress'},
  reputation:{rank:4,label:'Reputation',icon:'people-outline',color:'#1EFF00',tip:'Grind it out over time'},
  promotion:{rank:5,label:'Promotion',icon:'gift-outline',color:'#00CCFF',tip:'Check store or promos'},
  drop:{rank:6,label:'World Drop',icon:'globe-outline',color:'#9D9D9D',tip:'Rare chance from mobs'},
  dungeon:{rank:7,label:'Dungeon',icon:'key-outline',color:'#0070DD',tip:'Farm the dungeon boss'},
  raid:{rank:8,label:'Raid',icon:'skull-outline',color:'#A335EE',tip:'Weekly lockout farm'},
  world_boss:{rank:9,label:'World Boss',icon:'flame-outline',color:'#FF8000',tip:'Weekly kill — low drop rate'},
};

interface QWGroup { source:string; info:typeof DIFF[string]; mounts:MountSummary[]; }

export default function QuickWinsScreen() {
  const [mounts,setMounts] = useState<MountSummary[]>([]);
  const [collectedIds] = useState<Set<number>>(new Set());
  const [loading,setLoading] = useState(true);
  const [refreshing,setRefreshing] = useState(false);
  const [selected,setSelected] = useState<number|null>(null);
  const [expanded,setExpanded] = useState<string|null>(null);

  const load = useCallback(async()=>{try{setMounts((await api.getMounts()).mounts);}catch{}finally{setLoading(false);}},[]);
  const onRefresh = useCallback(async()=>{setRefreshing(true);await load();setRefreshing(false);},[load]);
  useEffect(()=>{load();},[load]);

  const groups = useMemo(()=>{
    const missing = mounts.filter(m=>!collectedIds.has(m.id)&&m.source_type);
    const map = new Map<string,MountSummary[]>();
    for(const m of missing){const s=m.source_type||'unknown';if(!map.has(s))map.set(s,[]);map.get(s)!.push(m);}
    const r:QWGroup[]=[];
    for(const[source,list]of map.entries()){const info=DIFF[source];if(info)r.push({source,info,mounts:list});}
    return r.sort((a,b)=>a.info.rank-b.info.rank);
  },[mounts,collectedIds]);

  const totalMissing = mounts.filter(m=>!collectedIds.has(m.id)).length;
  const easyCount = groups.filter(g=>g.info.rank<=3).reduce((s,g)=>s+g.mounts.length,0);

  const addToFarm = useCallback(async(m:{id:number;name:string;source_type?:string})=>{
    try{await api.createFarmTask({title:m.name,mount_id:m.id,source_type:m.source_type,reset_type:'weekly'});setSelected(null);}catch{}
  },[]);

  return (
    <SafeAreaView style={z.safe} edges={['top']}>
      <FlatList data={groups} keyExtractor={i=>i.source} contentContainerStyle={z.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold.primary} progressBackgroundColor={colors.bg.secondary}/>}
        ListHeaderComponent={
          <View style={z.hdr}>
            <Text style={z.title}>Quick Wins</Text>
            <Text style={z.sub}>Easiest missing mounts to collect first</Text>
            <Card variant="gold" style={z.sc}>
              <View style={z.sr}>
                <View style={z.st}><Ionicons name="flash" size={18} color={colors.gold.primary}/><Text style={z.sn}>{easyCount}</Text><Text style={z.sl}>EASY</Text></View>
                <View style={z.sd}/>
                <View style={z.st}><Ionicons name="close-circle-outline" size={18} color={colors.fire.primary}/><Text style={z.sn}>{totalMissing}</Text><Text style={z.sl}>MISSING</Text></View>
                <View style={z.sd}/>
                <View style={z.st}><Ionicons name="layers-outline" size={18} color={colors.frost.primary}/><Text style={z.sn}>{groups.length}</Text><Text style={z.sl}>SOURCES</Text></View>
              </View>
            </Card>
          </View>
        }
        renderItem={({item:g})=>{
          const exp=expanded===g.source;
          const shown=exp?g.mounts:g.mounts.slice(0,5);
          return (
            <View style={z.group}>
              <Pressable onPress={()=>setExpanded(exp?null:g.source)} style={z.gh}>
                <View style={[z.gi,{backgroundColor:g.info.color+'18'}]}><Ionicons name={g.info.icon as any} size={16} color={g.info.color}/></View>
                <View style={z.gInfo}><Text style={z.gn}>{g.info.label}</Text><Text style={z.gt}>{g.info.tip}</Text></View>
                <Text style={[z.gc,{color:g.info.color}]}>{g.mounts.length}</Text>
                <Ionicons name={exp?'chevron-up':'chevron-down'} size={16} color={colors.text.tertiary}/>
              </Pressable>
              <View style={z.ml}>
                {shown.map(m=>(
                  <Pressable key={m.id} onPress={()=>setSelected(m.id)} style={({pressed})=>[z.mr,pressed&&z.mrP]}>
                    {m.icon_url?<Image source={{uri:m.icon_url}} style={z.mt}/>:<View style={[z.mt,z.mtPh]}><Ionicons name="sparkles-outline" size={12} color={colors.gold.dim}/></View>}
                    <Text style={z.mn} numberOfLines={1}>{m.name}</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.text.tertiary}/>
                  </Pressable>
                ))}
                {!exp&&g.mounts.length>5&&<Pressable onPress={()=>setExpanded(g.source)} style={z.more}><Text style={z.moreT}>Show all {g.mounts.length}</Text></Pressable>}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={!loading?<View style={z.empty}><Ionicons name="sparkles" size={40} color={colors.gold.dim}/><Text style={z.emptyT}>No source data yet</Text><Text style={z.emptyS}>Mount enrichment is running in the background</Text></View>:null}
      />
      <MountDetailModal mountId={selected} visible={selected!==null} onClose={()=>setSelected(null)} onAddToFarm={addToFarm}/>
    </SafeAreaView>
  );
}

const z = StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.bg.primary},
  list:{paddingHorizontal:spacing.lg,paddingBottom:100},
  hdr:{paddingTop:spacing.md,paddingBottom:spacing.lg,gap:spacing.sm},
  title:{...typography.display,color:colors.gold.bright},
  sub:{...typography.caption,color:colors.text.secondary},
  sc:{padding:spacing.lg},
  sr:{flexDirection:'row',alignItems:'center',justifyContent:'space-around'},
  st:{alignItems:'center',gap:4},
  sn:{fontSize:18,fontWeight:'700',color:colors.text.primary},
  sl:{...typography.label,fontSize:9},
  sd:{width:1,height:24,backgroundColor:colors.border.default},
  group:{marginBottom:spacing.lg},
  gh:{flexDirection:'row',alignItems:'center',gap:spacing.md,paddingVertical:spacing.sm},
  gi:{width:32,height:32,borderRadius:radii.md,alignItems:'center',justifyContent:'center'},
  gInfo:{flex:1,gap:1},
  gn:{...typography.subheading,fontSize:14},
  gt:{fontSize:10,color:colors.text.tertiary},
  gc:{fontSize:15,fontWeight:'700',marginRight:spacing.sm},
  ml:{gap:spacing.xs,marginLeft:44},
  mr:{flexDirection:'row',alignItems:'center',gap:spacing.sm,backgroundColor:colors.bg.secondary,borderRadius:radii.sm,padding:spacing.sm,borderWidth:1,borderColor:colors.border.default},
  mrP:{backgroundColor:colors.bg.tertiary},
  mt:{width:28,height:28,borderRadius:radii.sm,backgroundColor:colors.bg.tertiary},
  mtPh:{alignItems:'center',justifyContent:'center'},
  mn:{flex:1,fontSize:12,color:colors.text.primary},
  more:{paddingVertical:spacing.sm,alignItems:'center'},
  moreT:{fontSize:11,color:colors.gold.primary,fontWeight:'600'},
  empty:{alignItems:'center',paddingVertical:80,gap:spacing.md},
  emptyT:{...typography.heading,color:colors.text.secondary},
  emptyS:{...typography.caption,color:colors.text.tertiary,textAlign:'center'},
});

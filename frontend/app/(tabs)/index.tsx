import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '../../theme';
import { SearchBar, MountCard, ProgressRing, MountDetailModal, Card } from '../../components';
import api, { MountSummary } from '../../services/api';

const { width: SW } = Dimensions.get('window');
const GAP = spacing.sm;
const PAD = spacing.lg;
const COL = (SW - PAD * 2 - GAP * 2) / 3;

type Filter = 'all'|'collected'|'missing';

export default function CollectionScreen() {
  const [mounts, setMounts] = useState<MountSummary[]>([]);
  const [collectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [srcFilter, setSrcFilter] = useState<string|null>(null);
  const [selected, setSelected] = useState<number|null>(null);
  const [iconCache, setIconCache] = useState<Record<number,string|null>>({});
  const iconQ = useRef<Set<number>>(new Set());
  const iconT = useRef<ReturnType<typeof setTimeout>|null>(null);

  const fetchIcons = useCallback(async (ids:number[]) => {
    try { const d=await api.getMountIcons(ids); setIconCache(p=>{const n={...p};for(const[k,v]of Object.entries(d.icons))n[Number(k)]=v;return n;}); } catch{}
  },[]);

  const queueIcons = useCallback((ids:number[]) => {
    for(const id of ids)if(iconCache[id]===undefined)iconQ.current.add(id);
    if(iconT.current||iconQ.current.size===0)return;
    iconT.current=setTimeout(()=>{const b=Array.from(iconQ.current).slice(0,20);iconQ.current=new Set(Array.from(iconQ.current).slice(20));iconT.current=null;if(b.length)fetchIcons(b);},250);
  },[iconCache,fetchIcons]);

  const load = useCallback(async()=>{
    try{const d=await api.getMounts();setMounts(d.mounts);const seed:Record<number,string|null>={};for(const m of d.mounts)if(m.icon_url)seed[m.id]=m.icon_url;setIconCache(p=>({...p,...seed}));}catch(e){console.error('Load mounts:',e);}finally{setLoading(false);}
  },[]);

  const onRefresh = useCallback(async()=>{setRefreshing(true);await load();setRefreshing(false);},[load]);
  useEffect(()=>{load();},[load]);

  const filtered = useMemo(()=>{
    let r=mounts;
    if(search.trim()){const q=search.toLowerCase();r=r.filter(m=>m.name.toLowerCase().includes(q));}
    if(filter==='collected')r=r.filter(m=>collectedIds.has(m.id));
    else if(filter==='missing')r=r.filter(m=>!collectedIds.has(m.id));
    if(srcFilter)r=r.filter(m=>m.source_type===srcFilter);
    return r;
  },[mounts,search,filter,srcFilter,collectedIds]);

  const srcTypes = useMemo(()=>{const s=new Set<string>();mounts.forEach(m=>m.source_type&&s.add(m.source_type));return Array.from(s).sort();},[mounts]);

  const addToFarm = useCallback(async(m:{id:number;name:string;source_type?:string})=>{
    try{await api.createFarmTask({title:m.name,mount_id:m.id,source_type:m.source_type,reset_type:'weekly'});setSelected(null);}catch{}
  },[]);

  const onView = useRef(({viewableItems}:any)=>{const ids=viewableItems.map((v:any)=>v.item.id).filter((id:number)=>iconCache[id]===undefined);if(ids.length)queueIcons(ids);}).current;
  const viewCfg = useRef({itemVisiblePercentThreshold:20}).current;

  const renderMount = useCallback(({item}:{item:MountSummary})=>{
    const icon=iconCache[item.id]||item.icon_url||null;
    return <View style={{width:COL}}><MountCard id={item.id} name={item.name} iconUrl={icon} sourceType={item.source_type} collected={collectedIds.has(item.id)} onPress={()=>setSelected(item.id)}/></View>;
  },[collectedIds,iconCache]);

  if(loading) return <SafeAreaView style={z.loadC}><ActivityIndicator size="large" color={colors.gold.primary}/><Text style={z.loadT}>Loading mounts...</Text></SafeAreaView>;

  return (
    <SafeAreaView style={z.safe} edges={['top']}>
      <FlatList data={filtered} renderItem={renderMount} keyExtractor={i=>String(i.id)} numColumns={3} columnWrapperStyle={z.row} contentContainerStyle={z.list}
        onViewableItemsChanged={onView} viewabilityConfig={viewCfg}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold.primary} progressBackgroundColor={colors.bg.secondary}/>}
        ListHeaderComponent={
          <View style={z.hdr}>
            <Text style={z.title}>Mount Collection</Text>
            <Card variant="gold" style={z.progCard}>
              <View style={z.progRow}>
                <ProgressRing collected={collectedIds.size} total={mounts.length} size={80}/>
                <View style={z.progInfo}>
                  <Text style={z.progLabel}>COLLECTED</Text>
                  <Text style={z.progVal}>{collectedIds.size}<Text style={z.progTotal}> / {mounts.length}</Text></Text>
                  <Text style={z.progHint}>{mounts.length-collectedIds.size} remaining</Text>
                </View>
              </View>
            </Card>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search mounts..."/>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={z.chips}>
              {(['all','collected','missing'] as Filter[]).map(f=><Pressable key={f} onPress={()=>setFilter(f)} style={[z.chip,filter===f&&z.chipA]}><Text style={[z.chipT,filter===f&&z.chipTA]}>{f==='all'?'All':f==='collected'?'Collected':'Missing'}</Text></Pressable>)}
              <View style={z.chipDiv}/>
              {srcTypes.map(s=><Pressable key={s} onPress={()=>setSrcFilter(srcFilter===s?null:s)} style={[z.chip,srcFilter===s&&z.chipA]}><Text style={[z.chipT,srcFilter===s&&z.chipTA]}>{s}</Text></Pressable>)}
            </ScrollView>
            <Text style={z.cnt}>{filtered.length} mount{filtered.length!==1?'s':''}</Text>
          </View>
        }
        ListEmptyComponent={<View style={z.empty}><Ionicons name="search-outline" size={40} color={colors.text.tertiary}/><Text style={z.emptyT}>No mounts found</Text></View>}
      />
      <MountDetailModal mountId={selected} visible={selected!==null} onClose={()=>setSelected(null)} onAddToFarm={addToFarm}/>
    </SafeAreaView>
  );
}

const z = StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.bg.primary},
  loadC:{flex:1,backgroundColor:colors.bg.primary,alignItems:'center',justifyContent:'center',gap:spacing.lg},
  loadT:{...typography.body,color:colors.text.secondary},
  list:{paddingHorizontal:PAD,paddingBottom:100},
  hdr:{gap:spacing.md,paddingTop:spacing.md,paddingBottom:spacing.sm},
  title:{...typography.display,color:colors.gold.primary},
  progCard:{padding:spacing.lg},
  progRow:{flexDirection:'row',alignItems:'center',gap:spacing.xl},
  progInfo:{flex:1,gap:spacing.xs},
  progLabel:{...typography.label,color:colors.gold.dim},
  progVal:{fontSize:24,fontWeight:'700',color:colors.text.primary},
  progTotal:{fontSize:16,fontWeight:'400',color:colors.text.tertiary},
  progHint:{...typography.caption,color:colors.text.secondary},
  chips:{flexDirection:'row',gap:spacing.sm,paddingVertical:spacing.xs},
  chip:{paddingHorizontal:spacing.md,paddingVertical:6,borderRadius:radii.full,backgroundColor:colors.bg.tertiary,borderWidth:1,borderColor:colors.border.default},
  chipA:{backgroundColor:colors.gold.muted,borderColor:colors.gold.dim},
  chipT:{fontSize:11,color:colors.text.secondary,fontWeight:'600',textTransform:'capitalize'},
  chipTA:{color:colors.gold.primary},
  chipDiv:{width:1,height:20,backgroundColor:colors.border.default,alignSelf:'center'},
  cnt:{...typography.caption,color:colors.text.tertiary},
  row:{gap:GAP,marginBottom:GAP},
  empty:{alignItems:'center',paddingVertical:80,gap:spacing.md},
  emptyT:{...typography.heading,color:colors.text.secondary},
});

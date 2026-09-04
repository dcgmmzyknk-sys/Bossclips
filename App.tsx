import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewToken,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { VideoView, useVideoPlayer } from 'expo-video';
import { clips as demoClips } from './src/data';
import { AppState, initialState, loadState, saveState } from './src/storage';
import { cloudEnabled, supabase } from './src/lib/supabase';
import {
  adminAddClip,
  awardWatch,
  deleteMyAccount,
  getApprovedClips,
  getProfile,
  getUserActions,
  pickAndUploadVideo,
  reportClip,
  signIn,
  signOut,
  signUp,
  toggleLike,
  toggleSave,
} from './src/services/cloud';
import { Category, Clip, Profile } from './src/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const CATEGORIES = ['All', 'Boss Mode', 'Motivation', 'Funny', 'Chill'] as const;
type FeedCategory = (typeof CATEGORIES)[number];
type Tab = 'feed' | 'wallet' | 'upload' | 'saved' | 'profile';

function Button({ title, onPress, secondary = false, disabled = false }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.button, secondary && styles.buttonSecondary, disabled && { opacity: 0.5 }]}>
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

function Field({ value, onChangeText, placeholder, secureTextEntry = false, multiline = false }: any) {
  return <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#71717A" secureTextEntry={secureTextEntry} multiline={multiline} style={[styles.input, multiline && { height: 90, textAlignVertical: 'top' }]} />;
}

function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || password.length < 6 || (mode === 'signup' && username.trim().length < 3)) {
      Alert.alert('Check your details', 'Use a valid email, a 6+ character password, and a 3+ character username.');
      return;
    }
    try {
      setBusy(true);
      if (mode === 'signin') await signIn(email.trim(), password);
      else {
        const data = await signUp(email.trim(), password, username.trim().toLowerCase());
        if (!data.session) Alert.alert('Check your email', 'Supabase email confirmation is enabled. Confirm your email, then sign in.');
      }
    } catch (e: any) {
      Alert.alert('Account error', e.message ?? 'Please try again.');
    } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={styles.auth}>
      <View style={styles.logoCircle}><Text style={styles.logoLetter}>B</Text></View>
      <Text style={styles.authTitle}>BOSSCLIPS</Text>
      <Text style={styles.muted}>Watch. Create. Level up.</Text>
      {mode === 'signup' && <Field value={username} onChangeText={setUsername} placeholder="Username" />}
      <Field value={email} onChangeText={setEmail} placeholder="Email" />
      <Field value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
      <Button title={busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'} onPress={submit} disabled={busy} />
      <Button secondary title={mode === 'signin' ? 'Create a new account' : 'I already have an account'} onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')} />
    </SafeAreaView>
  );
}

function ClipCard({ clip, active, liked, saved, onLike, onSave, onShare, onReport }: any) {
  const player = useVideoPlayer(clip.url, p => { p.loop = true; p.muted = false; });
  useEffect(() => { if (active) player.play(); else player.pause(); }, [active, player]);
  return (
    <View style={styles.clipPage}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      <View style={styles.scrim} />
      <View style={styles.clipCopy}>
        <Text style={styles.creator}>{clip.creator}</Text>
        <Text style={styles.caption}>{clip.caption}</Text>
        <View style={styles.categoryPill}><Text style={styles.categoryText}>{clip.category}</Text></View>
      </View>
      <View style={styles.actions}>
        <Pressable style={styles.action} onPress={onLike}><Text style={styles.actionIcon}>{liked ? '❤️' : '🤍'}</Text><Text style={styles.actionLabel}>Like</Text></Pressable>
        <Pressable style={styles.action} onPress={onSave}><Text style={styles.actionIcon}>{saved ? '🔖' : '🏷️'}</Text><Text style={styles.actionLabel}>Save</Text></Pressable>
        <Pressable style={styles.action} onPress={onShare}><Text style={styles.actionIcon}>↗️</Text><Text style={styles.actionLabel}>Share</Text></Pressable>
        <Pressable style={styles.action} onPress={onReport}><Text style={styles.actionIcon}>⚑</Text><Text style={styles.actionLabel}>Report</Text></Pressable>
      </View>
    </View>
  );
}

function Feed({ clips, state, setState, userId, cloud }: { clips: Clip[]; state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; userId?: string; cloud: boolean }) {
  const [category, setCategory] = useState<FeedCategory>('All');
  const data = useMemo(() => category === 'All' ? clips : clips.filter(c => c.category === category), [clips, category]);
  const [activeId, setActiveId] = useState(data[0]?.id ?? '');
  useEffect(() => { if (data.length && !data.some(x => x.id === activeId)) setActiveId(data[0].id); }, [data, activeId]);

  const seenThisSession = useRef(new Set<string>());
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const id = viewableItems[0]?.item?.id as string | undefined;
    if (!id) return;
    setActiveId(id);
    if (seenThisSession.current.has(id)) return;
    seenThisSession.current.add(id);
    if (cloud && userId) {
      awardWatch(id).then(balance => setState(p => ({ ...p, coins: balance, watchedIds: p.watchedIds.includes(id) ? p.watchedIds : [...p.watchedIds, id] }))).catch(() => {});
    } else {
      setState(p => p.watchedIds.includes(id) ? p : ({ ...p, watchedIds: [...p.watchedIds, id], coins: p.coins + 5 }));
    }
  }).current;

  const toggleAction = async (key: 'likedIds' | 'savedIds', id: string) => {
    const exists = state[key].includes(id);
    setState(p => ({ ...p, [key]: exists ? p[key].filter(x => x !== id) : [...p[key], id] }));
    if (cloud && userId) {
      try { key === 'likedIds' ? await toggleLike(userId, id, exists) : await toggleSave(userId, id, exists); }
      catch (e: any) { Alert.alert('Sync failed', e.message ?? 'Try again.'); }
    }
  };

  return (
    <View style={styles.feedWrap}>
      <View style={styles.topBar}><Text style={styles.brand}>BOSSCLIPS</Text><View style={styles.balancePill}><Text style={styles.balanceText}>🪙 {state.coins}</Text></View></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroller} contentContainerStyle={styles.chips}>
        {CATEGORIES.map(item => <Pressable key={item} onPress={() => setCategory(item)} style={[styles.chip, category === item && styles.chipActive]}><Text style={[styles.chipText, category === item && styles.chipTextActive]}>{item}</Text></Pressable>)}
      </ScrollView>
      {data.length === 0 ? <View style={styles.center}><Text style={styles.empty}>No approved clips yet.</Text></View> : (
        <FlatList data={data} keyExtractor={x => x.id} pagingEnabled showsVerticalScrollIndicator={false} viewabilityConfig={{ itemVisiblePercentThreshold: 70 }} onViewableItemsChanged={onViewableItemsChanged}
          renderItem={({ item }) => <ClipCard clip={item} active={activeId === item.id} liked={state.likedIds.includes(item.id)} saved={state.savedIds.includes(item.id)} onLike={() => toggleAction('likedIds', item.id)} onSave={() => toggleAction('savedIds', item.id)} onShare={() => Share.share({ message: `Watch ${item.title} on Bossclips 👑` })} onReport={() => cloud ? reportClip(item.id, 'User reported from feed').then(() => Alert.alert('Reported', 'Thanks. We will review this clip.')).catch((e:any) => Alert.alert('Could not report', e.message)) : Alert.alert('Demo mode', 'Reporting activates after Supabase is connected.')} />}
        />
      )}
    </View>
  );
}

function Wallet({ state }: { state: AppState }) {
  return <SafeAreaView style={styles.screen}><Text style={styles.title}>Boss Wallet</Text><View style={styles.walletHero}><Text style={styles.walletLabel}>Your balance</Text><Text style={styles.walletAmount}>🪙 {state.coins}</Text><Text style={styles.walletFine}>Boss Coins are virtual loyalty points with no cash value. They cannot be withdrawn, transferred, or exchanged for money.</Text></View><Text style={styles.sectionTitle}>Earning rule</Text><View style={styles.card}><Text style={styles.cardTitle}>First watch</Text><Text style={styles.cardBody}>+5 Boss Coins once per approved clip. In cloud mode the server enforces this rule.</Text></View><View style={styles.card}><Text style={styles.cardTitle}>Future perks</Text><Text style={styles.cardBody}>Use coins for badges, profile themes and cosmetic unlocks.</Text></View></SafeAreaView>;
}

function Saved({ clips, state }: { clips: Clip[]; state: AppState }) {
  const saved = clips.filter(c => state.savedIds.includes(c.id));
  return <SafeAreaView style={styles.screen}><Text style={styles.title}>Saved Clips</Text>{saved.length === 0 ? <Text style={styles.empty}>Save clips from your feed and they’ll appear here.</Text> : saved.map(c => <View key={c.id} style={styles.card}><Text style={styles.cardTitle}>{c.title}</Text><Text style={styles.cardBody}>{c.creator} · {c.category}</Text></View>)}</SafeAreaView>;
}

function UploadStudio({ userId, profile, onUploaded }: { userId?: string; profile?: Profile | null; onUploaded: () => void }) {
  const [title, setTitle] = useState(''); const [caption, setCaption] = useState(''); const [category, setCategory] = useState<Category>('Boss Mode');
  const [creator, setCreator] = useState('@bossclips'); const [url, setUrl] = useState(''); const [busy, setBusy] = useState(false);

  const submitVideo = async () => {
    if (!userId) return Alert.alert('Cloud required', 'Connect Supabase and sign in to upload.');
    if (!title.trim()) return Alert.alert('Add a title');
    try { setBusy(true); const uploaded = await pickAndUploadVideo(userId, { title: title.trim(), caption: caption.trim(), category }); if (uploaded) Alert.alert('Submitted', 'Your clip was uploaded and is pending moderation.'); }
    catch (e: any) { Alert.alert('Upload failed', e.message ?? 'Try again.'); } finally { setBusy(false); }
  };

  const addByUrl = async () => {
    if (profile?.role !== 'admin') return;
    if (!title.trim() || !url.startsWith('http')) return Alert.alert('Missing info', 'Add a title and direct https video URL.');
    try { setBusy(true); await adminAddClip({ title: title.trim(), creator: creator.trim() || '@bossclips', caption: caption.trim(), category, video_url: url.trim() }); setUrl(''); setTitle(''); setCaption(''); await onUploaded(); Alert.alert('Added', 'The approved clip is live.'); }
    catch (e:any) { Alert.alert('Could not add clip', e.message); } finally { setBusy(false); }
  };

  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={{ paddingBottom: 40 }}><Text style={styles.title}>Creator Studio</Text><Text style={styles.muted}>Upload videos for moderation. Admins can also publish a direct video URL.</Text><Field value={title} onChangeText={setTitle} placeholder="Clip title" /><Field value={caption} onChangeText={setCaption} placeholder="Caption" multiline /><Text style={styles.sectionTitle}>Category</Text><View style={styles.wrapRow}>{CATEGORIES.slice(1).map(c => <Pressable key={c} onPress={() => setCategory(c as Category)} style={[styles.chip, category === c && styles.chipActive]}><Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text></Pressable>)}</View><Button title={busy ? 'Uploading…' : 'Choose video & submit'} onPress={submitVideo} disabled={busy || !cloudEnabled} />{!cloudEnabled && <Text style={styles.warning}>Connect Supabase first. See SETUP_SUPABASE.md.</Text>}
  {profile?.role === 'admin' && <View style={styles.adminBox}><Text style={styles.sectionTitle}>Admin: publish by URL</Text><Field value={creator} onChangeText={setCreator} placeholder="@creator" /><Field value={url} onChangeText={setUrl} placeholder="https://...mp4" /><Button title="Publish approved clip" onPress={addByUrl} disabled={busy} /></View>}</ScrollView></SafeAreaView>;
}

function ProfileScreen({ profile, state, onLogout }: { profile?: Profile | null; state: AppState; onLogout: () => void }) {
  const removeAccount = () => Alert.alert('Delete account?', 'This permanently deletes your Bossclips account and associated app data. This cannot be undone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete permanently', style: 'destructive', onPress: () => deleteMyAccount().catch((e:any) => Alert.alert('Delete failed', e.message)) }]);
  return <SafeAreaView style={styles.screen}><View style={styles.avatar}><Text style={styles.avatarText}>{(profile?.username ?? 'B').slice(0,1).toUpperCase()}</Text></View><Text style={[styles.title,{textAlign:'center'}]}>{profile?.display_name ?? 'Boss Member'}</Text><Text style={styles.handle}>@{profile?.username ?? 'demo'}</Text><Text style={styles.role}>{profile?.role ?? 'demo mode'}</Text><View style={styles.stats}><View><Text style={styles.statNumber}>{state.likedIds.length}</Text><Text style={styles.statLabel}>Likes</Text></View><View><Text style={styles.statNumber}>{state.savedIds.length}</Text><Text style={styles.statLabel}>Saved</Text></View><View><Text style={styles.statNumber}>{state.coins}</Text><Text style={styles.statLabel}>Coins</Text></View></View>{cloudEnabled ? <><Button title="Sign out" secondary onPress={onLogout} /><Button title="Delete account" secondary onPress={removeAccount} /></> : <View style={styles.card}><Text style={styles.cardTitle}>Demo mode</Text><Text style={styles.cardBody}>Add your Supabase variables to activate accounts and cloud data.</Text></View>}</SafeAreaView>;
}

export default function App() {
  const [tab, setTab] = useState<Tab>('feed'); const [state, setState] = useState<AppState>(initialState); const [clips, setClips] = useState<Clip[]>(demoClips as Clip[]); const [session, setSession] = useState<any>(null); const [profile, setProfile] = useState<Profile | null>(null); const [loading, setLoading] = useState(true);

  const refreshCloud = async (user = session?.user) => {
    if (!cloudEnabled || !user) return;
    const [remoteClips, p, actions] = await Promise.all([getApprovedClips(), getProfile(user.id), getUserActions(user.id)]);
    setClips(remoteClips); setProfile(p); setState(s => ({ ...s, coins: p.coin_balance, likedIds: actions.likedIds, savedIds: actions.savedIds }));
  };

  useEffect(() => {
    loadState().then(setState);
    if (!cloudEnabled || !supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); if (data.session) refreshCloud(data.session.user).catch(e => Alert.alert('Sync error', e.message)); setLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); if (next) refreshCloud(next.user).catch(() => {}); else { setProfile(null); setClips(demoClips as Clip[]); } });
    return () => listener.subscription.unsubscribe();
  }, []);
  useEffect(() => { if (!cloudEnabled) saveState(state); }, [state]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /><Text style={styles.muted}>Loading Bossclips…</Text></View>;
  if (cloudEnabled && !session) return <><StatusBar style="light" /><AuthScreen /></>;

  const userId = session?.user?.id as string | undefined;
  return <View style={styles.root}><StatusBar style="light" /><View style={styles.content}>{tab === 'feed' && <Feed clips={clips} state={state} setState={setState} userId={userId} cloud={cloudEnabled} />}{tab === 'wallet' && <Wallet state={state} />}{tab === 'upload' && <UploadStudio userId={userId} profile={profile} onUploaded={() => refreshCloud()} />}{tab === 'saved' && <Saved clips={clips} state={state} />}{tab === 'profile' && <ProfileScreen profile={profile} state={state} onLogout={() => signOut().catch(e => Alert.alert('Sign out failed', e.message))} />}</View><View style={styles.nav}>{([['feed','▶','Feed'],['wallet','🪙','Wallet'],['upload','＋','Create'],['saved','🔖','Saved'],['profile','👤','Profile']] as const).map(([key,icon,label]) => <Pressable key={key} style={styles.navItem} onPress={() => setTab(key)}><Text style={styles.navIcon}>{icon}</Text><Text style={[styles.navLabel, tab === key && styles.navLabelActive]}>{label}</Text></Pressable>)}</View></View>;
}

const styles = StyleSheet.create({
  root:{flex:1,backgroundColor:'#09090B'}, content:{flex:1}, center:{flex:1,backgroundColor:'#09090B',alignItems:'center',justifyContent:'center',gap:12},
  auth:{flex:1,backgroundColor:'#09090B',padding:24,justifyContent:'center'}, logoCircle:{width:84,height:84,borderRadius:42,backgroundColor:'#FACC15',alignSelf:'center',alignItems:'center',justifyContent:'center'},logoLetter:{fontSize:44,fontWeight:'900',color:'#09090B'},authTitle:{fontSize:36,fontWeight:'900',color:'white',textAlign:'center',marginTop:14,letterSpacing:1},
  muted:{color:'#A1A1AA',fontSize:15,marginBottom:18}, input:{backgroundColor:'#18181B',borderWidth:1,borderColor:'#27272A',borderRadius:14,padding:15,color:'white',fontSize:16,marginTop:12}, button:{backgroundColor:'#FACC15',padding:16,borderRadius:14,marginTop:14,alignItems:'center'},buttonSecondary:{backgroundColor:'#27272A'},buttonText:{fontWeight:'800',color:'#09090B'},
  feedWrap:{flex:1,backgroundColor:'#09090B'}, topBar:{position:'absolute',zIndex:5,top:45,left:16,right:16,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},brand:{color:'white',fontWeight:'900',fontSize:20,letterSpacing:1},balancePill:{backgroundColor:'rgba(9,9,11,.75)',paddingHorizontal:12,paddingVertical:7,borderRadius:20},balanceText:{color:'#FACC15',fontWeight:'800'},
  chipScroller:{position:'absolute',zIndex:5,top:88,left:0,right:0,maxHeight:45},chips:{paddingHorizontal:14,gap:8},chip:{backgroundColor:'rgba(39,39,42,.8)',paddingHorizontal:12,paddingVertical:8,borderRadius:18,marginRight:7},chipActive:{backgroundColor:'#FACC15'},chipText:{color:'#E4E4E7',fontWeight:'700'},chipTextActive:{color:'#09090B'},
  clipPage:{height:SCREEN_HEIGHT-74,justifyContent:'flex-end'},scrim:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,.20)'},clipCopy:{position:'absolute',left:18,right:85,bottom:30},creator:{color:'white',fontSize:17,fontWeight:'900',marginBottom:8},caption:{color:'white',fontSize:15,lineHeight:21},categoryPill:{alignSelf:'flex-start',backgroundColor:'rgba(250,204,21,.9)',borderRadius:12,paddingHorizontal:9,paddingVertical:5,marginTop:9},categoryText:{fontWeight:'800',fontSize:12,color:'#09090B'},actions:{position:'absolute',right:12,bottom:26,gap:18},action:{alignItems:'center',width:58},actionIcon:{fontSize:28},actionLabel:{color:'white',fontSize:11,fontWeight:'700',marginTop:3},
  screen:{flex:1,backgroundColor:'#09090B',padding:20,paddingTop:58},title:{color:'white',fontSize:30,fontWeight:'900',marginBottom:14},sectionTitle:{color:'white',fontSize:18,fontWeight:'850',marginTop:22,marginBottom:8},walletHero:{backgroundColor:'#18181B',padding:22,borderRadius:20,borderWidth:1,borderColor:'#27272A'},walletLabel:{color:'#A1A1AA'},walletAmount:{color:'#FACC15',fontSize:44,fontWeight:'900',marginVertical:8},walletFine:{color:'#A1A1AA',lineHeight:20},card:{backgroundColor:'#18181B',padding:16,borderRadius:14,marginTop:10},cardTitle:{color:'white',fontWeight:'800',fontSize:16},cardBody:{color:'#A1A1AA',marginTop:5,lineHeight:20},empty:{color:'#A1A1AA',fontSize:16},warning:{color:'#FBBF24',marginTop:10},wrapRow:{flexDirection:'row',flexWrap:'wrap',gap:4},adminBox:{marginTop:28,paddingTop:8,borderTopWidth:1,borderTopColor:'#27272A'},
  avatar:{width:88,height:88,borderRadius:44,backgroundColor:'#FACC15',alignSelf:'center',alignItems:'center',justifyContent:'center'},avatarText:{fontSize:42,fontWeight:'900',color:'#09090B'},handle:{textAlign:'center',color:'#A1A1AA',fontSize:16},role:{textAlign:'center',color:'#FACC15',marginTop:6,textTransform:'uppercase',fontWeight:'800',fontSize:11},stats:{flexDirection:'row',justifyContent:'space-around',marginVertical:28},statNumber:{color:'white',fontSize:24,fontWeight:'900',textAlign:'center'},statLabel:{color:'#A1A1AA',fontSize:12,marginTop:3},
  nav:{height:74,backgroundColor:'#111113',borderTopWidth:1,borderTopColor:'#27272A',flexDirection:'row',paddingBottom:10},navItem:{flex:1,alignItems:'center',justifyContent:'center'},navIcon:{fontSize:20},navLabel:{color:'#71717A',fontSize:10,fontWeight:'700',marginTop:2},navLabelActive:{color:'#FACC15'},
});

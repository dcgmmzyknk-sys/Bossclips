import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  SafeAreaView,
  Share,
  StyleSheet,
  Text,
  View,
  ViewToken
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { VideoView, useVideoPlayer } from 'expo-video';
import { clips, Clip } from './src/data';
import { AppState, initialState, loadState, saveState } from './src/storage';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const CATEGORIES = ['All', 'Boss Mode', 'Motivation', 'Funny', 'Chill'] as const;
type Category = (typeof CATEGORIES)[number];
type Tab = 'feed' | 'wallet' | 'saved' | 'profile';

function ClipCard({
  clip,
  active,
  liked,
  saved,
  onLike,
  onSave,
  onShare
}: {
  clip: Clip;
  active: boolean;
  liked: boolean;
  saved: boolean;
  onLike: () => void;
  onSave: () => void;
  onShare: () => void;
}) {
  const player = useVideoPlayer(clip.url, (p) => {
    p.loop = true;
    p.muted = false;
  });

  useEffect(() => {
    if (active) player.play();
    else player.pause();
  }, [active, player]);

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
        <Pressable style={styles.action} onPress={onLike} accessibilityLabel="Like clip">
          <Text style={styles.actionIcon}>{liked ? '❤️' : '🤍'}</Text>
          <Text style={styles.actionLabel}>{liked ? 'Liked' : 'Like'}</Text>
        </Pressable>
        <Pressable style={styles.action} onPress={onSave} accessibilityLabel="Save clip">
          <Text style={styles.actionIcon}>{saved ? '🔖' : '🏷️'}</Text>
          <Text style={styles.actionLabel}>{saved ? 'Saved' : 'Save'}</Text>
        </Pressable>
        <Pressable style={styles.action} onPress={onShare} accessibilityLabel="Share clip">
          <Text style={styles.actionIcon}>↗️</Text>
          <Text style={styles.actionLabel}>Share</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Feed({ state, setState }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> }) {
  const [category, setCategory] = useState<Category>('All');
  const [activeId, setActiveId] = useState(clips[0]?.id ?? '');
  const data = useMemo(() => category === 'All' ? clips : clips.filter(c => c.category === category), [category]);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 70 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const id = viewableItems[0]?.item?.id as string | undefined;
    if (!id) return;
    setActiveId(id);
    setState(prev => {
      if (prev.watchedIds.includes(id)) return prev;
      return { ...prev, watchedIds: [...prev.watchedIds, id], coins: prev.coins + 5 };
    });
  }).current;

  const toggle = (key: 'likedIds' | 'savedIds', id: string) => {
    setState(prev => {
      const exists = prev[key].includes(id);
      return { ...prev, [key]: exists ? prev[key].filter(x => x !== id) : [...prev[key], id] };
    });
  };

  return (
    <View style={styles.feedWrap}>
      <View style={styles.topBar}>
        <Text style={styles.brand}>BOSSCLIPS</Text>
        <View style={styles.balancePill}><Text style={styles.balanceText}>🪙 {state.coins}</Text></View>
      </View>
      <View style={styles.chips}>
        {CATEGORIES.map(item => (
          <Pressable key={item} onPress={() => setCategory(item)} style={[styles.chip, category === item && styles.chipActive]}>
            <Text style={[styles.chipText, category === item && styles.chipTextActive]}>{item}</Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={data}
        keyExtractor={item => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        renderItem={({ item }) => (
          <ClipCard
            clip={item}
            active={item.id === activeId}
            liked={state.likedIds.includes(item.id)}
            saved={state.savedIds.includes(item.id)}
            onLike={() => toggle('likedIds', item.id)}
            onSave={() => toggle('savedIds', item.id)}
            onShare={() => Share.share({ message: `Watch ${item.title} on Bossclips 👑` })}
          />
        )}
      />
    </View>
  );
}

function Wallet({ state }: { state: AppState }) {
  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.title}>Boss Wallet</Text>
      <View style={styles.walletHero}>
        <Text style={styles.walletLabel}>Your balance</Text>
        <Text style={styles.walletAmount}>🪙 {state.coins}</Text>
        <Text style={styles.walletFine}>Boss Coins are virtual loyalty points. They have no cash value and cannot be withdrawn, transferred, or exchanged for money.</Text>
      </View>
      <Text style={styles.sectionTitle}>How you earn</Text>
      <View style={styles.card}><Text style={styles.cardTitle}>Watch a new clip</Text><Text style={styles.cardBody}>+5 coins the first time a clip becomes active.</Text></View>
      <View style={styles.card}><Text style={styles.cardTitle}>Daily streak</Text><Text style={styles.cardBody}>Current streak: {state.streak} day. Add server-side daily rewards before launch.</Text></View>
      <Text style={styles.sectionTitle}>Coming next</Text>
      <View style={styles.card}><Text style={styles.cardTitle}>Perks store</Text><Text style={styles.cardBody}>Use coins for profile themes, badges and cosmetic unlocks—never cash.</Text></View>
    </SafeAreaView>
  );
}

function Saved({ state }: { state: AppState }) {
  const saved = clips.filter(c => state.savedIds.includes(c.id));
  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.title}>Saved Clips</Text>
      {saved.length === 0 ? <Text style={styles.empty}>Save clips from your feed and they’ll appear here.</Text> : saved.map(c => (
        <View key={c.id} style={styles.card}><Text style={styles.cardTitle}>{c.title}</Text><Text style={styles.cardBody}>{c.creator} · {c.category}</Text></View>
      ))}
    </SafeAreaView>
  );
}

function Profile({ state, onReset }: { state: AppState; onReset: () => void }) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.avatar}><Text style={styles.avatarText}>B</Text></View>
      <Text style={[styles.title, { textAlign: 'center' }]}>Boss Member</Text>
      <Text style={styles.handle}>@boss</Text>
      <View style={styles.stats}>
        <View><Text style={styles.statNumber}>{state.likedIds.length}</Text><Text style={styles.statLabel}>Likes</Text></View>
        <View><Text style={styles.statNumber}>{state.savedIds.length}</Text><Text style={styles.statLabel}>Saved</Text></View>
        <View><Text style={styles.statNumber}>{state.watchedIds.length}</Text><Text style={styles.statLabel}>Watched</Text></View>
      </View>
      <Pressable style={styles.primaryButton} onPress={() => Alert.alert('Creator uploads', 'Connect your backend/moderation service before enabling public uploads.')}><Text style={styles.primaryButtonText}>Creator Studio</Text></Pressable>
      <Pressable style={styles.secondaryButton} onPress={() => Alert.alert('Privacy', 'Before App Store submission, replace this dialog with your hosted privacy policy URL.')}><Text style={styles.secondaryButtonText}>Privacy & Terms</Text></Pressable>
      <Pressable style={styles.secondaryButton} onPress={onReset}><Text style={styles.secondaryButtonText}>Reset Demo Data</Text></Pressable>
    </SafeAreaView>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>('feed');
  const [state, setState] = useState<AppState>(initialState);

  useEffect(() => { loadState().then(setState); }, []);
  useEffect(() => { saveState(state); }, [state]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.content}>
        {tab === 'feed' && <Feed state={state} setState={setState} />}
        {tab === 'wallet' && <Wallet state={state} />}
        {tab === 'saved' && <Saved state={state} />}
        {tab === 'profile' && <Profile state={state} onReset={() => setState(initialState)} />}
      </View>
      <View style={styles.nav}>
        {([
          ['feed', '▶', 'Feed'],
          ['wallet', '🪙', 'Wallet'],
          ['saved', '🔖', 'Saved'],
          ['profile', '👤', 'Profile']
        ] as const).map(([key, icon, label]) => (
          <Pressable key={key} style={styles.navItem} onPress={() => setTab(key)}>
            <Text style={styles.navIcon}>{icon}</Text><Text style={[styles.navLabel, tab === key && styles.navLabelActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#09090B' },
  content: { flex: 1 },
  feedWrap: { flex: 1, backgroundColor: '#000' },
  clipPage: { height: SCREEN_HEIGHT - 72, backgroundColor: '#111', justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.18)' },
  clipCopy: { position: 'absolute', left: 18, right: 90, bottom: 35 },
  creator: { color: '#fff', fontWeight: '800', fontSize: 17, marginBottom: 8 },
  caption: { color: '#fff', fontSize: 15, lineHeight: 21, marginBottom: 10 },
  categoryPill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  categoryText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  actions: { position: 'absolute', right: 12, bottom: 30, gap: 18 },
  action: { alignItems: 'center', width: 62 },
  actionIcon: { fontSize: 29 },
  actionLabel: { color: '#fff', fontSize: 11, fontWeight: '700', marginTop: 4 },
  topBar: { position: 'absolute', zIndex: 5, top: 48, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 1.4 },
  balancePill: { backgroundColor: 'rgba(9,9,11,0.72)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  balanceText: { color: '#fff', fontWeight: '800' },
  chips: { position: 'absolute', zIndex: 5, top: 88, left: 12, right: 12, flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  chip: { backgroundColor: 'rgba(9,9,11,0.60)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  chipActive: { backgroundColor: '#F4C542' },
  chipText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  chipTextActive: { color: '#111' },
  screen: { flex: 1, paddingHorizontal: 20, paddingTop: 16, backgroundColor: '#09090B' },
  title: { color: '#fff', fontSize: 30, fontWeight: '900', marginBottom: 18 },
  walletHero: { backgroundColor: '#17171B', borderRadius: 24, padding: 22, borderWidth: 1, borderColor: '#2A2A31' },
  walletLabel: { color: '#A1A1AA', fontSize: 14 },
  walletAmount: { color: '#F4C542', fontSize: 42, fontWeight: '900', marginVertical: 8 },
  walletFine: { color: '#A1A1AA', fontSize: 12, lineHeight: 17 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 24, marginBottom: 10 },
  card: { backgroundColor: '#17171B', borderRadius: 16, padding: 16, marginBottom: 10 },
  cardTitle: { color: '#fff', fontWeight: '800', fontSize: 15 },
  cardBody: { color: '#A1A1AA', marginTop: 5, lineHeight: 19 },
  empty: { color: '#A1A1AA', fontSize: 16, lineHeight: 24 },
  avatar: { width: 88, height: 88, borderRadius: 44, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4C542', marginTop: 15, marginBottom: 12 },
  avatarText: { fontSize: 42, fontWeight: '900', color: '#111' },
  handle: { color: '#A1A1AA', textAlign: 'center', marginTop: -10, marginBottom: 22 },
  stats: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#17171B', borderRadius: 18, paddingVertical: 18, marginBottom: 22 },
  statNumber: { color: '#fff', fontWeight: '900', fontSize: 21, textAlign: 'center' },
  statLabel: { color: '#A1A1AA', fontSize: 12, marginTop: 3 },
  primaryButton: { backgroundColor: '#F4C542', borderRadius: 14, padding: 15, alignItems: 'center', marginBottom: 10 },
  primaryButtonText: { color: '#111', fontWeight: '900' },
  secondaryButton: { backgroundColor: '#17171B', borderRadius: 14, padding: 15, alignItems: 'center', marginBottom: 10 },
  secondaryButtonText: { color: '#fff', fontWeight: '800' },
  nav: { height: 72, paddingBottom: 8, backgroundColor: '#0E0E11', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#27272A', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  navItem: { alignItems: 'center', minWidth: 64 },
  navIcon: { fontSize: 20 },
  navLabel: { color: '#71717A', fontSize: 10, fontWeight: '700', marginTop: 2 },
  navLabelActive: { color: '#F4C542' }
});

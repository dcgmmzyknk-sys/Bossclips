import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppState = {
  coins: number;
  streak: number;
  likedIds: string[];
  savedIds: string[];
  watchedIds: string[];
};

const KEY = 'bossclips_state_v1';

export const initialState: AppState = {
  coins: 250,
  streak: 1,
  likedIds: [],
  savedIds: [],
  watchedIds: []
};

export async function loadState(): Promise<AppState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...initialState, ...JSON.parse(raw) } : initialState;
  } catch {
    return initialState;
  }
}

export async function saveState(state: AppState) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Local persistence failure should never crash the feed.
  }
}

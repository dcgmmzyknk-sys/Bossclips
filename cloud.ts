import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { Clip, Profile } from '../types';

const requireClient = () => {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
};

export async function signUp(email: string, password: string, username: string) {
  const client = requireClient();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const client = requireClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const client = requireClient();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function getProfile(userId: string): Promise<Profile> {
  const client = requireClient();
  const { data, error } = await client.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return data as Profile;
}

export async function getApprovedClips(): Promise<Clip[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('clips')
    .select('id,title,creator,caption,category,video_url,owner_id')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({ ...row, url: row.video_url }));
}

export async function toggleLike(userId: string, clipId: string, liked: boolean) {
  const client = requireClient();
  if (liked) {
    const { error } = await client.from('likes').delete().eq('user_id', userId).eq('clip_id', clipId);
    if (error) throw error;
  } else {
    const { error } = await client.from('likes').upsert({ user_id: userId, clip_id: clipId });
    if (error) throw error;
  }
}

export async function toggleSave(userId: string, clipId: string, saved: boolean) {
  const client = requireClient();
  if (saved) {
    const { error } = await client.from('saves').delete().eq('user_id', userId).eq('clip_id', clipId);
    if (error) throw error;
  } else {
    const { error } = await client.from('saves').upsert({ user_id: userId, clip_id: clipId });
    if (error) throw error;
  }
}

export async function getUserActions(userId: string) {
  const client = requireClient();
  const [{ data: likes, error: likeError }, { data: saves, error: saveError }] = await Promise.all([
    client.from('likes').select('clip_id').eq('user_id', userId),
    client.from('saves').select('clip_id').eq('user_id', userId),
  ]);
  if (likeError) throw likeError;
  if (saveError) throw saveError;
  return {
    likedIds: (likes ?? []).map((x: any) => x.clip_id),
    savedIds: (saves ?? []).map((x: any) => x.clip_id),
  };
}

export async function awardWatch(clipId: string): Promise<number> {
  const client = requireClient();
  const { data, error } = await client.rpc('award_watch', { p_clip_id: clipId });
  if (error) throw error;
  return Number(data ?? 0);
}

export async function deleteMyAccount() {
  const client = requireClient();
  const { error } = await client.rpc('delete_my_account');
  if (error) throw error;
}

export async function reportClip(clipId: string, reason: string) {
  const client = requireClient();
  const { error } = await client.from('reports').insert({ clip_id: clipId, reason });
  if (error) throw error;
}

export async function pickAndUploadVideo(userId: string, meta: { title: string; caption: string; category: string }) {
  const client = requireClient();
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Photo library permission is required to select a video.');

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    allowsEditing: false,
    quality: 1,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset) return null;
  if (asset.fileSize && asset.fileSize > 100 * 1024 * 1024) throw new Error('For this MVP, choose a video under 100 MB.');
  const ext = (asset.fileName?.split('.').pop() || 'mp4').toLowerCase();
  const objectPath = `${userId}/${Date.now()}.${ext}`;
  const response = await fetch(asset.uri);
  const bytes = await response.arrayBuffer();

  const { error: uploadError } = await client.storage
    .from('clip-videos')
    .upload(objectPath, bytes, { contentType: asset.mimeType || 'video/mp4', upsert: false });
  if (uploadError) throw uploadError;

  const { data: publicData } = client.storage.from('clip-videos').getPublicUrl(objectPath);
  const { error: insertError } = await client.from('clips').insert({
    owner_id: userId,
    title: meta.title,
    creator: '@creator',
    caption: meta.caption,
    category: meta.category,
    video_url: publicData.publicUrl,
    status: 'pending',
  });
  if (insertError) throw insertError;

  return publicData.publicUrl;
}

export async function adminAddClip(meta: { title: string; creator: string; caption: string; category: string; video_url: string }) {
  const client = requireClient();
  const { error } = await client.from('clips').insert({ ...meta, status: 'approved' });
  if (error) throw error;
}

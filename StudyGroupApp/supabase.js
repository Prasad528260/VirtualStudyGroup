import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabase = createClient(
  'https://ojiyvodgjrckubknvinu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qaXl2b2RnanJja3Via252aW51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE0OTE5MzUsImV4cCI6MjA1NzA2NzkzNX0.PptlMovWsauan764oM3Lk5ifLwcJcfspCDmcyViJYzI',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    }
  }
);

// Profile Data Fetch
supabase.getFullProfile = async (userId) => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', userId)
    .single();

  const { data: progress } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .single();

  return {
    name: profile?.name || 'Anonymous',
    xp: progress?.xp || 0,
    level: progress?.level || 1,
    badges: progress?.badges || [],
    streak: progress?.streak || 0,
    studyMinutes: progress?.total_study_minutes || 0
  };
};

// Task Completion
supabase.completeTaskWithProgress = async (taskId, userId, duration) => {
  const xpEarned = Math.max(1, Math.floor(duration * 0.8));

  await supabase
    .from('tasks')
    .update({ status: 'completed' })
    .eq('id', taskId);

  const { data: existing } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .single();

  const updateData = {
    xp: (existing?.xp || 0) + xpEarned,
    level: Math.floor(((existing?.xp || 0) + xpEarned) / 100) + 1,
    total_study_minutes: (existing?.total_study_minutes || 0) + duration,
    last_active: new Date().toISOString()
  };

  if (existing) {
    await supabase
      .from('user_progress')
      .update(updateData)
      .eq('user_id', userId);
  } else {
    await supabase
      .from('user_progress')
      .insert({ user_id: userId, ...updateData, streak: 1, badges: [] });
  }

  return xpEarned;
};

export default supabase;
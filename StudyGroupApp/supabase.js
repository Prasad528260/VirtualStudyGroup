import { createClient } from '@supabase/supabase-js';

// Replace with your Supabase credentials
const SUPABASE_URL = 'https://ojiyvodgjrckubknvinu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qaXl2b2RnanJja3Via252aW51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE0OTE5MzUsImV4cCI6MjA1NzA2NzkzNX0.PptlMovWsauan764oM3Lk5ifLwcJcfspCDmcyViJYzI';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabase;

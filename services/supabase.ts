
import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://kyahdctjbwwdzjfudlto.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5YWhkY3RqYnd3ZHpqZnVkbHRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxOTg0MTcsImV4cCI6MjA3ODc3NDQxN30.qAoLxcdEP1eQVWl79Iso5fGglk07kZfg3BksCdNr5TA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
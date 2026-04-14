import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://zabeesixaloyyhrsqqne.supabase.co'

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphYmVlc2l4YWxveXlocnNxcW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwODE5NzksImV4cCI6MjA3NjY1Nzk3OX0.SkdD21HGrUrK6DCmN3t-9jtRCt5gjRWr5Ysw_JIyznM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

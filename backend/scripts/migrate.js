import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Use direct connection for raw SQL; Supabase dashboard SQL editor or psql is typical.
// This script runs migrations via Supabase client - we need to run raw SQL.
// Supabase JS doesn't support multi-statement SQL easily; recommend running migrations
// manually in Supabase SQL editor or using pg client.
const sql = readFileSync(join(__dirname, '..', 'migrations', '001_initial.sql'), 'utf8');
console.log('Migration 001_initial.sql:');
console.log('Run this SQL in Supabase Dashboard -> SQL Editor, or use psql with DATABASE_URL');
console.log('---');
console.log(sql);

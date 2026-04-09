
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://owqjsqvpmsctztpgensg.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93cWpzcXZwbXNjdHp0cGdlbnNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDI0NTkwNCwiZXhwIjoyMDg1ODIxOTA0fQ.S9TInNnZHCsjuuYrpcXB5xpM4Lsr3MIE1YsFPdhq2Hg";
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("--- LATEST ATTENDANCE SESSION ---");
  const { data: session, error: sessErr } = await supabase
    .from('attendance_sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);
    
  if (sessErr) console.error(sessErr);
  else console.log("SESSION:", JSON.stringify(session, null, 2));

  console.log("\n--- LATEST ATTENDANCE RECORD ---");
  const { data: records, error: recErr } = await supabase
    .from('attendance_records')
    .select('*')
    .order('scanned_at', { ascending: false })
    .limit(1);

  if (recErr) console.error(recErr);
  else console.log("RECORD:", JSON.stringify(records, null, 2));
}

check();

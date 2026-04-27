import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing env vars');
  process.exit(1);
}

const client = createClient(url, key);
const email = `qa${Date.now()}@mailinator.com`;
const password = 'Test123456!';

async function run() {
  console.log('1) signUp', email);
  const signUp = await client.auth.signUp({ email, password });
  if (signUp.error) {
    console.error('signUp error:', signUp.error.message);
    process.exit(1);
  }

  console.log('2) signIn');
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) {
    console.error('signIn error:', signIn.error.message);
    console.log('Hint: if email confirmation is ON, confirm user email or disable confirm for testing.');
    process.exit(1);
  }

  console.log('3) ensure_user_family()');
  const family = await client.rpc('ensure_user_family');
  if (family.error) {
    console.error('rpc error:', family.error.message);
    process.exit(1);
  }
  console.log('family_id:', family.data);

  console.log('4) insert task as mother');
  const user = (await client.auth.getUser()).data.user;
  const ins = await client.from('tasks').insert({
    family_id: family.data,
    title: 'QA live task',
    assignee_role: 'staff',
    priority: 'urgent',
    created_by: user.id,
  }).select('id,title,priority,status').single();

  if (ins.error) {
    console.error('insert task error:', ins.error.message);
    process.exit(1);
  }
  console.log('task inserted:', ins.data);

  console.log('5) list tasks');
  const list = await client.from('tasks').select('id,title,priority,status').eq('family_id', family.data);
  if (list.error) {
    console.error('list tasks error:', list.error.message);
    process.exit(1);
  }
  console.log('tasks count:', list.data.length);

  console.log('OK: schema + policies + rpc work for mother flow');
}

run().catch((e) => {
  console.error('Unexpected error:', e.message);
  process.exit(1);
});

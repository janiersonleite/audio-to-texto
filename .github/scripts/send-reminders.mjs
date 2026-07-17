// Hora atual em Brasília (UTC-3)
const now = new Date();
const brazilHour = ((now.getUTCHours() - 3) + 24) % 24;
const brazilMinute = now.getUTCMinutes();
console.log(`Hora em Brasília: ${brazilHour}:${String(brazilMinute).padStart(2,'0')} (UTC: ${now.getUTCHours()}h)`);

const headers = {
  'apikey':        process.env.SUPABASE_SERVICE_KEY,
  'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
  'Content-Type':  'application/json',
  'Prefer':        'return=minimal',
};

// ── 1. Lembrete diário global ─────────────────────────────────────────────
const globalUrl = `${process.env.SUPABASE_URL}/rest/v1/user_data`
  + `?select=user_id,telegram_chat_id,reminder_time`
  + `&reminder_enabled=eq.true`
  + `&telegram_chat_id=not.is.null`
  + `&reminder_time=not.is.null`;

const globalRes = await fetch(globalUrl, { headers });
if (!globalRes.ok) {
  console.error('Erro ao consultar Supabase (global):', await globalRes.text());
  process.exit(1);
}

const globalUsers = await globalRes.json();
console.log(`${globalUsers.length} usuário(s) com lembrete diário ativo`);

let enviados = 0;

for (const user of globalUsers) {
  const horaConfigurada = parseInt(user.reminder_time.substring(0, 2), 10);
  if (horaConfigurada !== brazilHour) continue;

  const tgRes = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id:    user.telegram_chat_id,
        text:       '🎙 *Lembrete — Áudio → Texto*\n\nHora de registrar suas anotações de voz!\n\n👉 https://janiersonleite.github.io/audio-to-texto/',
        parse_mode: 'Markdown',
      }),
    }
  );

  const tgData = await tgRes.json();
  if (tgRes.ok) {
    enviados++;
    console.log(`✓ Lembrete diário enviado para ${user.user_id}`);
  } else {
    console.error(`✗ Falha (diário) para ${user.user_id}:`, tgData.description);
  }
}

// ── 2. Lembretes por nota ─────────────────────────────────────────────────
const notesUrl = `${process.env.SUPABASE_URL}/rest/v1/user_data`
  + `?select=user_id,telegram_chat_id,items`
  + `&telegram_chat_id=not.is.null`;

const notesRes = await fetch(notesUrl, { headers });
if (!notesRes.ok) {
  console.error('Erro ao consultar Supabase (notas):', await notesRes.text());
  process.exit(1);
}

const allUsers = await notesRes.json();
const currentHHMM = `${String(brazilHour).padStart(2,'0')}:${String(brazilMinute).padStart(2,'0')}`;

for (const user of allUsers) {
  if (!user.telegram_chat_id) continue;
  const items = Array.isArray(user.items) ? user.items : [];

  const pendingIndexes = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.reminder_time || item.reminder_sent) continue;
    // Compara apenas a hora (HH), ignora minutos — dispara na hora exata
    const reminderHour = parseInt(item.reminder_time.substring(0, 2), 10);
    if (reminderHour === brazilHour) pendingIndexes.push(i);
  }

  if (pendingIndexes.length === 0) continue;

  for (const i of pendingIndexes) {
    const item = items[i];
    const cat  = item.category || 'Geral';
    const text = `⏰ *Lembrete — ${cat}*\n\n${item.text}\n\n_${item.date} · ${item.time}_`;

    const tgRes = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id:    user.telegram_chat_id,
          text,
          parse_mode: 'Markdown',
        }),
      }
    );

    const tgData = await tgRes.json();
    if (tgRes.ok) {
      enviados++;
      items[i] = { ...item, reminder_sent: true };
      console.log(`✓ Lembrete de nota enviado para ${user.user_id} (item ${item.id})`);
    } else {
      console.error(`✗ Falha (nota) para ${user.user_id}:`, tgData.description);
    }
  }

  // Marca reminder_sent = true nas notas enviadas
  const patchRes = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/user_data?user_id=eq.${user.user_id}`,
    {
      method:  'PATCH',
      headers,
      body:    JSON.stringify({ items }),
    }
  );
  if (!patchRes.ok) {
    console.error(`✗ Falha ao atualizar itens de ${user.user_id}:`, await patchRes.text());
  }
}

console.log(`Concluído: ${enviados} lembrete(s) enviado(s)`);

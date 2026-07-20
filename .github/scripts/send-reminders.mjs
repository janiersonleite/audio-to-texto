// Hora e data atuais em Brasília (UTC-3)
const now = new Date();
const brazilMs   = now.getTime() - 3 * 60 * 60 * 1000;
const brazilNow  = new Date(brazilMs);
const brazilHour   = brazilNow.getUTCHours();
const brazilMinute = brazilNow.getUTCMinutes();
const brazilHHMM   = `${String(brazilHour).padStart(2,'0')}:${String(brazilMinute).padStart(2,'0')}`;
const brazilDate   = brazilNow.toISOString().split('T')[0]; // YYYY-MM-DD
console.log(`Hora em Brasília: ${brazilHHMM} ${brazilDate} (UTC: ${now.getUTCHours()}h)`);

// Retorna true se o lembrete (HH:MM) está dentro dos últimos 5 minutos
function dentroJanela(reminderHHMM) {
  const [rH, rM] = reminderHHMM.split(':').map(Number);
  const atual    = brazilHour * 60 + brazilMinute;
  const lembrete = rH * 60 + rM;
  const diff     = (atual - lembrete + 1440) % 1440; // lida com virada de meia-noite
  return diff < 5;
}

const headers = {
  'apikey':        process.env.SUPABASE_SERVICE_KEY,
  'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
  'Content-Type':  'application/json',
  'Prefer':        'return=minimal',
};

// ── Lembretes por nota ───────────────────────────────────────────────────
const notesUrl = `${process.env.SUPABASE_URL}/rest/v1/user_data`
  + `?select=user_id,telegram_chat_id,items`
  + `&telegram_chat_id=not.is.null`;

const notesRes = await fetch(notesUrl, { headers });
if (!notesRes.ok) {
  console.error('Erro ao consultar Supabase (notas):', await notesRes.text());
  process.exit(1);
}

const allUsers = await notesRes.json();
let enviados = 0;

for (const user of allUsers) {
  if (!user.telegram_chat_id) continue;
  const items = Array.isArray(user.items) ? user.items : [];

  const pendingIndexes = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.reminder_time || item.reminder_sent) continue;
    if (item.reminder_date && item.reminder_date !== brazilDate) continue;
    if (dentroJanela(item.reminder_time)) pendingIndexes.push(i);
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

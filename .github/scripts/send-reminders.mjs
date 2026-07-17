// Hora atual em Brasília (UTC-3)
const now = new Date();
const brazilHour = ((now.getUTCHours() - 3) + 24) % 24;
console.log(`Hora em Brasília: ${brazilHour}h (UTC: ${now.getUTCHours()}h)`);

// Consulta usuários com lembrete ativo no Supabase
const url = `${process.env.SUPABASE_URL}/rest/v1/user_data`
  + `?select=user_id,telegram_chat_id,reminder_time`
  + `&reminder_enabled=eq.true`
  + `&telegram_chat_id=not.is.null`
  + `&reminder_time=not.is.null`;

const res = await fetch(url, {
  headers: {
    'apikey':        process.env.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
  },
});

if (!res.ok) {
  console.error('Erro ao consultar Supabase:', await res.text());
  process.exit(1);
}

const users = await res.json();
console.log(`${users.length} usuário(s) com lembrete ativo`);

let enviados = 0;

for (const user of users) {
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
    console.log(`✓ Enviado para usuário ${user.user_id}`);
  } else {
    console.error(`✗ Falha para ${user.user_id}:`, tgData.description);
  }
}

console.log(`Concluído: ${enviados} lembrete(s) enviado(s)`);

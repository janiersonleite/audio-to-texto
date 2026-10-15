# Áudio → Texto

PWA (Progressive Web App) que grava áudio do microfone e converte em texto em
**português (pt-BR)**, com histórico sincronizado na nuvem e lembretes enviados
por Telegram.

A transcrição usa a **Web Speech API** do navegador (reconhecimento de fala
nativo) — não depende de nenhum serviço de transcrição externo.

## ✨ Funcionalidades

- 🎤 Transcrição de fala em tempo real (idioma `pt-BR`)
- 📱 Instalável como app (PWA com Service Worker e funcionamento offline)
- ☁️ Login por e-mail/senha e sincronização do histórico via **Supabase**
- 🗂️ Histórico com categorias, edição e seleção múltipla
- ⏰ Lembretes por nota enviados via **Telegram** (GitHub Actions, a cada 5 min)
- 💾 Cache local (`localStorage`) — funciona mesmo sem conexão

## 📁 Estrutura

| Arquivo | Função |
|---|---|
| `index.html` | App completo (UI, gravação, Supabase, PWA) |
| `server.js` | Servidor HTTP local (Node puro) para testar na rede |
| `manifest.json` | Manifesto do PWA |
| `sw.js` | Service Worker (cache/offline) |
| `version.json` | Versão usada pelo banner de atualização |
| `generate-icons.js` | Gera os ícones PNG sem dependências |
| `icons/` | Ícones do PWA (192px e 512px) |
| `.github/workflows/send-reminders.yml` | Agenda o envio de lembretes |
| `.github/scripts/send-reminders.mjs` | Envia os lembretes via Telegram |

> Não há `package.json`: nem o `server.js` nem os scripts usam bibliotecas
> externas (apenas módulos nativos do Node). O SDK do Supabase é carregado por
> CDN dentro do `index.html`.

## ▶️ Como executar localmente

Requer **Node.js** instalado. Na raiz do projeto:

```bash
node server.js
```

O servidor sobe na porta **3000**, serve todos os arquivos estáticos
(HTML, `manifest.json`, `sw.js`, ícones) e imprime os endereços de acesso:

- **Neste computador:** `http://localhost:3000`
- **No celular (mesmo Wi-Fi):** `http://SEU_IP:3000` (o IP é exibido no console)

> **Microfone e HTTPS:** o navegador só libera o microfone em **contexto seguro**
> (`localhost` ou HTTPS). Ao abrir pelo IP da rede (`http://192.168.x.x:3000`) o
> Chrome do celular pode bloquear o microfone. Para testar no celular, prefira
> publicar em HTTPS (ver abaixo) ou usar as ferramentas de encaminhamento de
> porta do Chrome DevTools.

### Navegador
A Web Speech API funciona melhor no **Chrome / Edge**. Firefox e Safari (iOS)
têm suporte limitado ou inexistente.

### (Re)gerar os ícones
```bash
node generate-icons.js
```

## 🚀 Publicação (GitHub Pages)

O `manifest.json` define `start_url` e `scope` como `/audio-to-texto/`,
indicando hospedagem no **GitHub Pages** sob esse subcaminho. Para publicar:

1. Em **Settings → Pages**, selecione a branch e a pasta raiz (`/`).
2. O app ficará em `https://SEU_USUARIO.github.io/audio-to-texto/`.

O GitHub Pages serve todos os arquivos estáticos por HTTPS, então o Service
Worker, a instalação do PWA e o acesso ao microfone funcionam corretamente.

## ⚙️ Configuração

### 1. Supabase (login + histórico)

As credenciais públicas já estão preenchidas em `index.html`
(`SUPABASE_URL` e `SUPABASE_KEY` — a chave *publishable*, segura para o
front-end). Para funcionar, o projeto Supabase precisa ter:

- **Tabela `user_data`** com as colunas:
  - `user_id` (uuid, referência ao usuário autenticado)
  - `items` (jsonb) — lista de transcrições
  - `updated_at` (timestamptz)
  - `telegram_chat_id` (text, opcional — para lembretes)
- **Row Level Security (RLS)** ativado, com políticas que permitam a cada
  usuário ler/escrever apenas a própria linha (`auth.uid() = user_id`).
- **Auth por e-mail/senha** habilitado.

### 2. Lembretes via Telegram (opcional)

O workflow `.github/workflows/send-reminders.yml` roda a cada 5 minutos e
dispara o script que consulta o Supabase e envia lembretes pendentes ao
Telegram. Configure em **Settings → Secrets and variables → Actions** os
seguintes *secrets*:

| Secret | Descrição |
|---|---|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_KEY` | Chave **service_role** (NÃO a publishable) |
| `TELEGRAM_BOT_TOKEN` | Token do bot criado no [@BotFather](https://t.me/BotFather) |

Cada usuário que quiser receber lembretes precisa ter seu `telegram_chat_id`
gravado na respectiva linha da tabela `user_data`.

## 🔒 Notas de segurança

- A chave publishable do Supabase pode ficar no front-end — a proteção real
  vem das políticas de **RLS**. Garanta que elas estejam configuradas.
- A chave `service_role` **nunca** deve ir para o `index.html`; ela é usada
  apenas no GitHub Actions (server-side), via secret.

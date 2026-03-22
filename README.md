# 🌍 Mundo Roberth 0.1 — Dashboard

Ecossistema digital soberano e autônomo. Dashboard administrativo conectado ao Supabase com monitoramento em tempo real.

## Stack

- **Next.js 15** (App Router)
- **Supabase** (PostgreSQL + Edge Functions + PGMQ)
- **Telegram Bot** (webhook)
- **OpenAI GPT** (processamento de intenções)

## Deploy no Vercel

### 1. Suba para o GitHub

```bash
git init
git add .
git commit -m "Mundo Roberth 0.1 - Dashboard"
git remote add origin https://github.com/SEU_USUARIO/mundo-roberth.git
git push -u origin main
```

### 2. Conecte ao Vercel

1. Acesse [vercel.com/new](https://vercel.com/new)
2. Importe o repositório `mundo-roberth`
3. Configure as variáveis de ambiente:

| Variável | Valor |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://umwqxkggzrpwknptwwju.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(ver .env.example)* |

4. Clique em **Deploy**

### 3. Pronto!

O dashboard estará acessível na URL fornecida pelo Vercel.

## Desenvolvimento Local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Acesse `http://localhost:3000`

## Funcionalidades

- ⚡ **Visão Geral** — Métricas em tempo real
- 🔄 **Jobs** — Histórico completo de processamento
- 📋 **Tarefas** — Tarefas criadas pela IA
- 📅 **Calendário** — Eventos agendados
- 🔍 **Auditoria** — Trilha completa de eventos

Auto-refresh a cada 10 segundos.

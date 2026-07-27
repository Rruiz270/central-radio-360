# Central 360 · Metropolitana FM

Plataforma única de gestão da Rede Metropolitana: **rádio** (programação, jornalismo, comercial/tráfego, digital, técnica), **agência de ativação** (vendas, ações em campo, logística, promotores), **marketing/social**, **financeiro** e **rede de afiliadas** — com IA transversal e alertas por WhatsApp.

**Produção:** https://central-radio-360.vercel.app

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript — design system portado do mockup aprovado (marca Metropolitana: Pantone 293C `#0020b8`, Yellow C `#ffe200`, League Spartan)
- PostgreSQL Neon (multi-tenant, `tenant_id` em tudo) via `postgres` com `prepare:false`
- Auth própria: JWT (jose) em cookie httpOnly + bcrypt + RBAC por perfil (8 perfis do organograma)
- Portal do Cliente público por **link com token** (sem login)
- IA: Claude/OpenAI plugáveis em Configurações → Integrações (fallback em modo template)
- WhatsApp: Meta Cloud API (modo simulado até plugar WABA/token)

## Rodar local

```bash
npm install
npm run migrate   # idempotente (CREATE TABLE IF NOT EXISTS, nunca DROP)
npm run seed      # dados demo (só roda com banco vazio)
npm run build && npm start   # http://localhost:3360
```

`.env.local`: `DATABASE_URL`, `AUTH_SECRET` (e opcionais `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`).

## Acessos demo (senha `metro360`)

| Perfil | E-mail | Escopo |
|---|---|---|
| Administração (Matriz) | admin@metropolitana.fm | tudo |
| Diretor Comercial | comercial@metropolitana.fm | comercial + financeiro |
| Programação | programacao@metropolitana.fm | praça |
| Jornalismo | jornalismo@metropolitana.fm | praça |
| Marketing Digital | marketing@metropolitana.fm | social/rede |
| Operações (Agência) | operacoes@metropolitana.fm | agência |
| Gestor de Afiliada | rio@metropolitana.fm | só a praça Rio |

Portal do cliente (sem login): `/portal/cb-julho-2026`

## Módulos (21)

Visão Geral (BI) · Rede & Afiliadas (mapa + migração Pulsar F1–F6) · Organograma & Acessos · Programação & Musical (cadastro, metas IA, categorias, grade, log) · Jornalismo & Radar (IA + disparo WhatsApp) · Comercial & Vendas (kanban, pedidos & avails, tráfego & log com validação ANATEL no servidor, rate card & pacing, deal mgmt, produção de spot) · Portal do Cliente (aprovação de materiais + comprovação) · Digital & Podcast · Técnica & Engenharia · Vendas Agência (kanban) · Ações & Execução (ficha + checklist) · Planejamento & Criação · Equipamentos & Frota · Equipe & Promotores · Central de Marketing (composer multi-rede + IA + trends) · Monetização Social · IA & Automação (copilots) · Comunicação & Alertas (motor de gatilhos WhatsApp) · Gestão Interna (aprovações + SOPs) · Financeiro (faturas, preempt, aging + Delinquency Radar) · Configurações & Integrações (chaves de API no banco, mascaradas)

## Integrações a plugar (ordem de prioridade)

1. WhatsApp Business (WABA + token System User) → alertas reais
2. OAuth Meta/YouTube/TikTok (App Review) → publicação automática
3. Omie/Vindi/Pagar.me → conciliação (motores i10 prontos)
4. Certificado digital → NFS-e
5. Kantar (contrato por praça) · 6. Voz do locutor (autorização p/ TTS)

— Documentação técnica completa e mockup de referência em `~/Library/Mobile Documents/com~apple~CloudDocs/central-radio-360/`.

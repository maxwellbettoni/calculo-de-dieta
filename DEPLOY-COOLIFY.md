# Deploy Cálculo de Dieta no Coolify

VPS SynchOps (`187.127.7.55`) — mesmo host do Gestor/Nexo.  
Domínio sugerido: `https://dieta.synchops.online`

## Antes do Coolify

1. DNS: registro **A** `dieta` → `187.127.7.55`
2. SQL no Supabase do **Gestor**: `synchops/scripts/gestor-calculo-de-dieta-setup.sql`
3. (Opcional) projeto Supabase **separado** + `synchops/scripts/calculo-de-dieta-supabase-setup.sql`
4. No Gestor Coolify, env: `NEXT_PUBLIC_CALCULO_DE_DIETA_URL=https://dieta.synchops.online` e rebuild

## Coolify — nova Application

| Campo | Valor |
|--------|--------|
| Source | GitHub `maxwellbettoni/calculo-de-dieta` |
| Branch | `main` |
| Build Pack | **Dockerfile** |
| Base Directory | `web` |
| Dockerfile Location | `Dockerfile` (dentro de `web`) |
| Port | `3000` |
| Domain | `https://dieta.synchops.online` |
| Healthcheck | `GET /api/health` |

## Environment Variables (Build + Runtime)

Marque **Build Variable** para as `NEXT_PUBLIC_*`:

```
NEXT_PUBLIC_GESTOR_URL=https://gestor.synchops.online
NEXT_PUBLIC_GESTOR_AUTH=1
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

- `NEXT_PUBLIC_SUPABASE_*` = keys do projeto **dieta** (não as do Gestor). Pode deixar vazio no 1º deploy (login Gestor + Dexie local).
- Após mudar `NEXT_PUBLIC_*`: **Force rebuild without cache**.

## Checklist pós-deploy

- [ ] `https://dieta.synchops.online/api/health` → `{"ok":true,...}`
- [ ] Login com usuário/PIN gerados no Gestor (app liberado)
- [ ] CORS: origem `dieta.synchops.online` já coberta por `*.synchops.online` no Gestor
- [ ] Admin Gestor → Contas → marcar Cálculo de Dieta → Gerar senha

## Repo local

Código em `D:\Antigravity\Calculo de Dieta` — pasta `web/` é o Next.js.

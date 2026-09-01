# Fundação do backend

Esta base atende somente aos novos módulos do Universo Carol Sol. O sistema de
agendamento existente não é importado, migrado ou alterado.

## Desenvolvimento local

1. Copie `.env.example` para `.env.local`.
2. Configure um PostgreSQL em `DATABASE_URL`.
3. Somente no primeiro setup, defina `ADMIN_EMAIL`, `ADMIN_PASSWORD` e `ADMIN_NAME`.
4. Execute `npm run db:setup`.
5. Execute `npm run dev`.
6. Acesse `/admin`.

## Coolify

Configure:

- `DATABASE_URL`: connection string interna do PostgreSQL do Universo.
- `APP_URL=https://www.carolsol.com.br`
- `SESSION_COOKIE_SECURE=true`
- `JWT_SECRET` longo e exclusivo para assinar a sessão local.
- `SSO_ALLOWED_ORIGINS` apenas para origens adicionais de desenvolvimento; os domínios CarolSol
  de produção já fazem parte da lista segura. Cookies não são compartilhados entre subdomínios.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` e `ADMIN_NAME` somente durante o primeiro setup.

No terminal da aplicação, execute `npm run db:setup`. Depois que o administrador
for criado, remova `ADMIN_PASSWORD` das variáveis de ambiente. O `db:setup` nunca mais
substitui a senha de uma conta existente; alterações são feitas no painel administrativo.

## Rotas iniciais

- `GET /api/health`: saúde do serviço e conectividade com o banco.
- `GET /api/auth`: sessão atual.
- `POST /api/auth`: login e logout.
- `GET /api/admin/summary`: resumo protegido para administradores.
- `/admin`: painel administrativo inicial.

## Plataforma administrativa

As migrações da pasta `database` são aplicadas em ordem pelo comando
`npm run db:setup`. A plataforma inclui configurações institucionais, CMS,
biblioteca de mídias, participantes do Projeto Elo, módulos independentes e
trilha de auditoria.

- `GET /api/admin/data?section=...`: consulta protegida dos módulos.
- `POST /api/admin/data`: gravação administrativa protegida e auditada.

O banco do sistema de agendamento permanece independente e não é acessado por
estas tabelas.

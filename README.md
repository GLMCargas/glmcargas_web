# GLM Cargas Web

Projeto web separado do aplicativo Flutter, pensado para empresas publicarem cargas com contexto operacional claro e compatibilidade com a frota.

## Rodando localmente

```bash
npm install
npm run dev
```

As configuracoes do Supabase podem vir de:

- `.env.development` para desenvolvimento
- `.env.production` para producao
- `.env.local` para sobrescrever localmente

O projeto aceita tanto variaveis `VITE_*` quanto `NEXT_PUBLIC_*`, mas no Vite o padrao recomendado e `VITE_*`.

## Build

```bash
npm run build
```

## Firebase Hosting

O projeto esta preparado para publicar no Firebase Hosting com GitHub Actions.

Arquivos adicionados:

- `firebase.json` com SPA rewrite para `index.html`
- `.github/workflows/firebase-preview.yml` para previews em pull requests
- `.github/workflows/firebase-dev.yml` para publicar a branch `dev` no canal `dev`
- `.github/workflows/firebase-production.yml` para publicar a branch `production` no canal `live`

No GitHub, configure:

- repository variable `FIREBASE_PROJECT_ID`
- repository secret `FIREBASE_SERVICE_ACCOUNT`

O `FIREBASE_SERVICE_ACCOUNT` deve conter o JSON completo da service account com permissao de deploy no Firebase Hosting.

## Supabase

Este projeto usa ambientes separados de Supabase para desenvolvimento e producao.

1. Abra o SQL Editor do Supabase.
2. Rode o script `supabase/schema.sql`.
3. Inicie o front e publique uma carga pela pagina web.

O script cria:

- `public.empresas_web`
- `public.cargas_web`
- `public.publicar_carga_web(...)`

O front envia o formulario para a RPC `publicar_carga_web`, que exige usuario autenticado, faz o upsert da empresa e grava a carga.

## Login

O portal web agora usa `Supabase Auth` com e-mail e senha. A empresa precisa estar autenticada para publicar cargas.

## Dashboard

Depois do login, a empresa consegue:

- listar as cargas vinculadas a sua conta
- ver publicadas, rascunhos e encerradas
- mudar o status entre `publicada`, `rascunho` e `encerrada`

## Admin

O script SQL tambem cria a tabela `public.web_admin_users`.

Para liberar a visao administrativa para um usuario, cadastre o `auth_user_id` ou o e-mail dele nessa tabela. O painel admin permite:

- buscar por empresa, produto, cidade, UF e tipo de veiculo
- filtrar por status
- visualizar cargas de todas as empresas

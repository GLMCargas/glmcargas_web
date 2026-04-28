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
- `.firebaserc` com targets `production` e `dev`
- `.github/workflows/firebase-preview.yml` para previews em pull requests
- `.github/workflows/firebase-dev.yml` para publicar a branch `dev` no site `glmcargas-web-dev`
- `.github/workflows/firebase-production.yml` para publicar a branch `production` no site `glmcargas-web`

No GitHub, configure:

- repository variable `FIREBASE_PROJECT_ID`
- repository secret `FIREBASE_SERVICE_ACCOUNT`
- repository variable `VITE_SUPABASE_URL` para producao
- repository secret `VITE_SUPABASE_PUBLISHABLE_KEY` para producao
- repository variable `VITE_SUPABASE_DEV_URL` para desenvolvimento e previews
- repository secret `VITE_SUPABASE_DEV_PUBLISHABLE_KEY` para desenvolvimento e previews

O `FIREBASE_SERVICE_ACCOUNT` deve conter o JSON completo da service account com permissao de deploy no Firebase Hosting.

No Firebase Hosting, os deploys estao separados por site:

- `production` -> `glmcargas-web`
- `dev` -> `glmcargas-web-dev`

## Supabase

Este projeto usa ambientes separados de Supabase para desenvolvimento e producao.

1. Abra o SQL Editor do Supabase.
2. Rode o script `supabase/schema.sql`.
3. Inicie o front e publique uma carga pela pagina web.

O script cria:

- `public.empresas_web`
- `public.cargas_web`
- `public.candidaturas_web`
- `public.salvar_empresa_web(...)`
- `public.publicar_carga_web(...)`
- `public.listar_cargas_disponiveis_web(...)`
- `public.aceitar_carga_web(...)`
- `public.minhas_cargas_aceitas_web()`
- `public.empresa_listar_aceites_carga_web(...)`

O front atual continua usando a RPC `publicar_carga_web`, que exige usuario autenticado, garante o perfil de empresa e grava a carga.

## Login

O portal web usa `Supabase Auth` com e-mail e senha.

- empresa autenticada pode publicar e administrar suas cargas
- motorista autenticado pode consultar e aceitar cargas por outro cliente, como o app Flutter

Este projeto web nao mantem cadastro de motorista. A parte do motorista deve consumir as RPCs do schema usando o mesmo `auth.users.id` do Supabase.

## Motorista por Flutter

Para o projeto Flutter do motorista, o fluxo esperado e:

- listar cargas publicadas com `public.listar_cargas_disponiveis_web(...)`
- aceitar uma carga com `public.aceitar_carga_web(...)`
- listar as cargas ja aceitas com `public.minhas_cargas_aceitas_web()`

A tabela `public.candidaturas_web` guarda o aceite do motorista e tambem um snapshot opcional dos dados enviados no momento do aceite, como nome, telefone, cidade base, tipo de veiculo e RNTRC/ANTT.

## Chat empresa-motorista

O chat usa a candidatura como conversa. Depois que o motorista aceita uma carga, o `candidatura_id` passa a ser o identificador do canal entre a empresa dona da carga e o motorista.

RPCs para o portal da empresa:

- `public.empresa_listar_conversas_chat_web()` lista as conversas das cargas da empresa autenticada
- `public.listar_mensagens_chat_web(p_candidatura_id)` lista as mensagens da conversa
- `public.enviar_mensagem_chat_web(p_candidatura_id, p_mensagem)` envia mensagem como empresa

RPCs para o app Flutter do motorista:

- `public.motorista_listar_conversas_chat_web()` lista as conversas das cargas aceitas pelo motorista autenticado
- `public.listar_mensagens_chat_web(p_candidatura_id)` lista as mensagens da conversa
- `public.enviar_mensagem_chat_web(p_candidatura_id, p_mensagem)` envia mensagem como motorista

A tabela `public.chat_messages_web` guarda as mensagens e identifica o remetente com `sender_role`, usando `empresa` ou `motorista`. As funcoes validam o usuario autenticado antes de listar ou enviar mensagens.

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

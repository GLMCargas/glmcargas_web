# GLM Cargas Web

Projeto web separado do aplicativo Flutter, pensado para empresas publicarem cargas com contexto operacional claro e compatibilidade com a frota.

## Rodando localmente

```bash
npm install
npm run dev
```

Se quiser sobrescrever a conexao padrao do Supabase, copie `.env.example` para `.env.local`.

## Build

```bash
npm run build
```

## Supabase

Este projeto usa o mesmo projeto Supabase do aplicativo Flutter por padrao.

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

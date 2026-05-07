create extension if not exists pgcrypto;

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.empresas_web (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  nome text not null,
  cnpj text not null unique,
  responsavel text not null,
  telefone text not null,
  email text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.cargas_web (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas_web(id) on delete restrict,
  status text not null default 'publicada' check (status in ('publicada', 'rascunho', 'encerrada')),
  cidade_coleta text not null,
  uf_coleta char(2) not null,
  data_coleta date,
  cidade_entrega text not null,
  uf_entrega char(2) not null,
  prazo_entrega date,
  produto text not null,
  peso_total text not null,
  valor_frete numeric(12, 2),
  valor_frete_texto text,
  tipo_veiculo text not null,
  tipo_carroceria text not null,
  categoria_carga text not null,
  janela_carregamento text,
  exigencias_motorista text,
  observacoes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.web_admin_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  email text unique,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists cargas_web_empresa_id_idx on public.cargas_web (empresa_id);
create index if not exists cargas_web_status_idx on public.cargas_web (status);
create index if not exists cargas_web_origem_idx on public.cargas_web (uf_coleta, cidade_coleta);

drop trigger if exists empresas_web_set_updated_at on public.empresas_web;
create trigger empresas_web_set_updated_at
before update on public.empresas_web
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists cargas_web_set_updated_at on public.cargas_web;
create trigger cargas_web_set_updated_at
before update on public.cargas_web
for each row
execute function public.set_current_timestamp_updated_at();

alter table public.empresas_web enable row level security;
alter table public.cargas_web enable row level security;

drop policy if exists "service_role_manage_empresas_web" on public.empresas_web;
create policy "service_role_manage_empresas_web"
on public.empresas_web
for all
to service_role
using (true)
with check (true);

drop policy if exists "service_role_manage_cargas_web" on public.cargas_web;
create policy "service_role_manage_cargas_web"
on public.cargas_web
for all
to service_role
using (true)
with check (true);

alter table public.web_admin_users enable row level security;

drop policy if exists "service_role_manage_web_admin_users" on public.web_admin_users;
create policy "service_role_manage_web_admin_users"
on public.web_admin_users
for all
to service_role
using (true)
with check (true);

drop policy if exists "authenticated_select_own_empresas_web" on public.empresas_web;
create policy "authenticated_select_own_empresas_web"
on public.empresas_web
for select
to authenticated
using (auth.uid() = auth_user_id);

drop policy if exists "authenticated_select_own_cargas_web" on public.cargas_web;
create policy "authenticated_select_own_cargas_web"
on public.cargas_web
for select
to authenticated
using (
  exists (
    select 1
    from public.empresas_web ew
    where ew.id = cargas_web.empresa_id
      and ew.auth_user_id = auth.uid()
  )
);

create or replace function public.publicar_carga_web(
  p_status text,
  p_empresa_nome text,
  p_empresa_cnpj text,
  p_empresa_responsavel text,
  p_empresa_telefone text,
  p_empresa_email text,
  p_cidade_coleta text,
  p_uf_coleta text,
  p_data_coleta date,
  p_cidade_entrega text,
  p_uf_entrega text,
  p_prazo_entrega date,
  p_produto text,
  p_peso_total text,
  p_valor_frete numeric,
  p_valor_frete_texto text,
  p_tipo_veiculo text,
  p_tipo_carroceria text,
  p_categoria_carga text,
  p_janela_carregamento text,
  p_exigencias_motorista text,
  p_observacoes text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_user_id uuid;
  v_empresa_id uuid;
  v_carga_id uuid;
begin
  v_auth_user_id := auth.uid();

  if v_auth_user_id is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  insert into public.empresas_web (
    auth_user_id,
    nome,
    cnpj,
    responsavel,
    telefone,
    email
  )
  values (
    v_auth_user_id,
    trim(p_empresa_nome),
    trim(p_empresa_cnpj),
    trim(p_empresa_responsavel),
    trim(p_empresa_telefone),
    nullif(trim(coalesce(p_empresa_email, '')), '')
  )
  on conflict (cnpj)
  do update set
    nome = excluded.nome,
    responsavel = excluded.responsavel,
    telefone = excluded.telefone,
    email = excluded.email,
    updated_at = timezone('utc', now())
  where public.empresas_web.auth_user_id is null
    or public.empresas_web.auth_user_id = v_auth_user_id
  returning id into v_empresa_id;

  if v_empresa_id is null then
    raise exception 'Empresa ja vinculada a outro usuario autenticado.';
  end if;

  insert into public.cargas_web (
    empresa_id,
    status,
    cidade_coleta,
    uf_coleta,
    data_coleta,
    cidade_entrega,
    uf_entrega,
    prazo_entrega,
    produto,
    peso_total,
    valor_frete,
    valor_frete_texto,
    tipo_veiculo,
    tipo_carroceria,
    categoria_carga,
    janela_carregamento,
    exigencias_motorista,
    observacoes
  )
  values (
    v_empresa_id,
    case
      when p_status in ('publicada', 'rascunho', 'encerrada') then p_status
      else 'publicada'
    end,
    trim(p_cidade_coleta),
    upper(trim(p_uf_coleta)),
    p_data_coleta,
    trim(p_cidade_entrega),
    upper(trim(p_uf_entrega)),
    p_prazo_entrega,
    trim(p_produto),
    trim(p_peso_total),
    p_valor_frete,
    nullif(trim(coalesce(p_valor_frete_texto, '')), ''),
    trim(p_tipo_veiculo),
    trim(p_tipo_carroceria),
    trim(p_categoria_carga),
    nullif(trim(coalesce(p_janela_carregamento, '')), ''),
    nullif(trim(coalesce(p_exigencias_motorista, '')), ''),
    nullif(trim(coalesce(p_observacoes, '')), '')
  )
  returning id into v_carga_id;

  return v_carga_id;
end;
$$;

revoke all on function public.publicar_carga_web(
  text, text, text, text, text, text, text, text, date, text, text, date, text, text, numeric, text, text, text, text, text, text, text
) from public;

grant execute on function public.publicar_carga_web(
  text, text, text, text, text, text, text, text, date, text, text, date, text, text, numeric, text, text, text, text, text, text, text
) to anon, authenticated, service_role;

create or replace function public.atualizar_carga_web(
  p_carga_id uuid,
  p_status text,
  p_empresa_nome text,
  p_empresa_cnpj text,
  p_empresa_responsavel text,
  p_empresa_telefone text,
  p_empresa_email text,
  p_cidade_coleta text,
  p_uf_coleta text,
  p_data_coleta date,
  p_cidade_entrega text,
  p_uf_entrega text,
  p_prazo_entrega date,
  p_produto text,
  p_peso_total text,
  p_valor_frete numeric,
  p_valor_frete_texto text,
  p_tipo_veiculo text,
  p_tipo_carroceria text,
  p_categoria_carga text,
  p_janela_carregamento text,
  p_exigencias_motorista text,
  p_observacoes text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_user_id uuid;
  v_empresa_id uuid;
  v_carga_id uuid;
  v_has_accepted_driver boolean;
begin
  v_auth_user_id := auth.uid();

  if v_auth_user_id is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  if p_status not in ('publicada', 'rascunho', 'encerrada') then
    raise exception 'Status invalido.';
  end if;

  select e.id
  into v_empresa_id
  from public.cargas_web c
  join public.empresas_web e on e.id = c.empresa_id
  where c.id = p_carga_id
    and e.auth_user_id = v_auth_user_id;

  if v_empresa_id is null then
    raise exception 'Carga nao encontrada para a conta autenticada.';
  end if;

  select exists (
    select 1
    from public."Viagens" v
    join public.solicitacoes_viagem s on s.viagem_id = v.id
    where v.empresa_user_id = v_auth_user_id
      and s.status = 'Aceita'
      and lower(trim(coalesce(v.produto, ''))) = lower(trim(coalesce(p_produto, '')))
      and lower(trim(coalesce(v.origem_cidade, ''))) = lower(trim(coalesce(p_cidade_coleta, '')))
      and upper(trim(coalesce(v.origem_uf, ''))) = upper(trim(coalesce(p_uf_coleta, '')))
      and lower(trim(coalesce(v.destino_cidade, ''))) = lower(trim(coalesce(p_cidade_entrega, '')))
      and upper(trim(coalesce(v.destino_uf, ''))) = upper(trim(coalesce(p_uf_entrega, '')))
  ) into v_has_accepted_driver;

  if v_has_accepted_driver then
    raise exception 'Esta carga ja possui um motorista aceito e nao pode mais ser editada.';
  end if;

  update public.empresas_web
  set
    nome = trim(p_empresa_nome),
    cnpj = trim(p_empresa_cnpj),
    responsavel = trim(p_empresa_responsavel),
    telefone = trim(p_empresa_telefone),
    email = nullif(trim(coalesce(p_empresa_email, '')), ''),
    updated_at = timezone('utc', now())
  where id = v_empresa_id;

  update public.cargas_web
  set
    status = p_status,
    cidade_coleta = trim(p_cidade_coleta),
    uf_coleta = upper(trim(p_uf_coleta)),
    data_coleta = p_data_coleta,
    cidade_entrega = trim(p_cidade_entrega),
    uf_entrega = upper(trim(p_uf_entrega)),
    prazo_entrega = p_prazo_entrega,
    produto = trim(p_produto),
    peso_total = trim(p_peso_total),
    valor_frete = p_valor_frete,
    valor_frete_texto = nullif(trim(coalesce(p_valor_frete_texto, '')), ''),
    tipo_veiculo = trim(p_tipo_veiculo),
    tipo_carroceria = trim(p_tipo_carroceria),
    categoria_carga = trim(p_categoria_carga),
    janela_carregamento = nullif(trim(coalesce(p_janela_carregamento, '')), ''),
    exigencias_motorista = nullif(trim(coalesce(p_exigencias_motorista, '')), ''),
    observacoes = nullif(trim(coalesce(p_observacoes, '')), ''),
    updated_at = timezone('utc', now())
  where id = p_carga_id
    and empresa_id = v_empresa_id
  returning id into v_carga_id;

  if v_carga_id is null then
    raise exception 'Nao foi possivel atualizar a carga.';
  end if;

  return v_carga_id;
end;
$$;

revoke all on function public.atualizar_carga_web(
  uuid, text, text, text, text, text, text, text, text, date, text, text, date, text, text, numeric, text, text, text, text, text, text, text
) from public;

grant execute on function public.atualizar_carga_web(
  uuid, text, text, text, text, text, text, text, text, date, text, text, date, text, text, numeric, text, text, text, text, text, text, text
) to authenticated, service_role;

create or replace function public.minhas_cargas_web()
returns table (
  id uuid,
  status text,
  empresa_nome text,
  cidade_coleta text,
  uf_coleta char(2),
  data_coleta date,
  cidade_entrega text,
  uf_entrega char(2),
  prazo_entrega date,
  produto text,
  peso_total text,
  valor_frete numeric,
  valor_frete_texto text,
  tipo_veiculo text,
  tipo_carroceria text,
  categoria_carga text,
  janela_carregamento text,
  exigencias_motorista text,
  observacoes text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    c.id,
    c.status,
    e.nome as empresa_nome,
    c.cidade_coleta,
    c.uf_coleta,
    c.data_coleta,
    c.cidade_entrega,
    c.uf_entrega,
    c.prazo_entrega,
    c.produto,
    c.peso_total,
    c.valor_frete,
    c.valor_frete_texto,
    c.tipo_veiculo,
    c.tipo_carroceria,
    c.categoria_carga,
    c.janela_carregamento,
    c.exigencias_motorista,
    c.observacoes,
    c.created_at,
    c.updated_at
  from public.cargas_web c
  join public.empresas_web e on e.id = c.empresa_id
  where e.auth_user_id = auth.uid()
  order by c.created_at desc;
$$;

revoke all on function public.minhas_cargas_web() from public;
grant execute on function public.minhas_cargas_web() to authenticated, service_role;

create or replace function public.atualizar_status_carga_web(
  p_carga_id uuid,
  p_status text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_carga_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  if p_status not in ('publicada', 'rascunho', 'encerrada') then
    raise exception 'Status invalido.';
  end if;

  update public.cargas_web c
  set
    status = p_status,
    updated_at = timezone('utc', now())
  from public.empresas_web e
  where c.id = p_carga_id
    and e.id = c.empresa_id
    and e.auth_user_id = auth.uid()
  returning c.id into v_carga_id;

  if v_carga_id is null then
    raise exception 'Carga nao encontrada para a conta autenticada.';
  end if;

  return v_carga_id;
end;
$$;

revoke all on function public.atualizar_status_carga_web(uuid, text) from public;
grant execute on function public.atualizar_status_carga_web(uuid, text) to authenticated, service_role;

create or replace function public.is_web_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.web_admin_users wau
    where wau.auth_user_id = auth.uid()
       or lower(coalesce(wau.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_web_admin() from public;
grant execute on function public.is_web_admin() to authenticated, service_role;

create or replace function public.admin_listar_cargas_web(
  p_status text default null,
  p_busca text default null
)
returns table (
  id uuid,
  status text,
  empresa_nome text,
  empresa_cnpj text,
  empresa_responsavel text,
  empresa_telefone text,
  empresa_email text,
  cidade_coleta text,
  uf_coleta char(2),
  data_coleta date,
  cidade_entrega text,
  uf_entrega char(2),
  prazo_entrega date,
  produto text,
  peso_total text,
  valor_frete numeric,
  valor_frete_texto text,
  tipo_veiculo text,
  tipo_carroceria text,
  categoria_carga text,
  janela_carregamento text,
  exigencias_motorista text,
  observacoes text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_web_admin() then
    raise exception 'Usuario sem permissao administrativa.';
  end if;

  return query
  select
    c.id,
    c.status,
    e.nome as empresa_nome,
    e.cnpj as empresa_cnpj,
    e.responsavel as empresa_responsavel,
    e.telefone as empresa_telefone,
    e.email as empresa_email,
    c.cidade_coleta,
    c.uf_coleta,
    c.data_coleta,
    c.cidade_entrega,
    c.uf_entrega,
    c.prazo_entrega,
    c.produto,
    c.peso_total,
    c.valor_frete,
    c.valor_frete_texto,
    c.tipo_veiculo,
    c.tipo_carroceria,
    c.categoria_carga,
    c.janela_carregamento,
    c.exigencias_motorista,
    c.observacoes,
    c.created_at,
    c.updated_at
  from public.cargas_web c
  join public.empresas_web e on e.id = c.empresa_id
  where (p_status is null or p_status = '' or c.status = p_status)
    and (
      p_busca is null
      or p_busca = ''
      or e.nome ilike '%' || p_busca || '%'
      or e.cnpj ilike '%' || p_busca || '%'
      or c.produto ilike '%' || p_busca || '%'
      or c.cidade_coleta ilike '%' || p_busca || '%'
      or c.cidade_entrega ilike '%' || p_busca || '%'
      or c.uf_coleta ilike '%' || p_busca || '%'
      or c.uf_entrega ilike '%' || p_busca || '%'
      or c.tipo_veiculo ilike '%' || p_busca || '%'
      or c.tipo_carroceria ilike '%' || p_busca || '%'
    )
  order by c.created_at desc;
end;
$$;

revoke all on function public.admin_listar_cargas_web(text, text) from public;
grant execute on function public.admin_listar_cargas_web(text, text) to authenticated, service_role;

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
  tipo_pessoa text not null default 'juridica',
  nome text not null,
  cpf text unique,
  cnpj text unique,
  responsavel text,
  telefone text not null,
  email text,
  cep text,
  logradouro text,
  numero_endereco text,
  complemento text,
  bairro text,
  cidade text,
  uf char(2),
  vinculado_nome text,
  vinculado_cpf text,
  vinculado_cnpj text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.empresas_web
  add column if not exists tipo_pessoa text;

alter table public.empresas_web
  add column if not exists cpf text;

alter table public.empresas_web
  add column if not exists cep text;

alter table public.empresas_web
  add column if not exists logradouro text;

alter table public.empresas_web
  add column if not exists numero_endereco text;

alter table public.empresas_web
  add column if not exists complemento text;

alter table public.empresas_web
  add column if not exists bairro text;

alter table public.empresas_web
  add column if not exists cidade text;

alter table public.empresas_web
  add column if not exists uf char(2);

alter table public.empresas_web
  add column if not exists vinculado_nome text;

alter table public.empresas_web
  add column if not exists vinculado_cpf text;

alter table public.empresas_web
  add column if not exists vinculado_cnpj text;

alter table public.empresas_web
  alter column tipo_pessoa set default 'juridica';

alter table public.empresas_web
  alter column cnpj drop not null;

alter table public.empresas_web
  alter column responsavel drop not null;

update public.empresas_web
set
  tipo_pessoa = case
    when coalesce(nullif(trim(coalesce(cpf, '')), ''), null) is not null then 'fisica'
    else 'juridica'
  end,
  cpf = nullif(trim(coalesce(cpf, '')), ''),
  cnpj = nullif(trim(coalesce(cnpj, '')), ''),
  responsavel = nullif(trim(coalesce(responsavel, '')), ''),
  cep = nullif(trim(coalesce(cep, '')), ''),
  logradouro = nullif(trim(coalesce(logradouro, '')), ''),
  numero_endereco = nullif(trim(coalesce(numero_endereco, '')), ''),
  complemento = nullif(trim(coalesce(complemento, '')), ''),
  bairro = nullif(trim(coalesce(bairro, '')), ''),
  cidade = nullif(trim(coalesce(cidade, '')), ''),
  uf = nullif(upper(trim(coalesce(uf, ''))), ''),
  vinculado_nome = nullif(trim(coalesce(vinculado_nome, '')), ''),
  vinculado_cpf = nullif(trim(coalesce(vinculado_cpf, '')), ''),
  vinculado_cnpj = nullif(trim(coalesce(vinculado_cnpj, '')), '')
where tipo_pessoa is null
   or trim(tipo_pessoa) = ''
   or cpf is not null
   or cnpj is not null
   or responsavel is not null;

alter table public.empresas_web
  alter column tipo_pessoa set not null;

create unique index if not exists empresas_web_cpf_key
on public.empresas_web (cpf);

create unique index if not exists empresas_web_vinculado_cpf_key
on public.empresas_web (vinculado_cpf);

create unique index if not exists empresas_web_vinculado_cnpj_key
on public.empresas_web (vinculado_cnpj);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'empresas_web_tipo_pessoa_check'
  ) then
    alter table public.empresas_web
      add constraint empresas_web_tipo_pessoa_check
      check (tipo_pessoa in ('fisica', 'juridica'));
  end if;
end;
$$;

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

create table if not exists public.candidaturas_web (
  id uuid primary key default gen_random_uuid(),
  carga_id uuid not null references public.cargas_web(id) on delete cascade,
  motorista_auth_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'aceita' check (status in ('aceita', 'contatado', 'recusado', 'aprovado', 'cancelada')),
  mensagem text,
  motorista_nome text,
  motorista_telefone text,
  motorista_email text,
  motorista_cidade_base text,
  motorista_uf_base char(2),
  motorista_tipo_veiculo text,
  motorista_tipo_carroceria text,
  motorista_rntrc_antt text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (carga_id, motorista_auth_user_id)
);

create table if not exists public.web_admin_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  email text unique,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.chat_messages_web (
  id uuid primary key default gen_random_uuid(),
  candidatura_id uuid not null references public.candidaturas_web(id) on delete cascade,
  sender_auth_user_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('empresa', 'motorista')),
  mensagem text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists cargas_web_empresa_id_idx on public.cargas_web (empresa_id);
create index if not exists cargas_web_status_idx on public.cargas_web (status);
create index if not exists cargas_web_origem_idx on public.cargas_web (uf_coleta, cidade_coleta);
create index if not exists candidaturas_web_carga_id_idx on public.candidaturas_web (carga_id);
create index if not exists candidaturas_web_motorista_auth_user_id_idx on public.candidaturas_web (motorista_auth_user_id);
create index if not exists candidaturas_web_status_idx on public.candidaturas_web (status);
create index if not exists chat_messages_web_candidatura_id_created_at_idx on public.chat_messages_web (candidatura_id, created_at);
create index if not exists chat_messages_web_sender_auth_user_id_idx on public.chat_messages_web (sender_auth_user_id);

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

drop trigger if exists candidaturas_web_set_updated_at on public.candidaturas_web;
create trigger candidaturas_web_set_updated_at
before update on public.candidaturas_web
for each row
execute function public.set_current_timestamp_updated_at();

alter table public.empresas_web enable row level security;
alter table public.cargas_web enable row level security;
alter table public.candidaturas_web enable row level security;
alter table public.web_admin_users enable row level security;
alter table public.chat_messages_web enable row level security;

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

drop policy if exists "service_role_manage_candidaturas_web" on public.candidaturas_web;
create policy "service_role_manage_candidaturas_web"
on public.candidaturas_web
for all
to service_role
using (true)
with check (true);

drop policy if exists "service_role_manage_web_admin_users" on public.web_admin_users;
create policy "service_role_manage_web_admin_users"
on public.web_admin_users
for all
to service_role
using (true)
with check (true);

drop policy if exists "service_role_manage_chat_messages_web" on public.chat_messages_web;
create policy "service_role_manage_chat_messages_web"
on public.chat_messages_web
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

drop policy if exists "authenticated_select_own_candidaturas_motorista_web" on public.candidaturas_web;
create policy "authenticated_select_own_candidaturas_motorista_web"
on public.candidaturas_web
for select
to authenticated
using (auth.uid() = motorista_auth_user_id);

drop policy if exists "authenticated_select_own_candidaturas_empresa_web" on public.candidaturas_web;
create policy "authenticated_select_own_candidaturas_empresa_web"
on public.candidaturas_web
for select
to authenticated
using (
  exists (
    select 1
    from public.cargas_web c
    join public.empresas_web e on e.id = c.empresa_id
    where c.id = candidaturas_web.carga_id
      and e.auth_user_id = auth.uid()
  )
);

drop policy if exists "authenticated_select_own_chat_messages_web" on public.chat_messages_web;
create policy "authenticated_select_own_chat_messages_web"
on public.chat_messages_web
for select
to authenticated
using (
  exists (
    select 1
    from public.candidaturas_web cd
    join public.cargas_web c on c.id = cd.carga_id
    join public.empresas_web e on e.id = c.empresa_id
    where cd.id = chat_messages_web.candidatura_id
      and (
        cd.motorista_auth_user_id = auth.uid()
        or e.auth_user_id = auth.uid()
      )
  )
);

create or replace function public.salvar_conta_web(
  p_tipo_pessoa text,
  p_nome text,
  p_cpf text,
  p_cnpj text,
  p_telefone text,
  p_email text,
  p_responsavel text default null,
  p_cep text default null,
  p_logradouro text default null,
  p_numero_endereco text default null,
  p_complemento text default null,
  p_bairro text default null,
  p_cidade text default null,
  p_uf text default null,
  p_vinculado_nome text default null,
  p_vinculado_cpf text default null,
  p_vinculado_cnpj text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_user_id uuid;
  v_tipo_pessoa text;
  v_nome text;
  v_cpf text;
  v_cnpj text;
  v_responsavel text;
  v_telefone text;
  v_email text;
  v_cep text;
  v_logradouro text;
  v_numero_endereco text;
  v_complemento text;
  v_bairro text;
  v_cidade text;
  v_uf text;
  v_vinculado_nome text;
  v_vinculado_cpf text;
  v_vinculado_cnpj text;
  v_conta_id uuid;
begin
  v_auth_user_id := auth.uid();
  v_tipo_pessoa := lower(trim(coalesce(p_tipo_pessoa, '')));
  v_nome := trim(coalesce(p_nome, ''));
  v_cpf := trim(coalesce(p_cpf, ''));
  v_cnpj := trim(coalesce(p_cnpj, ''));
  v_responsavel := nullif(trim(coalesce(p_responsavel, '')), '');
  v_telefone := trim(coalesce(p_telefone, ''));
  v_cep := nullif(trim(coalesce(p_cep, '')), '');
  v_logradouro := nullif(trim(coalesce(p_logradouro, '')), '');
  v_numero_endereco := nullif(trim(coalesce(p_numero_endereco, '')), '');
  v_complemento := nullif(trim(coalesce(p_complemento, '')), '');
  v_bairro := nullif(trim(coalesce(p_bairro, '')), '');
  v_cidade := nullif(trim(coalesce(p_cidade, '')), '');
  v_uf := nullif(upper(trim(coalesce(p_uf, ''))), '');
  v_vinculado_nome := nullif(trim(coalesce(p_vinculado_nome, '')), '');
  v_vinculado_cpf := nullif(trim(coalesce(p_vinculado_cpf, '')), '');
  v_vinculado_cnpj := nullif(trim(coalesce(p_vinculado_cnpj, '')), '');
  v_email := coalesce(
    nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(coalesce(auth.jwt() ->> 'email', '')), '')
  );

  if v_auth_user_id is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  if v_tipo_pessoa not in ('fisica', 'juridica') then
    raise exception 'Tipo de conta invalido.';
  end if;

  if v_nome = '' or v_telefone = '' then
    raise exception 'Dados principais da conta incompletos.';
  end if;

  if v_tipo_pessoa = 'fisica' then
    if v_cpf = '' then
      raise exception 'Informe o CPF para o cadastro de pessoa fisica.';
    end if;

    v_cnpj := null;
    v_vinculado_cpf := null;
  else
    if v_cnpj = '' then
      raise exception 'Informe o CNPJ para o cadastro de pessoa juridica.';
    end if;

    v_cpf := null;
    v_vinculado_cnpj := null;
  end if;

  v_cpf := nullif(v_cpf, '');
  v_cnpj := nullif(v_cnpj, '');

  select ew.id
  into v_conta_id
  from public.empresas_web ew
  where ew.auth_user_id = v_auth_user_id
  limit 1;

  if v_conta_id is not null then
    if v_cpf is not null and exists (
      select 1
      from public.empresas_web ew
      where ew.cpf = v_cpf
        and ew.id <> v_conta_id
    ) then
      raise exception 'Ja existe outra conta com este CPF.';
    end if;

    if v_cnpj is not null and exists (
      select 1
      from public.empresas_web ew
      where ew.cnpj = v_cnpj
        and ew.id <> v_conta_id
    ) then
      raise exception 'Ja existe outra conta com este CNPJ.';
    end if;

    if v_vinculado_cpf is not null and exists (
      select 1
      from public.empresas_web ew
      where ew.vinculado_cpf = v_vinculado_cpf
        and ew.id <> v_conta_id
    ) then
      raise exception 'Ja existe outra conta com esta pessoa fisica vinculada.';
    end if;

    if v_vinculado_cnpj is not null and exists (
      select 1
      from public.empresas_web ew
      where ew.vinculado_cnpj = v_vinculado_cnpj
        and ew.id <> v_conta_id
    ) then
      raise exception 'Ja existe outra conta com esta empresa vinculada.';
    end if;

    update public.empresas_web
    set
      tipo_pessoa = v_tipo_pessoa,
      nome = v_nome,
      cpf = v_cpf,
      cnpj = v_cnpj,
      responsavel = v_responsavel,
      telefone = v_telefone,
      email = v_email,
      cep = v_cep,
      logradouro = v_logradouro,
      numero_endereco = v_numero_endereco,
      complemento = v_complemento,
      bairro = v_bairro,
      cidade = v_cidade,
      uf = v_uf,
      vinculado_nome = v_vinculado_nome,
      vinculado_cpf = v_vinculado_cpf,
      vinculado_cnpj = v_vinculado_cnpj,
      updated_at = timezone('utc', now())
    where id = v_conta_id
    returning id into v_conta_id;

    return v_conta_id;
  end if;

  update public.empresas_web
  set
    auth_user_id = v_auth_user_id,
    tipo_pessoa = v_tipo_pessoa,
    nome = v_nome,
    cpf = v_cpf,
    cnpj = v_cnpj,
    responsavel = v_responsavel,
    telefone = v_telefone,
    email = v_email,
    cep = v_cep,
    logradouro = v_logradouro,
    numero_endereco = v_numero_endereco,
    complemento = v_complemento,
    bairro = v_bairro,
    cidade = v_cidade,
    uf = v_uf,
    vinculado_nome = v_vinculado_nome,
    vinculado_cpf = v_vinculado_cpf,
    vinculado_cnpj = v_vinculado_cnpj,
    updated_at = timezone('utc', now())
  where (
      (v_tipo_pessoa = 'fisica' and cpf = v_cpf)
      or (v_tipo_pessoa = 'juridica' and cnpj = v_cnpj)
    )
    and (auth_user_id is null or auth_user_id = v_auth_user_id)
  returning id into v_conta_id;

  if v_conta_id is not null then
    return v_conta_id;
  end if;

  begin
    insert into public.empresas_web (
      auth_user_id,
      tipo_pessoa,
      nome,
      cpf,
      cnpj,
      responsavel,
      telefone,
      email,
      cep,
      logradouro,
      numero_endereco,
      complemento,
      bairro,
      cidade,
      uf,
      vinculado_nome,
      vinculado_cpf,
      vinculado_cnpj
    )
    values (
      v_auth_user_id,
      v_tipo_pessoa,
      v_nome,
      v_cpf,
      v_cnpj,
      v_responsavel,
      v_telefone,
      v_email,
      v_cep,
      v_logradouro,
      v_numero_endereco,
      v_complemento,
      v_bairro,
      v_cidade,
      v_uf,
      v_vinculado_nome,
      v_vinculado_cpf,
      v_vinculado_cnpj
    )
    returning id into v_conta_id;
  exception
    when unique_violation then
      if v_tipo_pessoa = 'fisica' then
        raise exception 'Conta ja vinculada a outro usuario autenticado com este CPF.';
      end if;

      raise exception 'Conta ja vinculada a outro usuario autenticado com este CNPJ.';
  end;

  return v_conta_id;
end;
$$;

revoke all on function public.salvar_conta_web(text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.salvar_conta_web(text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text) to authenticated, service_role;

create or replace function public.salvar_empresa_web(
  p_nome text,
  p_cnpj text,
  p_responsavel text,
  p_telefone text,
  p_email text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.salvar_conta_web(
    'juridica',
    p_nome,
    null,
    p_cnpj,
    p_telefone,
    p_email,
    p_responsavel
  );
end;
$$;

revoke all on function public.salvar_empresa_web(text, text, text, text, text) from public;
grant execute on function public.salvar_empresa_web(text, text, text, text, text) to authenticated, service_role;

create or replace function public.publicar_carga_web(
  p_status text,
  p_tipo_pessoa text,
  p_nome text,
  p_cpf text,
  p_cnpj text,
  p_telefone text,
  p_email text,
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
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conta_id uuid;
  v_carga_id bigint;
  v_nome_conta text;
  v_conta_auth_user_id uuid;
  v_compatibilidade text;
begin
  if auth.uid() is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  if trim(coalesce(p_cidade_coleta, '')) = ''
    or trim(coalesce(p_uf_coleta, '')) = ''
    or trim(coalesce(p_cidade_entrega, '')) = ''
    or trim(coalesce(p_uf_entrega, '')) = ''
    or trim(coalesce(p_produto, '')) = ''
    or trim(coalesce(p_peso_total, '')) = ''
    or trim(coalesce(p_tipo_veiculo, '')) = ''
    or trim(coalesce(p_tipo_carroceria, '')) = ''
    or trim(coalesce(p_categoria_carga, '')) = '' then
    raise exception 'Dados principais da carga incompletos.';
  end if;

  v_conta_id := public.salvar_conta_web(
    p_tipo_pessoa,
    p_nome,
    p_cpf,
    p_cnpj,
    p_telefone,
    p_email,
    null
  );

  select
    ew.nome,
    ew.auth_user_id
  into
    v_nome_conta,
    v_conta_auth_user_id
  from public.empresas_web ew
  where ew.id = v_conta_id;

  if v_conta_auth_user_id is null then
    raise exception 'Conta nao encontrada para o usuario autenticado.';
  end if;

  v_compatibilidade := nullif(
    trim(
      concat_ws(
        ' / ',
        trim(p_tipo_veiculo),
        trim(p_tipo_carroceria),
        trim(p_categoria_carga)
      )
    ),
    ''
  );

  insert into public."Viagens" (
    empresa,
    empresa_user_id,
    status,
    origem_cidade,
    origem_uf,
    data_coleta,
    destino_cidade,
    destino_uf,
    data_limite_entrega,
    produto,
    peso_texto,
    valor,
    valor_texto,
    tipo_veiculo,
    tipo_carroceria,
    categoria_carga,
    janela_carregamento,
    exigencias_motorista,
    observacoes,
    compatibilidade_veiculo
  )
  values (
    v_nome_conta,
    v_conta_auth_user_id,
    case
      when p_status in ('publicada', 'rascunho', 'encerrada') then p_status
      else 'publicada'
    end,
    trim(p_cidade_coleta),
    upper(trim(p_uf_coleta)),
    p_data_coleta,
    trim(p_cidade_entrega),
    upper(trim(p_uf_entrega)),
    p_prazo_entrega::timestamp,
    trim(p_produto),
    trim(p_peso_total),
    p_valor_frete,
    nullif(trim(coalesce(p_valor_frete_texto, '')), ''),
    trim(p_tipo_veiculo),
    trim(p_tipo_carroceria),
    trim(p_categoria_carga),
    nullif(trim(coalesce(p_janela_carregamento, '')), ''),
    nullif(trim(coalesce(p_exigencias_motorista, '')), ''),
    nullif(trim(coalesce(p_observacoes, '')), ''),
    v_compatibilidade
  )
  returning id into v_carga_id;

  return v_carga_id;
end;
$$;

revoke all on function public.publicar_carga_web(
  text, text, text, text, text, text, text, text, text, date, text, text, date, text, text, numeric, text, text, text, text, text, text, text
) from public;

grant execute on function public.publicar_carga_web(
  text, text, text, text, text, text, text, text, text, date, text, text, date, text, text, numeric, text, text, text, text, text, text, text
) to authenticated, service_role;

create or replace function public.atualizar_carga_web(
  p_carga_id bigint,
  p_status text,
  p_tipo_pessoa text,
  p_nome text,
  p_cpf text,
  p_cnpj text,
  p_telefone text,
  p_email text,
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
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_user_id uuid;
  v_conta_id uuid;
  v_carga_id bigint;
  v_has_accepted_driver boolean;
  v_nome_conta text;
  v_compatibilidade text;
begin
  v_auth_user_id := auth.uid();

  if v_auth_user_id is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  if p_status not in ('publicada', 'rascunho', 'encerrada') then
    raise exception 'Status invalido.';
  end if;

  if trim(coalesce(p_cidade_coleta, '')) = ''
    or trim(coalesce(p_uf_coleta, '')) = ''
    or trim(coalesce(p_cidade_entrega, '')) = ''
    or trim(coalesce(p_uf_entrega, '')) = ''
    or trim(coalesce(p_produto, '')) = ''
    or trim(coalesce(p_peso_total, '')) = ''
    or trim(coalesce(p_tipo_veiculo, '')) = ''
    or trim(coalesce(p_tipo_carroceria, '')) = ''
    or trim(coalesce(p_categoria_carga, '')) = '' then
    raise exception 'Dados principais da carga incompletos.';
  end if;

  v_conta_id := public.salvar_conta_web(
    p_tipo_pessoa,
    p_nome,
    p_cpf,
    p_cnpj,
    p_telefone,
    p_email,
    null
  );

  select ew.nome
  into v_nome_conta
  from public.empresas_web ew
  where ew.id = v_conta_id
    and ew.auth_user_id = v_auth_user_id;

  if v_nome_conta is null then
    raise exception 'Conta nao encontrada para o usuario autenticado.';
  end if;

  select exists (
    select 1
    from public.solicitacoes_viagem s
    where s.viagem_id = p_carga_id
      and s.status = 'Aceita'
  ) into v_has_accepted_driver;

  if v_has_accepted_driver then
    raise exception 'Esta carga ja possui um motorista aceito e nao pode mais ser editada.';
  end if;

  v_compatibilidade := nullif(
    trim(
      concat_ws(
        ' / ',
        trim(p_tipo_veiculo),
        trim(p_tipo_carroceria),
        trim(p_categoria_carga)
      )
    ),
    ''
  );

  update public."Viagens"
  set
    empresa = v_nome_conta,
    empresa_user_id = v_auth_user_id,
    status = p_status,
    origem_cidade = trim(p_cidade_coleta),
    origem_uf = upper(trim(p_uf_coleta)),
    data_coleta = p_data_coleta,
    destino_cidade = trim(p_cidade_entrega),
    destino_uf = upper(trim(p_uf_entrega)),
    data_limite_entrega = p_prazo_entrega::timestamp,
    produto = trim(p_produto),
    peso_texto = trim(p_peso_total),
    valor = p_valor_frete,
    valor_texto = nullif(trim(coalesce(p_valor_frete_texto, '')), ''),
    tipo_veiculo = trim(p_tipo_veiculo),
    tipo_carroceria = trim(p_tipo_carroceria),
    categoria_carga = trim(p_categoria_carga),
    janela_carregamento = nullif(trim(coalesce(p_janela_carregamento, '')), ''),
    exigencias_motorista = nullif(trim(coalesce(p_exigencias_motorista, '')), ''),
    observacoes = nullif(trim(coalesce(p_observacoes, '')), ''),
    compatibilidade_veiculo = v_compatibilidade,
    updated_at = timezone('utc', now())
  where id = p_carga_id
    and empresa_user_id = v_auth_user_id
  returning id into v_carga_id;

  if v_carga_id is null then
    raise exception 'Nao foi possivel atualizar a carga.';
  end if;

  return v_carga_id;
end;
$$;

revoke all on function public.atualizar_carga_web(
  bigint, text, text, text, text, text, text, text, text, text, date, text, text, date, text, text, numeric, text, text, text, text, text, text, text
) from public;

grant execute on function public.atualizar_carga_web(
  bigint, text, text, text, text, text, text, text, text, text, date, text, text, date, text, text, numeric, text, text, text, text, text, text, text
) to authenticated, service_role;

create or replace function public.minhas_cargas_web()
returns table (
  id bigint,
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
    v.id,
    coalesce(v.status, 'publicada') as status,
    coalesce(nullif(trim(v.empresa), ''), e.nome, '') as empresa_nome,
    coalesce(v.origem_cidade, '') as cidade_coleta,
    coalesce(v.origem_uf, '')::char(2) as uf_coleta,
    v.data_coleta,
    coalesce(v.destino_cidade, '') as cidade_entrega,
    coalesce(v.destino_uf, '')::char(2) as uf_entrega,
    v.data_limite_entrega::date as prazo_entrega,
    coalesce(v.produto, '') as produto,
    coalesce(
      nullif(trim(v.peso_texto), ''),
      case when v.peso is null then null else v.peso::text end,
      ''
    ) as peso_total,
    v.valor as valor_frete,
    coalesce(
      nullif(trim(v.valor_texto), ''),
      case when v.valor is null then null else v.valor::text end
    ) as valor_frete_texto,
    coalesce(
      nullif(trim(v.tipo_veiculo), ''),
      nullif(trim(split_part(coalesce(v.compatibilidade_veiculo, ''), ' / ', 1)), ''),
      ''
    ) as tipo_veiculo,
    coalesce(
      nullif(trim(v.tipo_carroceria), ''),
      nullif(trim(split_part(coalesce(v.compatibilidade_veiculo, ''), ' / ', 2)), ''),
      ''
    ) as tipo_carroceria,
    coalesce(
      nullif(trim(v.categoria_carga), ''),
      nullif(trim(split_part(coalesce(v.compatibilidade_veiculo, ''), ' / ', 3)), ''),
      ''
    ) as categoria_carga,
    v.janela_carregamento,
    v.exigencias_motorista,
    v.observacoes,
    v.created_at,
    v.updated_at
  from public."Viagens" v
  left join public.empresas_web e on e.auth_user_id = v.empresa_user_id
  where v.empresa_user_id = auth.uid()
  order by v.created_at desc;
$$;

revoke all on function public.minhas_cargas_web() from public;
grant execute on function public.minhas_cargas_web() to authenticated, service_role;

create or replace function public.atualizar_status_carga_web(
  p_carga_id bigint,
  p_status text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_carga_id bigint;
begin
  if auth.uid() is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  if p_status not in ('publicada', 'rascunho', 'encerrada') then
    raise exception 'Status invalido.';
  end if;

  update public."Viagens" v
  set
    status = p_status,
    updated_at = timezone('utc', now())
  where v.id = p_carga_id
    and v.empresa_user_id = auth.uid()
  returning v.id into v_carga_id;

  if v_carga_id is null then
    raise exception 'Carga nao encontrada para a conta autenticada.';
  end if;

  return v_carga_id;
end;
$$;

revoke all on function public.atualizar_status_carga_web(bigint, text) from public;
grant execute on function public.atualizar_status_carga_web(bigint, text) to authenticated, service_role;

create or replace function public.listar_cargas_disponiveis_web(
  p_busca text default null,
  p_uf_coleta text default null,
  p_tipo_veiculo text default null,
  p_tipo_carroceria text default null
)
returns table (
  id uuid,
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
  meu_status_aceite text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  return query
  select
    c.id,
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
    cd.status as meu_status_aceite,
    c.created_at,
    c.updated_at
  from public.cargas_web c
  join public.empresas_web e on e.id = c.empresa_id
  left join public.candidaturas_web cd
    on cd.carga_id = c.id
   and cd.motorista_auth_user_id = auth.uid()
  where c.status = 'publicada'
    and (
      p_busca is null
      or p_busca = ''
      or e.nome ilike '%' || p_busca || '%'
      or c.produto ilike '%' || p_busca || '%'
      or c.cidade_coleta ilike '%' || p_busca || '%'
      or c.cidade_entrega ilike '%' || p_busca || '%'
      or c.uf_coleta ilike '%' || p_busca || '%'
      or c.uf_entrega ilike '%' || p_busca || '%'
      or c.tipo_veiculo ilike '%' || p_busca || '%'
      or c.tipo_carroceria ilike '%' || p_busca || '%'
      or c.categoria_carga ilike '%' || p_busca || '%'
    )
    and (p_uf_coleta is null or p_uf_coleta = '' or c.uf_coleta = upper(trim(p_uf_coleta)))
    and (
      p_tipo_veiculo is null
      or p_tipo_veiculo = ''
      or lower(c.tipo_veiculo) = lower(trim(p_tipo_veiculo))
    )
    and (
      p_tipo_carroceria is null
      or p_tipo_carroceria = ''
      or lower(c.tipo_carroceria) = lower(trim(p_tipo_carroceria))
    )
  order by c.created_at desc;
end;
$$;

revoke all on function public.listar_cargas_disponiveis_web(text, text, text, text) from public;
grant execute on function public.listar_cargas_disponiveis_web(text, text, text, text) to authenticated, service_role;

create or replace function public.aceitar_carga_web(
  p_carga_id uuid,
  p_mensagem text default null,
  p_motorista_nome text default null,
  p_motorista_telefone text default null,
  p_motorista_email text default null,
  p_motorista_cidade_base text default null,
  p_motorista_uf_base text default null,
  p_motorista_tipo_veiculo text default null,
  p_motorista_tipo_carroceria text default null,
  p_motorista_rntrc_antt text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_candidatura_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  if not exists (
    select 1
    from public.cargas_web c
    where c.id = p_carga_id
      and c.status = 'publicada'
  ) then
    raise exception 'Carga indisponivel para aceite.';
  end if;

  insert into public.candidaturas_web (
    carga_id,
    motorista_auth_user_id,
    status,
    mensagem,
    motorista_nome,
    motorista_telefone,
    motorista_email,
    motorista_cidade_base,
    motorista_uf_base,
    motorista_tipo_veiculo,
    motorista_tipo_carroceria,
    motorista_rntrc_antt
  )
  values (
    p_carga_id,
    auth.uid(),
    'aceita',
    nullif(trim(coalesce(p_mensagem, '')), ''),
    nullif(trim(coalesce(p_motorista_nome, '')), ''),
    nullif(trim(coalesce(p_motorista_telefone, '')), ''),
    nullif(trim(coalesce(p_motorista_email, '')), ''),
    nullif(trim(coalesce(p_motorista_cidade_base, '')), ''),
    nullif(upper(trim(coalesce(p_motorista_uf_base, ''))), ''),
    nullif(trim(coalesce(p_motorista_tipo_veiculo, '')), ''),
    nullif(trim(coalesce(p_motorista_tipo_carroceria, '')), ''),
    nullif(trim(coalesce(p_motorista_rntrc_antt, '')), '')
  )
  on conflict (carga_id, motorista_auth_user_id)
  do update set
    mensagem = excluded.mensagem,
    motorista_nome = excluded.motorista_nome,
    motorista_telefone = excluded.motorista_telefone,
    motorista_email = excluded.motorista_email,
    motorista_cidade_base = excluded.motorista_cidade_base,
    motorista_uf_base = excluded.motorista_uf_base,
    motorista_tipo_veiculo = excluded.motorista_tipo_veiculo,
    motorista_tipo_carroceria = excluded.motorista_tipo_carroceria,
    motorista_rntrc_antt = excluded.motorista_rntrc_antt,
    status = case
      when public.candidaturas_web.status = 'cancelada' then 'aceita'
      else public.candidaturas_web.status
    end,
    updated_at = timezone('utc', now())
  returning id into v_candidatura_id;

  return v_candidatura_id;
end;
$$;

revoke all on function public.aceitar_carga_web(uuid, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.aceitar_carga_web(uuid, text, text, text, text, text, text, text, text, text) to authenticated, service_role;

create or replace function public.demonstrar_interesse_carga_web(
  p_carga_id uuid,
  p_mensagem text default null
)
returns uuid
language sql
security definer
set search_path = public
as $$
  select public.aceitar_carga_web(p_carga_id, p_mensagem, null, null, null, null, null, null, null, null);
$$;

revoke all on function public.demonstrar_interesse_carga_web(uuid, text) from public;
grant execute on function public.demonstrar_interesse_carga_web(uuid, text) to authenticated, service_role;

create or replace function public.minhas_cargas_aceitas_web()
returns table (
  candidatura_id uuid,
  status text,
  mensagem text,
  carga_id uuid,
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
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  return query
  select
    cd.id as candidatura_id,
    cd.status,
    cd.mensagem,
    c.id as carga_id,
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
    cd.created_at,
    cd.updated_at
  from public.candidaturas_web cd
  join public.cargas_web c on c.id = cd.carga_id
  join public.empresas_web e on e.id = c.empresa_id
  where cd.motorista_auth_user_id = auth.uid()
  order by cd.created_at desc;
end;
$$;

revoke all on function public.minhas_cargas_aceitas_web() from public;
grant execute on function public.minhas_cargas_aceitas_web() to authenticated, service_role;

create or replace function public.minhas_candidaturas_web()
returns table (
  candidatura_id uuid,
  status text,
  mensagem text,
  carga_id uuid,
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
  select * from public.minhas_cargas_aceitas_web();
$$;

revoke all on function public.minhas_candidaturas_web() from public;
grant execute on function public.minhas_candidaturas_web() to authenticated, service_role;

create or replace function public.empresa_listar_aceites_carga_web(
  p_carga_id uuid default null,
  p_status text default null
)
returns table (
  candidatura_id uuid,
  status text,
  mensagem text,
  carga_id uuid,
  carga_produto text,
  carga_origem text,
  carga_destino text,
  motorista_auth_user_id uuid,
  motorista_nome text,
  motorista_telefone text,
  motorista_email text,
  motorista_cidade_base text,
  motorista_uf_base char(2),
  motorista_tipo_veiculo text,
  motorista_tipo_carroceria text,
  motorista_rntrc_antt text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  return query
  select
    cd.id as candidatura_id,
    cd.status,
    cd.mensagem,
    c.id as carga_id,
    c.produto as carga_produto,
    c.cidade_coleta || '/' || c.uf_coleta as carga_origem,
    c.cidade_entrega || '/' || c.uf_entrega as carga_destino,
    cd.motorista_auth_user_id,
    cd.motorista_nome,
    cd.motorista_telefone,
    cd.motorista_email,
    cd.motorista_cidade_base,
    cd.motorista_uf_base,
    cd.motorista_tipo_veiculo,
    cd.motorista_tipo_carroceria,
    cd.motorista_rntrc_antt,
    cd.created_at,
    cd.updated_at
  from public.candidaturas_web cd
  join public.cargas_web c on c.id = cd.carga_id
  join public.empresas_web e on e.id = c.empresa_id
  where e.auth_user_id = auth.uid()
    and (p_carga_id is null or c.id = p_carga_id)
    and (p_status is null or p_status = '' or cd.status = p_status)
  order by cd.created_at desc;
end;
$$;

revoke all on function public.empresa_listar_aceites_carga_web(uuid, text) from public;
grant execute on function public.empresa_listar_aceites_carga_web(uuid, text) to authenticated, service_role;

create or replace function public.empresa_listar_candidaturas_web(
  p_carga_id uuid default null,
  p_status text default null
)
returns table (
  candidatura_id uuid,
  status text,
  mensagem text,
  carga_id uuid,
  carga_produto text,
  carga_origem text,
  carga_destino text,
  motorista_auth_user_id uuid,
  motorista_nome text,
  motorista_telefone text,
  motorista_email text,
  motorista_cidade_base text,
  motorista_uf_base char(2),
  motorista_tipo_veiculo text,
  motorista_tipo_carroceria text,
  motorista_rntrc_antt text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select * from public.empresa_listar_aceites_carga_web(p_carga_id, p_status);
$$;

revoke all on function public.empresa_listar_candidaturas_web(uuid, text) from public;
grant execute on function public.empresa_listar_candidaturas_web(uuid, text) to authenticated, service_role;

create or replace function public.atualizar_status_candidatura_web(
  p_candidatura_id uuid,
  p_status text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_candidatura_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  if p_status not in ('aceita', 'contatado', 'recusado', 'aprovado', 'cancelada') then
    raise exception 'Status invalido.';
  end if;

  update public.candidaturas_web cd
  set
    status = p_status,
    updated_at = timezone('utc', now())
  from public.cargas_web c
  join public.empresas_web e on e.id = c.empresa_id
  where cd.id = p_candidatura_id
    and c.id = cd.carga_id
    and e.auth_user_id = auth.uid()
  returning cd.id into v_candidatura_id;

  if v_candidatura_id is null then
    raise exception 'Candidatura nao encontrada para a conta autenticada.';
  end if;

  return v_candidatura_id;
end;
$$;

revoke all on function public.atualizar_status_candidatura_web(uuid, text) from public;
grant execute on function public.atualizar_status_candidatura_web(uuid, text) to authenticated, service_role;

create or replace function public.empresa_listar_conversas_chat_web()
returns table (
  candidatura_id uuid,
  status text,
  carga_id uuid,
  carga_produto text,
  carga_origem text,
  carga_destino text,
  motorista_auth_user_id uuid,
  motorista_nome text,
  motorista_telefone text,
  motorista_email text,
  ultima_mensagem text,
  ultima_mensagem_em timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  return query
  select
    cd.id as candidatura_id,
    cd.status,
    c.id as carga_id,
    c.produto as carga_produto,
    c.cidade_coleta || '/' || c.uf_coleta as carga_origem,
    c.cidade_entrega || '/' || c.uf_entrega as carga_destino,
    cd.motorista_auth_user_id,
    cd.motorista_nome,
    cd.motorista_telefone,
    cd.motorista_email,
    last_message.mensagem as ultima_mensagem,
    last_message.created_at as ultima_mensagem_em,
    cd.created_at
  from public.candidaturas_web cd
  join public.cargas_web c on c.id = cd.carga_id
  join public.empresas_web e on e.id = c.empresa_id
  left join lateral (
    select cm.mensagem, cm.created_at
    from public.chat_messages_web cm
    where cm.candidatura_id = cd.id
    order by cm.created_at desc
    limit 1
  ) last_message on true
  where e.auth_user_id = auth.uid()
  order by coalesce(last_message.created_at, cd.created_at) desc;
end;
$$;

revoke all on function public.empresa_listar_conversas_chat_web() from public;
grant execute on function public.empresa_listar_conversas_chat_web() to authenticated, service_role;

create or replace function public.motorista_listar_conversas_chat_web()
returns table (
  candidatura_id uuid,
  status text,
  carga_id uuid,
  empresa_nome text,
  carga_produto text,
  carga_origem text,
  carga_destino text,
  ultima_mensagem text,
  ultima_mensagem_em timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  return query
  select
    cd.id as candidatura_id,
    cd.status,
    c.id as carga_id,
    e.nome as empresa_nome,
    c.produto as carga_produto,
    c.cidade_coleta || '/' || c.uf_coleta as carga_origem,
    c.cidade_entrega || '/' || c.uf_entrega as carga_destino,
    last_message.mensagem as ultima_mensagem,
    last_message.created_at as ultima_mensagem_em,
    cd.created_at
  from public.candidaturas_web cd
  join public.cargas_web c on c.id = cd.carga_id
  join public.empresas_web e on e.id = c.empresa_id
  left join lateral (
    select cm.mensagem, cm.created_at
    from public.chat_messages_web cm
    where cm.candidatura_id = cd.id
    order by cm.created_at desc
    limit 1
  ) last_message on true
  where cd.motorista_auth_user_id = auth.uid()
  order by coalesce(last_message.created_at, cd.created_at) desc;
end;
$$;

revoke all on function public.motorista_listar_conversas_chat_web() from public;
grant execute on function public.motorista_listar_conversas_chat_web() to authenticated, service_role;

create or replace function public.listar_mensagens_chat_web(
  p_candidatura_id uuid
)
returns table (
  id uuid,
  candidatura_id uuid,
  sender_auth_user_id uuid,
  sender_role text,
  mensagem text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  if not exists (
    select 1
    from public.candidaturas_web cd
    join public.cargas_web c on c.id = cd.carga_id
    join public.empresas_web e on e.id = c.empresa_id
    where cd.id = p_candidatura_id
      and (
        cd.motorista_auth_user_id = auth.uid()
        or e.auth_user_id = auth.uid()
      )
  ) then
    raise exception 'Conversa nao encontrada para o usuario autenticado.';
  end if;

  return query
  select
    cm.id,
    cm.candidatura_id,
    cm.sender_auth_user_id,
    cm.sender_role,
    cm.mensagem,
    cm.created_at
  from public.chat_messages_web cm
  where cm.candidatura_id = p_candidatura_id
  order by cm.created_at asc;
end;
$$;

revoke all on function public.listar_mensagens_chat_web(uuid) from public;
grant execute on function public.listar_mensagens_chat_web(uuid) to authenticated, service_role;

create or replace function public.enviar_mensagem_chat_web(
  p_candidatura_id uuid,
  p_mensagem text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_role text;
  v_message_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  if trim(coalesce(p_mensagem, '')) = '' then
    raise exception 'Mensagem vazia.';
  end if;

  select
    case
      when e.auth_user_id = auth.uid() then 'empresa'
      when cd.motorista_auth_user_id = auth.uid() then 'motorista'
      else null
    end
  into v_sender_role
  from public.candidaturas_web cd
  join public.cargas_web c on c.id = cd.carga_id
  join public.empresas_web e on e.id = c.empresa_id
  where cd.id = p_candidatura_id;

  if v_sender_role is null then
    raise exception 'Conversa nao encontrada para o usuario autenticado.';
  end if;

  insert into public.chat_messages_web (
    candidatura_id,
    sender_auth_user_id,
    sender_role,
    mensagem
  )
  values (
    p_candidatura_id,
    auth.uid(),
    v_sender_role,
    trim(p_mensagem)
  )
  returning id into v_message_id;

  return v_message_id;
end;
$$;

revoke all on function public.enviar_mensagem_chat_web(uuid, text) from public;
grant execute on function public.enviar_mensagem_chat_web(uuid, text) to authenticated, service_role;

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
  id bigint,
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
    v.id,
    coalesce(v.status, 'publicada') as status,
    coalesce(nullif(trim(v.empresa), ''), e.nome, '') as empresa_nome,
    coalesce(e.cnpj, e.cpf) as empresa_cnpj,
    coalesce(nullif(trim(e.responsavel), ''), e.nome) as empresa_responsavel,
    e.telefone as empresa_telefone,
    e.email as empresa_email,
    coalesce(v.origem_cidade, '') as cidade_coleta,
    coalesce(v.origem_uf, '')::char(2) as uf_coleta,
    v.data_coleta,
    coalesce(v.destino_cidade, '') as cidade_entrega,
    coalesce(v.destino_uf, '')::char(2) as uf_entrega,
    v.data_limite_entrega::date as prazo_entrega,
    coalesce(v.produto, '') as produto,
    coalesce(
      nullif(trim(v.peso_texto), ''),
      case when v.peso is null then null else v.peso::text end,
      ''
    ) as peso_total,
    v.valor as valor_frete,
    coalesce(
      nullif(trim(v.valor_texto), ''),
      case when v.valor is null then null else v.valor::text end
    ) as valor_frete_texto,
    coalesce(
      nullif(trim(v.tipo_veiculo), ''),
      nullif(trim(split_part(coalesce(v.compatibilidade_veiculo, ''), ' / ', 1)), ''),
      ''
    ) as tipo_veiculo,
    coalesce(
      nullif(trim(v.tipo_carroceria), ''),
      nullif(trim(split_part(coalesce(v.compatibilidade_veiculo, ''), ' / ', 2)), ''),
      ''
    ) as tipo_carroceria,
    coalesce(
      nullif(trim(v.categoria_carga), ''),
      nullif(trim(split_part(coalesce(v.compatibilidade_veiculo, ''), ' / ', 3)), ''),
      ''
    ) as categoria_carga,
    v.janela_carregamento,
    v.exigencias_motorista,
    v.observacoes,
    v.created_at,
    v.updated_at
  from public."Viagens" v
  left join public.empresas_web e on e.auth_user_id = v.empresa_user_id
  where (p_status is null or p_status = '' or v.status = p_status)
    and (
      p_busca is null
      or p_busca = ''
      or coalesce(v.empresa, e.nome, '') ilike '%' || p_busca || '%'
      or e.cnpj ilike '%' || p_busca || '%'
      or e.cpf ilike '%' || p_busca || '%'
      or v.produto ilike '%' || p_busca || '%'
      or v.origem_cidade ilike '%' || p_busca || '%'
      or v.destino_cidade ilike '%' || p_busca || '%'
      or v.origem_uf ilike '%' || p_busca || '%'
      or v.destino_uf ilike '%' || p_busca || '%'
      or coalesce(v.tipo_veiculo, v.compatibilidade_veiculo, '') ilike '%' || p_busca || '%'
      or coalesce(v.tipo_carroceria, '') ilike '%' || p_busca || '%'
    )
  order by v.created_at desc;
end;
$$;

revoke all on function public.admin_listar_cargas_web(text, text) from public;
grant execute on function public.admin_listar_cargas_web(text, text) to authenticated, service_role;

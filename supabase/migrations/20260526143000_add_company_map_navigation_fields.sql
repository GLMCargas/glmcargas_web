do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'status_execucao_viagem'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.status_execucao_viagem as enum (
      'Aguardando retirada',
      'Retirada informada',
      'Em entrega',
      'Entrega informada',
      'Concluida',
      'Cancelada'
    );
  end if;
end;
$$;

alter table if exists public."Viagens"
add column if not exists carga_web_id uuid default gen_random_uuid(),
add column if not exists empresa text,
add column if not exists empresa_user_id uuid,
add column if not exists status text,
add column if not exists origem_cidade text,
add column if not exists origem_uf text,
add column if not exists data_coleta date,
add column if not exists coleta_endereco text,
add column if not exists coleta_latitude double precision,
add column if not exists coleta_longitude double precision,
add column if not exists coleta_place_id text,
add column if not exists destino_cidade text,
add column if not exists destino_uf text,
add column if not exists data_limite_entrega timestamptz,
add column if not exists entrega_endereco text,
add column if not exists entrega_latitude double precision,
add column if not exists entrega_longitude double precision,
add column if not exists entrega_place_id text,
add column if not exists produto text,
add column if not exists peso_texto text,
add column if not exists valor numeric,
add column if not exists valor_texto text,
add column if not exists tipo_veiculo text,
add column if not exists tipo_carroceria text,
add column if not exists categoria_carga text,
add column if not exists janela_carregamento text,
add column if not exists exigencias_motorista text,
add column if not exists observacoes text,
add column if not exists compatibilidade_veiculo text,
add column if not exists updated_at timestamptz;

update public."Viagens"
set carga_web_id = gen_random_uuid()
where carga_web_id is null;

alter table if exists public."Viagens"
alter column carga_web_id set default gen_random_uuid(),
alter column carga_web_id set not null;

create unique index if not exists viagens_carga_web_id_key
on public."Viagens" (carga_web_id);

update public."Viagens"
set status = 'publicada'
where status is null;

alter table if exists public."Viagens"
alter column status set default 'publicada',
alter column status set not null;

alter table if exists public."Viagens"
drop constraint if exists viagens_status_check;

alter table if exists public."Viagens"
add constraint viagens_status_check
check (status in ('publicada', 'rascunho', 'encerrada'));

alter table if exists public."Viagens"
drop constraint if exists viagens_coleta_coords_valid;

alter table if exists public."Viagens"
add constraint viagens_coleta_coords_valid
check (
  (coleta_latitude is null and coleta_longitude is null)
  or (
    coleta_latitude is not null
    and coleta_longitude is not null
    and coleta_latitude between -90 and 90
    and coleta_longitude between -180 and 180
  )
);

alter table if exists public."Viagens"
drop constraint if exists viagens_entrega_coords_valid;

alter table if exists public."Viagens"
add constraint viagens_entrega_coords_valid
check (
  (entrega_latitude is null and entrega_longitude is null)
  or (
    entrega_latitude is not null
    and entrega_longitude is not null
    and entrega_latitude between -90 and 90
    and entrega_longitude between -180 and 180
  )
);

alter table if exists public.solicitacoes_viagem
add column if not exists status_execucao public.status_execucao_viagem,
add column if not exists coleta_informada_em timestamptz,
add column if not exists coleta_confirmada_em timestamptz,
add column if not exists entrega_informada_em timestamptz,
add column if not exists entrega_confirmada_em timestamptz;

drop function if exists public.publicar_carga_web(
  text, text, text, text, text, text, text, text, text, date, text, text, date, text, text, numeric, text, text, text, text, text, text, text
);

drop function if exists public.publicar_carga_web(
  text, text, text, text, text, text, text, text, text, date, text, double precision, double precision, text, text, text, date, text, double precision, double precision, text, text, text, numeric, text, text, text, text, text, text, text
);

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
  p_coleta_endereco text,
  p_coleta_latitude double precision,
  p_coleta_longitude double precision,
  p_coleta_place_id text,
  p_cidade_entrega text,
  p_uf_entrega text,
  p_prazo_entrega date,
  p_entrega_endereco text,
  p_entrega_latitude double precision,
  p_entrega_longitude double precision,
  p_entrega_place_id text,
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
  v_conta_id uuid;
  v_carga_id uuid;
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
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null
  );

  select ew.nome, ew.auth_user_id
  into v_nome_conta, v_conta_auth_user_id
  from public.empresas_web ew
  where ew.id = v_conta_id;

  if v_conta_auth_user_id is null then
    raise exception 'Conta nao encontrada para o usuario autenticado.';
  end if;

  v_compatibilidade := nullif(
    trim(concat_ws(' / ', trim(p_tipo_veiculo), trim(p_tipo_carroceria), trim(p_categoria_carga))),
    ''
  );

  insert into public."Viagens" (
    empresa,
    empresa_user_id,
    status,
    origem_cidade,
    origem_uf,
    data_coleta,
    coleta_endereco,
    coleta_latitude,
    coleta_longitude,
    coleta_place_id,
    destino_cidade,
    destino_uf,
    data_limite_entrega,
    entrega_endereco,
    entrega_latitude,
    entrega_longitude,
    entrega_place_id,
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
    case when p_status in ('publicada', 'rascunho', 'encerrada') then p_status else 'publicada' end,
    trim(p_cidade_coleta),
    upper(trim(p_uf_coleta)),
    p_data_coleta,
    nullif(trim(coalesce(p_coleta_endereco, '')), ''),
    p_coleta_latitude,
    p_coleta_longitude,
    nullif(trim(coalesce(p_coleta_place_id, '')), ''),
    trim(p_cidade_entrega),
    upper(trim(p_uf_entrega)),
    p_prazo_entrega::timestamp,
    nullif(trim(coalesce(p_entrega_endereco, '')), ''),
    p_entrega_latitude,
    p_entrega_longitude,
    nullif(trim(coalesce(p_entrega_place_id, '')), ''),
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
  returning carga_web_id into v_carga_id;

  return v_carga_id;
end;
$$;

revoke all on function public.publicar_carga_web(
  text, text, text, text, text, text, text, text, text, date, text, double precision, double precision, text, text, text, date, text, double precision, double precision, text, text, text, numeric, text, text, text, text, text, text, text
) from public;

grant execute on function public.publicar_carga_web(
  text, text, text, text, text, text, text, text, text, date, text, double precision, double precision, text, text, text, date, text, double precision, double precision, text, text, text, numeric, text, text, text, text, text, text, text
) to authenticated, service_role;

drop function if exists public.atualizar_carga_web(
  bigint, text, text, text, text, text, text, text, text, text, date, text, text, date, text, text, numeric, text, text, text, text, text, text, text
);

drop function if exists public.atualizar_carga_web(
  bigint, text, text, text, text, text, text, text, text, text, date, text, double precision, double precision, text, text, text, date, text, double precision, double precision, text, text, text, numeric, text, text, text, text, text, text, text
);

drop function if exists public.atualizar_carga_web(
  uuid, text, text, text, text, text, text, text, text, text, date, text, double precision, double precision, text, text, text, date, text, double precision, double precision, text, text, text, numeric, text, text, text, text, text, text, text
);

create or replace function public.atualizar_carga_web(
  p_carga_id uuid,
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
  p_coleta_endereco text,
  p_coleta_latitude double precision,
  p_coleta_longitude double precision,
  p_coleta_place_id text,
  p_cidade_entrega text,
  p_uf_entrega text,
  p_prazo_entrega date,
  p_entrega_endereco text,
  p_entrega_latitude double precision,
  p_entrega_longitude double precision,
  p_entrega_place_id text,
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
  v_conta_id uuid;
  v_carga_id uuid;
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
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
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
    join public."Viagens" v on v.id = s.viagem_id
    where v.carga_web_id = p_carga_id
      and s.status = 'Aceita'
  ) into v_has_accepted_driver;

  if v_has_accepted_driver then
    raise exception 'Esta carga ja possui um motorista aceito e nao pode mais ser editada.';
  end if;

  v_compatibilidade := nullif(
    trim(concat_ws(' / ', trim(p_tipo_veiculo), trim(p_tipo_carroceria), trim(p_categoria_carga))),
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
    coleta_endereco = nullif(trim(coalesce(p_coleta_endereco, '')), ''),
    coleta_latitude = p_coleta_latitude,
    coleta_longitude = p_coleta_longitude,
    coleta_place_id = nullif(trim(coalesce(p_coleta_place_id, '')), ''),
    destino_cidade = trim(p_cidade_entrega),
    destino_uf = upper(trim(p_uf_entrega)),
    data_limite_entrega = p_prazo_entrega::timestamp,
    entrega_endereco = nullif(trim(coalesce(p_entrega_endereco, '')), ''),
    entrega_latitude = p_entrega_latitude,
    entrega_longitude = p_entrega_longitude,
    entrega_place_id = nullif(trim(coalesce(p_entrega_place_id, '')), ''),
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
  where carga_web_id = p_carga_id
    and empresa_user_id = v_auth_user_id
  returning carga_web_id into v_carga_id;

  if v_carga_id is null then
    raise exception 'Nao foi possivel atualizar a carga.';
  end if;

  return v_carga_id;
end;
$$;

revoke all on function public.atualizar_carga_web(
  uuid, text, text, text, text, text, text, text, text, text, date, text, double precision, double precision, text, text, text, date, text, double precision, double precision, text, text, text, numeric, text, text, text, text, text, text, text
) from public;

grant execute on function public.atualizar_carga_web(
  uuid, text, text, text, text, text, text, text, text, text, date, text, double precision, double precision, text, text, text, date, text, double precision, double precision, text, text, text, numeric, text, text, text, text, text, text, text
) to authenticated, service_role;

drop function if exists public.minhas_cargas_web();

create or replace function public.minhas_cargas_web()
returns table (
  id uuid,
  status text,
  empresa_nome text,
  cidade_coleta text,
  uf_coleta char(2),
  data_coleta date,
  coleta_endereco text,
  coleta_latitude double precision,
  coleta_longitude double precision,
  coleta_place_id text,
  cidade_entrega text,
  uf_entrega char(2),
  prazo_entrega date,
  entrega_endereco text,
  entrega_latitude double precision,
  entrega_longitude double precision,
  entrega_place_id text,
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
    v.carga_web_id as id,
    coalesce(v.status, 'publicada') as status,
    coalesce(nullif(trim(v.empresa), ''), e.nome, '') as empresa_nome,
    coalesce(v.origem_cidade, '') as cidade_coleta,
    coalesce(v.origem_uf, '')::char(2) as uf_coleta,
    v.data_coleta,
    v.coleta_endereco,
    v.coleta_latitude,
    v.coleta_longitude,
    v.coleta_place_id,
    coalesce(v.destino_cidade, '') as cidade_entrega,
    coalesce(v.destino_uf, '')::char(2) as uf_entrega,
    v.data_limite_entrega::date as prazo_entrega,
    v.entrega_endereco,
    v.entrega_latitude,
    v.entrega_longitude,
    v.entrega_place_id,
    coalesce(v.produto, '') as produto,
    coalesce(nullif(trim(v.peso_texto), ''), case when v.peso is null then null else v.peso::text end, '') as peso_total,
    v.valor as valor_frete,
    coalesce(nullif(trim(v.valor_texto), ''), case when v.valor is null then null else v.valor::text end) as valor_frete_texto,
    coalesce(nullif(trim(v.tipo_veiculo), ''), nullif(trim(split_part(coalesce(v.compatibilidade_veiculo, ''), ' / ', 1)), ''), '') as tipo_veiculo,
    coalesce(nullif(trim(v.tipo_carroceria), ''), nullif(trim(split_part(coalesce(v.compatibilidade_veiculo, ''), ' / ', 2)), ''), '') as tipo_carroceria,
    coalesce(nullif(trim(v.categoria_carga), ''), nullif(trim(split_part(coalesce(v.compatibilidade_veiculo, ''), ' / ', 3)), ''), '') as categoria_carga,
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

drop function if exists public.atualizar_status_carga_web(bigint, text);
drop function if exists public.atualizar_status_carga_web(uuid, text);

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

  update public."Viagens" v
  set
    status = p_status,
    updated_at = timezone('utc', now())
  where v.carga_web_id = p_carga_id
    and v.empresa_user_id = auth.uid()
  returning v.carga_web_id into v_carga_id;

  if v_carga_id is null then
    raise exception 'Carga nao encontrada para a conta autenticada.';
  end if;

  return v_carga_id;
end;
$$;

revoke all on function public.atualizar_status_carga_web(uuid, text) from public;
grant execute on function public.atualizar_status_carga_web(uuid, text) to authenticated, service_role;

update public.solicitacoes_viagem
set status_execucao = 'Aguardando retirada'
where status = 'Aceita'
  and status_execucao is null;

create or replace function public.sync_solicitacao_execucao_status()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'Aceita' and new.status_execucao is null then
    new.status_execucao = 'Aguardando retirada';
  end if;

  if new.status <> 'Aceita' then
    new.status_execucao = null;
    new.coleta_informada_em = null;
    new.coleta_confirmada_em = null;
    new.entrega_informada_em = null;
    new.entrega_confirmada_em = null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_solicitacao_execucao_status
on public.solicitacoes_viagem;

create trigger trg_sync_solicitacao_execucao_status
before insert or update of status, status_execucao
on public.solicitacoes_viagem
for each row
execute function public.sync_solicitacao_execucao_status();

alter table public.solicitacoes_viagem
drop constraint if exists solicitacoes_viagem_execucao_matches_status;

alter table public.solicitacoes_viagem
add constraint solicitacoes_viagem_execucao_matches_status
check (
  (
    status = 'Aceita'
    and status_execucao is not null
  )
  or (
    status <> 'Aceita'
    and status_execucao is null
  )
);

create or replace function public.confirmar_coleta_empresa(
  p_solicitacao_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa uuid := auth.uid();
  v_solicitacao public.solicitacoes_viagem%rowtype;
begin
  if v_empresa is null then
    raise exception 'Usuario nao autenticado';
  end if;

  select s.*
    into v_solicitacao
  from public.solicitacoes_viagem as s
  join public."Viagens" as v on v.id = s.viagem_id
  where s.id = p_solicitacao_id
    and v.empresa_user_id = v_empresa
  for update of s;

  if not found then
    raise exception 'Solicitacao nao encontrada para esta empresa';
  end if;

  if v_solicitacao.status <> 'Aceita' then
    raise exception 'Solicitacao ainda nao foi aceita';
  end if;

  if v_solicitacao.status_execucao = 'Retirada informada' then
    update public.solicitacoes_viagem
    set status_execucao = 'Em entrega',
        coleta_confirmada_em = coalesce(coleta_confirmada_em, now())
    where id = p_solicitacao_id
    returning *
      into v_solicitacao;
  elsif v_solicitacao.status_execucao <> 'Em entrega' then
    raise exception 'A coleta nao pode ser confirmada nesta etapa';
  end if;

  return jsonb_build_object(
    'solicitacao_id', v_solicitacao.id,
    'status_execucao', v_solicitacao.status_execucao::text,
    'coleta_confirmada_em', v_solicitacao.coleta_confirmada_em
  );
end;
$$;

create or replace function public.confirmar_entrega_empresa(
  p_solicitacao_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa uuid := auth.uid();
  v_solicitacao public.solicitacoes_viagem%rowtype;
begin
  if v_empresa is null then
    raise exception 'Usuario nao autenticado';
  end if;

  select s.*
    into v_solicitacao
  from public.solicitacoes_viagem as s
  join public."Viagens" as v on v.id = s.viagem_id
  where s.id = p_solicitacao_id
    and v.empresa_user_id = v_empresa
  for update of s;

  if not found then
    raise exception 'Solicitacao nao encontrada para esta empresa';
  end if;

  if v_solicitacao.status <> 'Aceita' then
    raise exception 'Solicitacao ainda nao foi aceita';
  end if;

  if v_solicitacao.status_execucao = 'Entrega informada' then
    update public.solicitacoes_viagem
    set status_execucao = 'Concluida',
        entrega_confirmada_em = coalesce(entrega_confirmada_em, now())
    where id = p_solicitacao_id
    returning *
      into v_solicitacao;
  elsif v_solicitacao.status_execucao <> 'Concluida' then
    raise exception 'A entrega nao pode ser confirmada nesta etapa';
  end if;

  return jsonb_build_object(
    'solicitacao_id', v_solicitacao.id,
    'status_execucao', v_solicitacao.status_execucao::text,
    'entrega_confirmada_em', v_solicitacao.entrega_confirmada_em
  );
end;
$$;

grant usage on type public.status_execucao_viagem to authenticated, service_role;
grant execute on function public.confirmar_coleta_empresa(uuid) to authenticated, service_role;
grant execute on function public.confirmar_entrega_empresa(uuid) to authenticated, service_role;

notify pgrst, 'reload schema';

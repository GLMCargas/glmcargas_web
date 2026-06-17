drop function if exists public.salvar_conta_web(
  text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text
);

alter table public.empresas_web
  alter column cnpj drop not null;

alter table public.empresas_web
  alter column responsavel drop not null;

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
  v_telefone text;
  v_email text;
  v_conta_id uuid;
begin
  v_auth_user_id := auth.uid();

  if v_auth_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  v_tipo_pessoa := lower(trim(coalesce(p_tipo_pessoa, '')));
  v_nome := trim(coalesce(p_nome, ''));
  v_cpf := nullif(trim(coalesce(p_cpf, '')), '');
  v_cnpj := nullif(trim(coalesce(p_cnpj, '')), '');
  v_telefone := trim(coalesce(p_telefone, ''));
  v_email := coalesce(
    nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(coalesce(auth.jwt() ->> 'email', '')), '')
  );

  if v_tipo_pessoa not in ('fisica', 'juridica') then
    raise exception 'Tipo de conta inválido.';
  end if;

  if v_nome = '' or v_telefone = '' then
    raise exception 'Dados principais da conta incompletos.';
  end if;

  if v_tipo_pessoa = 'fisica' and v_cpf is null then
    raise exception 'Informe o CPF para o cadastro de pessoa física.';
  end if;

  if v_tipo_pessoa = 'juridica' and v_cnpj is null then
    raise exception 'Informe o CNPJ para o cadastro de pessoa jurídica.';
  end if;

  if v_tipo_pessoa = 'fisica' then
    v_cnpj := null;
  else
    v_cpf := null;
  end if;

  insert into public.empresas_web (
    auth_user_id,
    tipo_pessoa,
    nome,
    cpf,
    cnpj,
    telefone,
    email,
    responsavel,
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
    v_telefone,
    v_email,
    nullif(trim(coalesce(p_responsavel, '')), ''),
    nullif(trim(coalesce(p_cep, '')), ''),
    nullif(trim(coalesce(p_logradouro, '')), ''),
    nullif(trim(coalesce(p_numero_endereco, '')), ''),
    nullif(trim(coalesce(p_complemento, '')), ''),
    nullif(trim(coalesce(p_bairro, '')), ''),
    nullif(trim(coalesce(p_cidade, '')), ''),
    nullif(upper(trim(coalesce(p_uf, ''))), ''),
    nullif(trim(coalesce(p_vinculado_nome, '')), ''),
    nullif(trim(coalesce(p_vinculado_cpf, '')), ''),
    nullif(trim(coalesce(p_vinculado_cnpj, '')), '')
  )
  on conflict (auth_user_id)
  do update set
    tipo_pessoa = excluded.tipo_pessoa,
    nome = excluded.nome,
    cpf = excluded.cpf,
    cnpj = excluded.cnpj,
    telefone = excluded.telefone,
    email = excluded.email,
    responsavel = excluded.responsavel,
    cep = coalesce(excluded.cep, public.empresas_web.cep),
    logradouro = coalesce(excluded.logradouro, public.empresas_web.logradouro),
    numero_endereco = coalesce(excluded.numero_endereco, public.empresas_web.numero_endereco),
    complemento = coalesce(excluded.complemento, public.empresas_web.complemento),
    bairro = coalesce(excluded.bairro, public.empresas_web.bairro),
    cidade = coalesce(excluded.cidade, public.empresas_web.cidade),
    uf = coalesce(excluded.uf, public.empresas_web.uf),
    vinculado_nome = excluded.vinculado_nome,
    vinculado_cpf = excluded.vinculado_cpf,
    vinculado_cnpj = excluded.vinculado_cnpj,
    updated_at = now()
  returning id into v_conta_id;

  return v_conta_id;
end;
$$;

revoke all on function public.salvar_conta_web(
  text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text
) from public;

grant execute on function public.salvar_conta_web(
  text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text
) to authenticated, service_role;

notify pgrst, 'reload schema';

import { ChangeEvent, FormEvent, MouseEvent, useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'

const benefitCards = [
  {
    title: 'Publicacao em minutos',
    text: 'Centralize origem, destino, peso, janela de coleta e exigencias da operacao em um fluxo simples para o time comercial ou logistico.',
  },
  {
    title: 'Triagem por compatibilidade',
    text: 'Organize a carga por tipo de veiculo, carroceria e requisitos criticos para conversar so com motoristas aderentes a viagem.',
  },
  {
    title: 'Mais visibilidade operacional',
    text: 'Padronize a oferta para reduzir ruido na negociacao e ganhar velocidade na contratacao do frete.',
  },
]

const processSteps = [
  'Cadastre a operacao com cidade de coleta, destino, peso e tipo de caminhao.',
  'Defina restricoes da carga, janela de embarque e observacoes da doca.',
  'Receba interesse de motoristas aderentes e avance para o contato comercial.',
]

const metrics = [
  { value: '24h', label: 'para publicar novas cargas com consistencia operacional' },
  { value: 'UF + cidade', label: 'como base para localizar motoristas mais proximos da origem' },
  { value: 'Veiculo + carroceria', label: 'como criterio principal de compatibilidade logistica' },
]

const initialForm = {
  companyName: '',
  cnpj: '',
  contactName: '',
  phone: '',
  email: '',
  pickupCity: '',
  pickupState: '',
  pickupDate: '',
  deliveryCity: '',
  deliveryState: '',
  deliveryDate: '',
  cargoType: '',
  cargoWeight: '',
  freightValue: '',
  vehicleType: '',
  bodyType: '',
  loadCategory: '',
  loadingWindow: '',
  driverRequirements: '',
  notes: '',
}

const initialAuthForm = {
  email: '',
  password: '',
}

const initialAdminFilters = {
  search: '',
  status: '',
}

type FormState = typeof initialForm
type AuthFormState = typeof initialAuthForm
type SubmitMode = 'publicada' | 'rascunho'
type AuthMode = 'login' | 'register'
type CargoStatus = 'publicada' | 'rascunho' | 'encerrada'
type AdminFilters = typeof initialAdminFilters

type CompanyCargo = {
  id: string
  status: CargoStatus
  empresa_nome: string
  cidade_coleta: string
  uf_coleta: string
  data_coleta: string | null
  cidade_entrega: string
  uf_entrega: string
  prazo_entrega: string | null
  produto: string
  peso_total: string
  valor_frete: number | null
  valor_frete_texto: string | null
  tipo_veiculo: string
  tipo_carroceria: string
  categoria_carga: string
  janela_carregamento: string | null
  exigencias_motorista: string | null
  observacoes: string | null
  created_at: string
  updated_at: string
}

function parseCurrencyToNumber(value: string) {
  const normalized = value.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function formatDate(value: string | null) {
  if (!value) return 'Nao informado'

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function formatCurrency(value: number | null, raw: string | null) {
  if (raw) return raw
  if (value === null) return 'A combinar'

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function statusLabel(status: CargoStatus) {
  if (status === 'publicada') return 'Publicada'
  if (status === 'rascunho') return 'Rascunho'
  return 'Encerrada'
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [authForm, setAuthForm] = useState<AuthFormState>(initialAuthForm)
  const [authMessage, setAuthMessage] = useState('')
  const [authError, setAuthError] = useState('')
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [form, setForm] = useState<FormState>(initialForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [companyCargos, setCompanyCargos] = useState<CompanyCargo[]>([])
  const [isLoadingCargos, setIsLoadingCargos] = useState(false)
  const [cargoListError, setCargoListError] = useState('')
  const [actionCargoId, setActionCargoId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminFilters, setAdminFilters] = useState<AdminFilters>(initialAdminFilters)
  const [adminCargos, setAdminCargos] = useState<CompanyCargo[]>([])
  const [isLoadingAdminCargos, setIsLoadingAdminCargos] = useState(false)
  const [adminError, setAdminError] = useState('')

  const loadCompanyCargos = async () => {
    if (!session) {
      setCompanyCargos([])
      return
    }

    setIsLoadingCargos(true)
    setCargoListError('')

    const { data, error } = await supabase.rpc('minhas_cargas_web')

    setIsLoadingCargos(false)

    if (error) {
      setCargoListError(error.message)
      return
    }

    setCompanyCargos((data ?? []) as CompanyCargo[])
  }

  const loadAdminCargos = async (filters = adminFilters) => {
    if (!session || !isAdmin) {
      setAdminCargos([])
      return
    }

    setIsLoadingAdminCargos(true)
    setAdminError('')

    const { data, error } = await supabase.rpc('admin_listar_cargas_web', {
      p_status: filters.status || null,
      p_busca: filters.search.trim() || null,
    })

    setIsLoadingAdminCargos(false)

    if (error) {
      setAdminError(error.message)
      return
    }

    setAdminCargos((data ?? []) as CompanyCargo[])
  }

  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return
      setSession(data.session)
      setIsLoadingSession(false)
      setIsAdmin(false)
      setForm((current) => ({
        ...current,
        email: current.email || data.session?.user.email || '',
      }))
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setIsAdmin(false)
      setForm((current) => ({
        ...current,
        email: nextSession?.user.email || current.email,
      }))
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    void loadCompanyCargos()
  }, [session])

  useEffect(() => {
    if (!session) {
      setIsAdmin(false)
      setAdminCargos([])
      return
    }

    let isMounted = true

    supabase.rpc('is_web_admin').then(({ data, error }) => {
      if (!isMounted) return
      setIsAdmin(!error && Boolean(data))
    })

    return () => {
      isMounted = false
    }
  }, [session])

  useEffect(() => {
    if (!isAdmin) {
      setAdminCargos([])
      return
    }

    void loadAdminCargos()
  }, [isAdmin])

  const handleFieldChange =
    (field: keyof FormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const value =
        field === 'pickupState' || field === 'deliveryState'
          ? event.target.value.toUpperCase()
          : event.target.value

      setForm((current) => ({
        ...current,
        [field]: value,
      }))
    }

  const handleAuthFieldChange =
    (field: keyof AuthFormState) => (event: ChangeEvent<HTMLInputElement>) => {
      setAuthForm((current) => ({
        ...current,
        [field]: event.target.value,
      }))
    }

  const handleAdminFilterChange =
    (field: keyof AdminFilters) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setAdminFilters((current) => ({
        ...current,
        [field]: event.target.value,
      }))
    }

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsAuthenticating(true)
    setAuthMessage('')
    setAuthError('')

    const credentials = {
      email: authForm.email.trim(),
      password: authForm.password,
    }

    const response =
      authMode === 'login'
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials)

    setIsAuthenticating(false)

    if (response.error) {
      setAuthError(response.error.message)
      return
    }

    setAuthForm(initialAuthForm)
    setAuthMessage(
      authMode === 'login'
        ? 'Login realizado com sucesso.'
        : 'Cadastro realizado. Se o Supabase exigir confirmacao de e-mail, valide sua caixa de entrada.',
    )
  }

  const handleLogout = async () => {
    setAuthMessage('')
    setAuthError('')
    setAdminFilters(initialAdminFilters)
    await supabase.auth.signOut()
  }

  const submitCargo = async (mode: SubmitMode) => {
    setIsSubmitting(true)
    setSubmitMessage('')
    setSubmitError('')

    const { error } = await supabase.rpc('publicar_carga_web', {
      p_status: mode,
      p_empresa_nome: form.companyName.trim(),
      p_empresa_cnpj: form.cnpj.trim(),
      p_empresa_responsavel: form.contactName.trim(),
      p_empresa_telefone: form.phone.trim(),
      p_empresa_email: form.email.trim() || null,
      p_cidade_coleta: form.pickupCity.trim(),
      p_uf_coleta: form.pickupState.trim(),
      p_data_coleta: form.pickupDate || null,
      p_cidade_entrega: form.deliveryCity.trim(),
      p_uf_entrega: form.deliveryState.trim(),
      p_prazo_entrega: form.deliveryDate || null,
      p_produto: form.cargoType.trim(),
      p_peso_total: form.cargoWeight.trim(),
      p_valor_frete: parseCurrencyToNumber(form.freightValue),
      p_valor_frete_texto: form.freightValue.trim() || null,
      p_tipo_veiculo: form.vehicleType,
      p_tipo_carroceria: form.bodyType,
      p_categoria_carga: form.loadCategory,
      p_janela_carregamento: form.loadingWindow.trim() || null,
      p_exigencias_motorista: form.driverRequirements.trim() || null,
      p_observacoes: form.notes.trim() || null,
    })

    setIsSubmitting(false)

    if (error) {
      setSubmitError(error.message)
      return
    }

    setSubmitMessage(
      mode === 'publicada'
        ? 'Carga publicada com sucesso no Supabase.'
        : 'Rascunho salvo com sucesso no Supabase.',
    )
    setForm((current) => ({
      ...initialForm,
      email: session?.user.email || current.email,
    }))
    await loadCompanyCargos()
  }

  const handleCargoStatusChange = async (cargoId: string, nextStatus: CargoStatus) => {
    setActionCargoId(cargoId)
    setCargoListError('')

    const { error } = await supabase.rpc('atualizar_status_carga_web', {
      p_carga_id: cargoId,
      p_status: nextStatus,
    })

    setActionCargoId(null)

    if (error) {
      setCargoListError(error.message)
      return
    }

    await loadCompanyCargos()
    if (isAdmin) {
      await loadAdminCargos()
    }
  }

  const handleSubmit =
    (mode: SubmitMode) =>
    async (event?: FormEvent<HTMLFormElement> | MouseEvent<HTMLButtonElement>) => {
      event?.preventDefault()
      await submitCargo(mode)
    }

  const handleAdminSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await loadAdminCargos()
  }

  const authFeedbackClass = authError ? 'form-feedback form-feedback--error' : 'form-feedback'
  const submitFeedbackClass = submitError ? 'form-feedback form-feedback--error' : 'form-feedback'

  return (
    <div className="page-shell">
      <header className="hero">
        <div className="hero__copy">
          <div className="eyebrow">GLM Cargas para empresas</div>
          <h1>Publique cargas com contexto operacional suficiente para achar o caminhao certo.</h1>
          <p className="hero__lead">
            Uma frente web pensada para embarcadores, transportadoras e times logisticos que
            precisam anunciar fretes com rapidez, clareza e melhor compatibilidade com a frota
            disponivel.
          </p>

          <div className="hero__actions">
            <a className="button button--primary" href="#publicar">
              Publicar carga
            </a>
            <a className="button button--ghost" href="#dashboard">
              Ver dashboard
            </a>
          </div>

          <div className="metrics">
            {metrics.map((metric) => (
              <div className="metric-card" key={metric.value}>
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
              </div>
            ))}
          </div>
        </div>

        <aside className="hero__panel">
          <div className="panel-card panel-card--accent">
            <span className="panel-card__label">Visao da operacao</span>
            <h2>Carga publicada com informacoes que o motorista realmente precisa.</h2>
            <ul>
              <li>Origem e destino com foco em cidade e UF</li>
              <li>Tipo de veiculo, carroceria e peso da carga</li>
              <li>Janela de coleta, prazo de entrega e observacoes</li>
            </ul>
          </div>

          <div className="panel-card">
            <span className="panel-card__label">Objetivo do canal web</span>
            <p>
              Ser a porta de entrada das empresas para criar ofertas mais completas, padronizadas
              e prontas para conversar com a base de motoristas do ecossistema GLM.
            </p>
          </div>
        </aside>
      </header>

      <main>
        <section className="section" id="beneficios">
          <div className="section-heading">
            <span>Por que essa pagina existe</span>
            <h2>Uma experiencia web para quem publica carga, nao para quem dirige.</h2>
          </div>

          <div className="benefit-grid">
            {benefitCards.map((card) => (
              <article className="benefit-card" key={card.title}>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section--split" id="como-funciona">
          <div className="section-heading">
            <span>Fluxo sugerido</span>
            <h2>O essencial para publicar bem uma carga e reduzir retrabalho no contato.</h2>
          </div>

          <div className="process-list">
            {processSteps.map((step, index) => (
              <div className="process-item" key={step}>
                <div className="process-item__index">0{index + 1}</div>
                <p>{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section section--form" id="publicar">
          <div className="section-heading">
            <span>Acesso da empresa</span>
            <h2>Entre com sua conta para publicar e gerenciar novas cargas.</h2>
          </div>

          <div className="auth-layout">
            <div className="auth-card">
              <div className="auth-toggle">
                <button
                  className={authMode === 'login' ? 'auth-toggle__button is-active' : 'auth-toggle__button'}
                  type="button"
                  onClick={() => setAuthMode('login')}
                >
                  Entrar
                </button>
                <button
                  className={
                    authMode === 'register' ? 'auth-toggle__button is-active' : 'auth-toggle__button'
                  }
                  type="button"
                  onClick={() => setAuthMode('register')}
                >
                  Criar conta
                </button>
              </div>

              {isLoadingSession ? (
                <p className="auth-status">Verificando sessao da empresa...</p>
              ) : session ? (
                <div className="auth-status auth-status--logged">
                  <strong>{session.user.email}</strong>
                  <span>Conta autenticada no Supabase e pronta para publicar e administrar cargas.</span>
                  <button className="button button--ghost" type="button" onClick={handleLogout}>
                    Sair
                  </button>
                </div>
              ) : (
                <form className="auth-form" onSubmit={handleAuthSubmit}>
                  <label>
                    E-mail de acesso
                    <input
                      required
                      type="email"
                      placeholder="comercial@empresa.com.br"
                      value={authForm.email}
                      onChange={handleAuthFieldChange('email')}
                    />
                  </label>
                  <label>
                    Senha
                    <input
                      required
                      type="password"
                      placeholder="Digite sua senha"
                      value={authForm.password}
                      onChange={handleAuthFieldChange('password')}
                    />
                  </label>
                  {(authMessage || authError) && (
                    <div className={authFeedbackClass}>{authError || authMessage}</div>
                  )}
                  <button className="button button--primary auth-form__submit" type="submit" disabled={isAuthenticating}>
                    {isAuthenticating
                      ? 'Processando...'
                      : authMode === 'login'
                        ? 'Entrar na conta'
                        : 'Criar conta da empresa'}
                  </button>
                </form>
              )}
            </div>

            <div className="auth-card auth-card--secondary">
              <span className="panel-card__label">Como funciona o acesso</span>
              <h3>Autenticacao separada para o portal web.</h3>
              <p>
                O app dos motoristas continua no outro repositorio. Aqui a empresa entra com
                e-mail e senha no mesmo projeto Supabase e publica cargas a partir de uma conta
                autenticada.
              </p>
              <ul>
                <li>Mesmo projeto Supabase do aplicativo</li>
                <li>Novas tabelas dedicadas ao portal web</li>
                <li>Publicacao vinculada ao usuario autenticado</li>
              </ul>
            </div>
          </div>

          <div className="section-heading section-heading--compact">
            <span>Nova publicacao</span>
            <h2>Cadastre uma carga com os principais dados que impactam a contratacao.</h2>
          </div>

          {session ? (
            <form className="cargo-form" onSubmit={handleSubmit('publicada')}>
              <div className="form-block">
                <h3>Empresa</h3>
                <div className="field-grid field-grid--two">
                  <label>
                    Nome da empresa
                    <input
                      required
                      type="text"
                      placeholder="Ex.: Logistica Vale Norte"
                      value={form.companyName}
                      onChange={handleFieldChange('companyName')}
                    />
                  </label>
                  <label>
                    CNPJ
                    <input
                      required
                      type="text"
                      placeholder="00.000.000/0000-00"
                      value={form.cnpj}
                      onChange={handleFieldChange('cnpj')}
                    />
                  </label>
                  <label>
                    Responsavel pela carga
                    <input
                      required
                      type="text"
                      placeholder="Nome do contato operacional"
                      value={form.contactName}
                      onChange={handleFieldChange('contactName')}
                    />
                  </label>
                  <label>
                    Telefone / WhatsApp
                    <input
                      required
                      type="text"
                      placeholder="(00) 00000-0000"
                      value={form.phone}
                      onChange={handleFieldChange('phone')}
                    />
                  </label>
                  <label className="field-grid__full">
                    E-mail da operacao
                    <input
                      type="email"
                      placeholder="operacao@empresa.com.br"
                      value={form.email}
                      onChange={handleFieldChange('email')}
                    />
                  </label>
                </div>
              </div>

              <div className="form-block">
                <h3>Rota</h3>
                <div className="field-grid field-grid--three">
                  <label>
                    Cidade de coleta
                    <input
                      required
                      type="text"
                      placeholder="Ex.: Campinas"
                      value={form.pickupCity}
                      onChange={handleFieldChange('pickupCity')}
                    />
                  </label>
                  <label>
                    UF de coleta
                    <input
                      required
                      type="text"
                      placeholder="SP"
                      maxLength={2}
                      value={form.pickupState}
                      onChange={handleFieldChange('pickupState')}
                    />
                  </label>
                  <label>
                    Data de coleta
                    <input
                      type="date"
                      value={form.pickupDate}
                      onChange={handleFieldChange('pickupDate')}
                    />
                  </label>
                  <label>
                    Cidade de entrega
                    <input
                      required
                      type="text"
                      placeholder="Ex.: Curitiba"
                      value={form.deliveryCity}
                      onChange={handleFieldChange('deliveryCity')}
                    />
                  </label>
                  <label>
                    UF de entrega
                    <input
                      required
                      type="text"
                      placeholder="PR"
                      maxLength={2}
                      value={form.deliveryState}
                      onChange={handleFieldChange('deliveryState')}
                    />
                  </label>
                  <label>
                    Prazo de entrega
                    <input
                      type="date"
                      value={form.deliveryDate}
                      onChange={handleFieldChange('deliveryDate')}
                    />
                  </label>
                </div>
              </div>

              <div className="form-block">
                <h3>Carga e compatibilidade</h3>
                <div className="field-grid field-grid--three">
                  <label>
                    Produto / mercadoria
                    <input
                      required
                      type="text"
                      placeholder="Ex.: bobinas de aco"
                      value={form.cargoType}
                      onChange={handleFieldChange('cargoType')}
                    />
                  </label>
                  <label>
                    Peso total
                    <input
                      required
                      type="text"
                      placeholder="Ex.: 28 toneladas"
                      value={form.cargoWeight}
                      onChange={handleFieldChange('cargoWeight')}
                    />
                  </label>
                  <label>
                    Valor do frete
                    <input
                      type="text"
                      placeholder="Ex.: R$ 6.500,00"
                      value={form.freightValue}
                      onChange={handleFieldChange('freightValue')}
                    />
                  </label>
                  <label>
                    Tipo de veiculo
                    <select
                      required
                      value={form.vehicleType}
                      onChange={handleFieldChange('vehicleType')}
                    >
                      <option value="" disabled>
                        Selecione
                      </option>
                      <option value="Toco">Toco</option>
                      <option value="Truck">Truck</option>
                      <option value="Bitruck">Bitruck</option>
                      <option value="Carreta">Carreta</option>
                      <option value="Rodotrem">Rodotrem</option>
                    </select>
                  </label>
                  <label>
                    Tipo de carroceria
                    <select required value={form.bodyType} onChange={handleFieldChange('bodyType')}>
                      <option value="" disabled>
                        Selecione
                      </option>
                      <option value="Bau">Bau</option>
                      <option value="Sider">Sider</option>
                      <option value="Graneleira">Graneleira</option>
                      <option value="Prancha">Prancha</option>
                      <option value="Tanque">Tanque</option>
                    </select>
                  </label>
                  <label>
                    Categoria da carga
                    <select
                      required
                      value={form.loadCategory}
                      onChange={handleFieldChange('loadCategory')}
                    >
                      <option value="" disabled>
                        Selecione
                      </option>
                      <option value="Fracionada">Fracionada</option>
                      <option value="Lotacao">Lotacao</option>
                      <option value="Refrigerada">Refrigerada</option>
                      <option value="Perigosa">Perigosa</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="form-block">
                <h3>Detalhes operacionais</h3>
                <div className="field-grid field-grid--two">
                  <label>
                    Janela de carregamento
                    <input
                      type="text"
                      placeholder="Ex.: 08:00 as 14:00"
                      value={form.loadingWindow}
                      onChange={handleFieldChange('loadingWindow')}
                    />
                  </label>
                  <label>
                    Exigencias para o motorista
                    <input
                      type="text"
                      placeholder="Ex.: lona, cinta, MOPP, rastreador"
                      value={form.driverRequirements}
                      onChange={handleFieldChange('driverRequirements')}
                    />
                  </label>
                  <label className="field-grid__full">
                    Observacoes
                    <textarea
                      rows={5}
                      placeholder="Descreva doca, necessidade de agendamento, contato na coleta, restricoes ou instrucoes importantes."
                      value={form.notes}
                      onChange={handleFieldChange('notes')}
                    />
                  </label>
                </div>
              </div>

              {(submitMessage || submitError) && (
                <div className={submitFeedbackClass}>{submitError || submitMessage}</div>
              )}

              <div className="form-actions">
                <button className="button button--primary" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando...' : 'Salvar publicacao'}
                </button>
                <button
                  className="button button--ghost"
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmit('rascunho')}
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar rascunho'}
                </button>
              </div>
            </form>
          ) : (
            <div className="locked-form">
              <strong>Login necessario</strong>
              <p>Entre com a conta da empresa para liberar a publicacao de cargas neste portal.</p>
            </div>
          )}
        </section>

        <section className="section" id="dashboard">
          <div className="section-heading">
            <span>Dashboard da empresa</span>
            <h2>Acompanhe o que ja foi publicado e ajuste o status das cargas.</h2>
          </div>

          {!session ? (
            <div className="locked-form">
              <strong>Painel protegido</strong>
              <p>Faca login para listar as cargas vinculadas a sua conta autenticada.</p>
            </div>
          ) : (
            <div className="dashboard-shell">
              <div className="dashboard-summary">
                <div className="metric-card">
                  <strong>{companyCargos.length}</strong>
                  <span>cargas visiveis para esta conta</span>
                </div>
                <div className="metric-card">
                  <strong>{companyCargos.filter((cargo) => cargo.status === 'publicada').length}</strong>
                  <span>publicadas e ativas para negociacao</span>
                </div>
                <div className="metric-card">
                  <strong>{companyCargos.filter((cargo) => cargo.status === 'rascunho').length}</strong>
                  <span>rascunhos aguardando revisao</span>
                </div>
              </div>

              {cargoListError && <div className="form-feedback form-feedback--error">{cargoListError}</div>}

              {isLoadingCargos ? (
                <div className="locked-form">
                  <strong>Carregando dashboard</strong>
                  <p>Buscando as cargas publicadas pela empresa autenticada.</p>
                </div>
              ) : companyCargos.length === 0 ? (
                <div className="locked-form">
                  <strong>Nenhuma carga ainda</strong>
                  <p>Assim que a empresa salvar uma publicacao ou rascunho, ela aparece aqui.</p>
                </div>
              ) : (
                <div className="cargo-list">
                  {companyCargos.map((cargo) => (
                    <article className="cargo-card" key={cargo.id}>
                      <div className="cargo-card__top">
                        <div>
                          <span className={`status-badge status-badge--${cargo.status}`}>
                            {statusLabel(cargo.status)}
                          </span>
                          <h3>{cargo.produto}</h3>
                        </div>
                        <div className="cargo-card__price">
                          {formatCurrency(cargo.valor_frete, cargo.valor_frete_texto)}
                        </div>
                      </div>

                      <div className="cargo-card__grid">
                        <div>
                          <span>Rota</span>
                          <strong>
                            {cargo.cidade_coleta}/{cargo.uf_coleta} {'->'} {cargo.cidade_entrega}/{cargo.uf_entrega}
                          </strong>
                        </div>
                        <div>
                          <span>Compatibilidade</span>
                          <strong>{cargo.tipo_veiculo} | {cargo.tipo_carroceria}</strong>
                        </div>
                        <div>
                          <span>Categoria</span>
                          <strong>{cargo.categoria_carga}</strong>
                        </div>
                        <div>
                          <span>Peso</span>
                          <strong>{cargo.peso_total}</strong>
                        </div>
                        <div>
                          <span>Coleta</span>
                          <strong>{formatDate(cargo.data_coleta)}</strong>
                        </div>
                        <div>
                          <span>Entrega</span>
                          <strong>{formatDate(cargo.prazo_entrega)}</strong>
                        </div>
                      </div>

                      {(cargo.janela_carregamento || cargo.exigencias_motorista || cargo.observacoes) && (
                        <div className="cargo-card__notes">
                          {cargo.janela_carregamento && <p><strong>Janela:</strong> {cargo.janela_carregamento}</p>}
                          {cargo.exigencias_motorista && <p><strong>Exigencias:</strong> {cargo.exigencias_motorista}</p>}
                          {cargo.observacoes && <p><strong>Observacoes:</strong> {cargo.observacoes}</p>}
                        </div>
                      )}

                      <div className="cargo-card__footer">
                        <span>
                          Atualizada em {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(cargo.updated_at))}
                        </span>
                        <div className="cargo-card__actions">
                          {cargo.status !== 'publicada' && (
                            <button
                              className="button button--ghost"
                              type="button"
                              disabled={actionCargoId === cargo.id}
                              onClick={() => handleCargoStatusChange(cargo.id, 'publicada')}
                            >
                              {actionCargoId === cargo.id ? 'Atualizando...' : 'Publicar'}
                            </button>
                          )}
                          {cargo.status !== 'rascunho' && (
                            <button
                              className="button button--ghost"
                              type="button"
                              disabled={actionCargoId === cargo.id}
                              onClick={() => handleCargoStatusChange(cargo.id, 'rascunho')}
                            >
                              {actionCargoId === cargo.id ? 'Atualizando...' : 'Mover para rascunho'}
                            </button>
                          )}
                          {cargo.status !== 'encerrada' && (
                            <button
                              className="button button--ghost"
                              type="button"
                              disabled={actionCargoId === cargo.id}
                              onClick={() => handleCargoStatusChange(cargo.id, 'encerrada')}
                            >
                              {actionCargoId === cargo.id ? 'Atualizando...' : 'Encerrar'}
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {session && isAdmin && (
          <section className="section" id="admin">
            <div className="section-heading">
              <span>Visao administrativa</span>
              <h2>Busque cargas de todas as empresas com filtro operacional.</h2>
            </div>

            <form className="admin-toolbar" onSubmit={handleAdminSearch}>
              <label className="admin-toolbar__search">
                Busca
                <input
                  type="text"
                  placeholder="Empresa, produto, cidade, UF ou tipo de veiculo"
                  value={adminFilters.search}
                  onChange={handleAdminFilterChange('search')}
                />
              </label>
              <label>
                Status
                <select value={adminFilters.status} onChange={handleAdminFilterChange('status')}>
                  <option value="">Todos</option>
                  <option value="publicada">Publicada</option>
                  <option value="rascunho">Rascunho</option>
                  <option value="encerrada">Encerrada</option>
                </select>
              </label>
              <button className="button button--primary admin-toolbar__button" type="submit">
                Buscar
              </button>
            </form>

            {adminError && <div className="form-feedback form-feedback--error">{adminError}</div>}

            {isLoadingAdminCargos ? (
              <div className="locked-form">
                <strong>Carregando painel administrativo</strong>
                <p>Buscando cargas globais do portal web.</p>
              </div>
            ) : adminCargos.length === 0 ? (
              <div className="locked-form">
                <strong>Nenhum resultado encontrado</strong>
                <p>Ajuste a busca ou o filtro para localizar cargas no painel administrativo.</p>
              </div>
            ) : (
              <div className="cargo-list">
                {adminCargos.map((cargo) => (
                  <article className="cargo-card" key={`admin-${cargo.id}`}>
                    <div className="cargo-card__top">
                      <div>
                        <span className={`status-badge status-badge--${cargo.status}`}>
                          {statusLabel(cargo.status)}
                        </span>
                        <h3>{cargo.produto}</h3>
                      </div>
                      <div className="cargo-card__price">
                        {formatCurrency(cargo.valor_frete, cargo.valor_frete_texto)}
                      </div>
                    </div>

                    <div className="cargo-card__grid">
                      <div>
                        <span>Empresa</span>
                        <strong>{cargo.empresa_nome}</strong>
                      </div>
                      <div>
                        <span>Rota</span>
                        <strong>
                          {cargo.cidade_coleta}/{cargo.uf_coleta} {'->'} {cargo.cidade_entrega}/{cargo.uf_entrega}
                        </strong>
                      </div>
                      <div>
                        <span>Compatibilidade</span>
                        <strong>{cargo.tipo_veiculo} | {cargo.tipo_carroceria}</strong>
                      </div>
                      <div>
                        <span>Categoria</span>
                        <strong>{cargo.categoria_carga}</strong>
                      </div>
                      <div>
                        <span>Peso</span>
                        <strong>{cargo.peso_total}</strong>
                      </div>
                      <div>
                        <span>Entrega</span>
                        <strong>{formatDate(cargo.prazo_entrega)}</strong>
                      </div>
                    </div>

                    {(cargo.janela_carregamento || cargo.exigencias_motorista || cargo.observacoes) && (
                      <div className="cargo-card__notes">
                        {cargo.janela_carregamento && <p><strong>Janela:</strong> {cargo.janela_carregamento}</p>}
                        {cargo.exigencias_motorista && <p><strong>Exigencias:</strong> {cargo.exigencias_motorista}</p>}
                        {cargo.observacoes && <p><strong>Observacoes:</strong> {cargo.observacoes}</p>}
                      </div>
                    )}

                    <div className="cargo-card__footer">
                      <span>
                        Atualizada em {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(cargo.updated_at))}
                      </span>
                      <div className="admin-company-meta">
                        <span>{cargo.empresa_nome}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

export default App

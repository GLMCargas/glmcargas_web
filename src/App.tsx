import { ChangeEvent, FormEvent, MouseEvent, useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'

const benefitCards = [
  {
    title: 'Publicação em minutos',
    text: 'Centralize origem, destino, peso, janela de coleta e exigências da operação em um fluxo simples para o time comercial ou logístico.',
  },
  {
    title: 'Triagem por compatibilidade',
    text: 'Organize a carga por tipo de veículo, carroceria e requisitos críticos para conversar só com motoristas aderentes à viagem.',
  },
  {
    title: 'Mais visibilidade operacional',
    text: 'Padronize a oferta para reduzir ruído na negociação e ganhar velocidade na contratação do frete.',
  },
]

const processSteps = [
  'Cadastre a operação com cidade de coleta, destino, peso e tipo de caminhão.',
  'Defina restrições da carga, janela de embarque e observações da doca.',
  'Receba interesse de motoristas aderentes e avance para o contato comercial.',
]

const metrics = [
  { value: '24h', label: 'para publicar novas cargas com consistência operacional' },
  { value: 'UF + cidade', label: 'como base para localizar motoristas mais próximos da origem' },
  { value: 'Veículo + carroceria', label: 'como critério principal de compatibilidade logística' },
]

const initialForm = {
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

const initialCompanyProfile = {
  companyName: '',
  cnpj: '',
  contactName: '',
  phone: '',
  email: '',
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
type CompanyProfileState = typeof initialCompanyProfile
type AuthFormState = typeof initialAuthForm
type SubmitMode = 'publicada' | 'rascunho'
type AuthMode = 'login' | 'register'
type CargoStatus = 'publicada' | 'rascunho' | 'encerrada'
type ActiveSection = 'cargas' | 'nova-carga' | 'chat' | 'perfil'
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

type CompanyProfileRow = {
  nome: string
  cnpj: string
  responsavel: string
  telefone: string
  email: string | null
}

function parseCurrencyToNumber(value: string) {
  const normalized = value.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function formatDate(value: string | null) {
  if (!value) return 'Não informado'

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

function getAuthErrorMessage(message: string) {
  const normalized = message.toLowerCase()

  if (normalized.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos. Verifique os dados e tente novamente.'
  }

  if (normalized.includes('email not confirmed')) {
    return 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada antes de entrar.'
  }

  if (normalized.includes('password should be at least')) {
    return 'A senha precisa ter pelo menos 6 caracteres.'
  }

  if (normalized.includes('user already registered')) {
    return 'Este e-mail já tem cadastro. Clique em entrar e use sua senha.'
  }

  return message
}

function SidebarIcon({ name }: { name: ActiveSection }) {
  if (name === 'cargas') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M4 7.5h16" />
        <path d="M6.5 4.5h11a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z" />
        <path d="M8 11h8" />
        <path d="M8 15h5" />
      </svg>
    )
  }

  if (name === 'nova-carga') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M12 5v14" />
        <path d="M5 12h14" />
        <path d="M6.5 4.5h11a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z" />
      </svg>
    )
  }

  if (name === 'chat') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M5.5 6.5h13a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7l-4 3v-3h-2a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" />
        <path d="M8 10.5h8" />
        <path d="M8 14h5" />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 12.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  )
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
  const [companyProfile, setCompanyProfile] = useState<CompanyProfileState>(initialCompanyProfile)
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [activeSection, setActiveSection] = useState<ActiveSection>('cargas')

  const loadCompanyProfile = async () => {
    if (!session) {
      setCompanyProfile(initialCompanyProfile)
      return
    }

    const { data, error } = await supabase
      .from('empresas_web')
      .select('nome, cnpj, responsavel, telefone, email')
      .maybeSingle()

    if (error) {
      setSubmitError(error.message)
      return
    }

    if (!data) {
      setCompanyProfile((current) => ({
        ...current,
        email: current.email || session.user.email || '',
      }))
      return
    }

    const profile = data as CompanyProfileRow

    setCompanyProfile({
      companyName: profile.nome,
      cnpj: profile.cnpj,
      contactName: profile.responsavel,
      phone: profile.telefone,
      email: profile.email || session.user.email || '',
    })
  }

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
      setCompanyProfile((current) => ({
        ...current,
        email: current.email || data.session?.user.email || '',
      }))
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setIsAdmin(false)
      setCompanyProfile((current) => ({
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
    void loadCompanyProfile()
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

  const handleCompanyProfileChange =
    (field: keyof CompanyProfileState) => (event: ChangeEvent<HTMLInputElement>) => {
      setCompanyProfile((current) => ({
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
      setAuthError(getAuthErrorMessage(response.error.message))
      return
    }

    setAuthForm(initialAuthForm)
    setAuthMessage(
      authMode === 'login'
        ? 'Login realizado com sucesso.'
        : response.data.session
          ? 'Conta criada com sucesso.'
          : 'Cadastro realizado. Confirme seu e-mail antes de entrar.',
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

    const isCompanyProfileComplete =
      companyProfile.companyName.trim() &&
      companyProfile.cnpj.trim() &&
      companyProfile.contactName.trim() &&
      companyProfile.phone.trim()

    if (!isCompanyProfileComplete) {
      setIsSubmitting(false)
      setSubmitError('Preencha o perfil da empresa antes de adicionar uma carga.')
      setActiveSection('perfil')
      return
    }

    const { error } = await supabase.rpc('publicar_carga_web', {
      p_status: mode,
      p_empresa_nome: companyProfile.companyName.trim(),
      p_empresa_cnpj: companyProfile.cnpj.trim(),
      p_empresa_responsavel: companyProfile.contactName.trim(),
      p_empresa_telefone: companyProfile.phone.trim(),
      p_empresa_email: companyProfile.email.trim() || null,
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
    setForm(() => ({
      ...initialForm,
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

  if (isLoadingSession) {
    return (
      <div className="auth-page">
        <div className="auth-loading">
          <span className="panel-card__label">GLM Cargas</span>
          <strong>Verificando sessão da empresa...</strong>
        </div>
      </div>
    )
  }

  if (!session && window.location.hash !== '#home-preview') {
    return (
      <div className="auth-page">
        <main className="auth-page__shell auth-page__shell--center">
          <section className="auth-card auth-card--entry" aria-label="Acesso da empresa">
            <div className="auth-brand">
              <span>GLM</span>
              <strong>Cargas</strong>
            </div>

            <div className="auth-card__heading">
              <span className="panel-card__label">Acesso da empresa</span>
              <h2>{authMode === 'login' ? 'Entrar na conta' : 'Criar conta da empresa'}</h2>
              <p>
                {authMode === 'login'
                  ? 'Use o e-mail cadastrado para acessar a homepage do portal.'
                  : 'Cadastre um e-mail e senha para liberar a publicação de cargas.'}
              </p>
            </div>

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
                  minLength={6}
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
              <p className="auth-switch">
                {authMode === 'login' ? 'Não tem conta?' : 'Já tem conta?'}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === 'login' ? 'register' : 'login')
                    setAuthMessage('')
                    setAuthError('')
                  }}
                >
                  {authMode === 'login' ? 'Clique aqui e crie uma' : 'Clique aqui para entrar'}
                </button>
              </p>
            </form>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className={isSidebarCollapsed ? 'app-layout app-layout--sidebar-collapsed' : 'app-layout'}>
      <aside className="sidebar" aria-label="Navegacao principal">
        <div className="sidebar__brand">
          <span>GLM</span>
          <strong>Cargas</strong>
        </div>

        <button
          className="sidebar__toggle"
          type="button"
          aria-label={isSidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
          onClick={() => setIsSidebarCollapsed((current) => !current)}
        >
          {isSidebarCollapsed ? '>' : '<'}
        </button>

        <nav className="sidebar__nav">
          <button
            className={activeSection === 'cargas' ? 'sidebar__link sidebar__link--active' : 'sidebar__link'}
            type="button"
            onClick={() => setActiveSection('cargas')}
          >
            <span>
              <SidebarIcon name="cargas" />
            </span>
            <strong>Minhas cargas</strong>
          </button>
          <button
            className={activeSection === 'nova-carga' ? 'sidebar__link sidebar__link--active' : 'sidebar__link'}
            type="button"
            onClick={() => setActiveSection('nova-carga')}
          >
            <span>
              <SidebarIcon name="nova-carga" />
            </span>
            <strong>Adicionar carga</strong>
          </button>
          <button
            className={activeSection === 'chat' ? 'sidebar__link sidebar__link--active' : 'sidebar__link'}
            type="button"
            onClick={() => setActiveSection('chat')}
          >
            <span>
              <SidebarIcon name="chat" />
            </span>
            <strong>Chat</strong>
          </button>
          <button
            className={activeSection === 'perfil' ? 'sidebar__link sidebar__link--active' : 'sidebar__link'}
            type="button"
            onClick={() => setActiveSection('perfil')}
          >
            <span>
              <SidebarIcon name="perfil" />
            </span>
            <strong>Perfil da empresa</strong>
          </button>
        </nav>

        <div className="sidebar__footer">
          <span>{session ? 'Conta conectada' : 'Modo preview'}</span>
          <strong>{session?.user.email ?? 'Sem login'}</strong>
        </div>
      </aside>

      <div className="page-shell">
        <nav className="topbar" aria-label="Conta da empresa">
          <div>
            <span className="panel-card__label">{session ? 'Sessão ativa' : 'Visualização'}</span>
            <strong>{session?.user.email ?? 'Preview da homepage sem login'}</strong>
          </div>
        {session ? (
          <button className="button button--ghost" type="button" onClick={handleLogout}>
            Sair
          </button>
        ) : (
          <a className="button button--ghost" href="#">
            Voltar ao login
          </a>
        )}
        </nav>

        {activeSection === 'nova-carga' && (
          <>
        <main>
        <section className="section section--form" id="publicar">
          <div className="section-hero">
            <div className="section-heading section-heading--compact">
              <span>Nova publicação</span>
              <h2>Cadastre uma carga com os principais dados que impactam a contratação.</h2>
            </div>
            <span className="section-hero__icon">
              <SidebarIcon name="nova-carga" />
            </span>
          </div>

          <form className="cargo-form cargo-form--compact" onSubmit={handleSubmit('publicada')}>
              <div className="form-profile-summary">
                <div>
                  <span>Empresa vinculada</span>
                  <strong>{companyProfile.companyName || 'Perfil da empresa não preenchido'}</strong>
                  <p>
                    CNPJ: {companyProfile.cnpj || 'Não informado'} | Responsável:{' '}
                    {companyProfile.contactName || 'Não informado'}
                  </p>
                </div>
                <button className="button button--ghost" type="button" onClick={() => setActiveSection('perfil')}>
                  Editar perfil
                </button>
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
                    Tipo de veículo
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
                    Exigências para o motorista
                    <input
                      type="text"
                      placeholder="Ex.: lona, cinta, MOPP, rastreador"
                      value={form.driverRequirements}
                      onChange={handleFieldChange('driverRequirements')}
                    />
                  </label>
                  <label className="field-grid__full">
                    Observações
                    <textarea
                      rows={5}
                      placeholder="Descreva doca, necessidade de agendamento, contato na coleta, restrições ou instruções importantes."
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
                  {isSubmitting ? 'Salvando...' : 'Salvar publicação'}
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
        </section>
        </main>
          </>
        )}

        {activeSection === 'cargas' && (
          <>
        <main>
        <section className="section" id="dashboard">
          <div className="section-heading">
            <span>Dashboard da empresa</span>
            <h2>Acompanhe o que já foi publicado e ajuste o status das cargas.</h2>
          </div>

          <div className="dashboard-shell">
              <div className="dashboard-summary">
                <div className="metric-card metric-card--total">
                  <span className="metric-card__icon">
                    <SidebarIcon name="cargas" />
                  </span>
                  <strong>{companyCargos.length}</strong>
                  <span>cargas visíveis para esta conta</span>
                </div>
                <div className="metric-card metric-card--active">
                  <span className="metric-card__icon">
                    <SidebarIcon name="nova-carga" />
                  </span>
                  <strong>{companyCargos.filter((cargo) => cargo.status === 'publicada').length}</strong>
                  <span>publicadas e ativas para negociação</span>
                </div>
                <div className="metric-card metric-card--draft">
                  <span className="metric-card__icon">
                    <SidebarIcon name="chat" />
                  </span>
                  <strong>{companyCargos.filter((cargo) => cargo.status === 'rascunho').length}</strong>
                  <span>rascunhos aguardando revisão</span>
                </div>
              </div>

              {cargoListError && <div className="form-feedback form-feedback--error">{cargoListError}</div>}

              {isLoadingCargos ? (
                <div className="locked-form">
                  <strong>Carregando dashboard</strong>
                  <p>Buscando as cargas publicadas pela empresa autenticada.</p>
                </div>
              ) : companyCargos.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-state__icon">
                    <SidebarIcon name="nova-carga" />
                  </span>
                  <strong>Nenhuma carga cadastrada</strong>
                  <p>
                    Comece criando sua primeira carga. Ela aparecerá aqui com status, rota,
                    compatibilidade e ações rápidas.
                  </p>
                  <button className="button button--primary" type="button" onClick={() => setActiveSection('nova-carga')}>
                    Adicionar primeira carga
                  </button>
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
                          {cargo.exigencias_motorista && <p><strong>Exigências:</strong> {cargo.exigencias_motorista}</p>}
                          {cargo.observacoes && <p><strong>Observações:</strong> {cargo.observacoes}</p>}
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
        </section>
        </main>
          </>
        )}

        <main>
        {activeSection === 'chat' && (
        <section className="section" id="chat">
          <div className="section-hero">
            <div className="section-heading">
              <span>Chat</span>
              <h2>Conversas da operação em um único lugar.</h2>
            </div>
            <span className="section-hero__icon">
              <SidebarIcon name="chat" />
            </span>
          </div>

          <div className="chat-layout">
            <aside className="chat-list" aria-label="Conversas">
              <div className="chat-list__header">
                <span>Conversas</span>
                <strong>Atendimento</strong>
              </div>
              <button className="chat-thread chat-thread--active" type="button">
                <span className="chat-thread__avatar">FM</span>
                <span>
                  <strong>Frete em análise</strong>
                  <small>Aguardando dados da carga</small>
                </span>
              </button>
              <button className="chat-thread" type="button">
                <span className="chat-thread__avatar">OP</span>
                <span>
                  <strong>Operação</strong>
                  <small>Nenhuma nova mensagem</small>
                </span>
              </button>
            </aside>

            <section className="chat-window" aria-label="Janela da conversa">
              <div className="chat-window__top">
                <div>
                  <span>Canal de negociação</span>
                  <strong>Frete em análise</strong>
                </div>
                <span className="status-badge status-badge--rascunho">Em aberto</span>
              </div>

              <div className="chat-messages">
                <div className="chat-message">
                  <span>GLM Cargas</span>
                  <p>Quando um motorista demonstrar interesse, a conversa aparecerá aqui.</p>
                </div>
                <div className="chat-message chat-message--muted">
                  <span>Sistema</span>
                  <p>Use este espaço para acompanhar dúvidas sobre rota, prazo e compatibilidade.</p>
                </div>
              </div>

              <div className="chat-compose">
                <input type="text" placeholder="Digite uma mensagem..." disabled />
                <button className="button button--primary" type="button" disabled>
                  Enviar
                </button>
              </div>
            </section>
          </div>
        </section>
        )}

        {activeSection === 'perfil' && (
        <section className="section" id="perfil-empresa">
          <div className="section-hero">
            <div className="section-heading">
              <span>Perfil da empresa</span>
              <h2>Dados principais usados nas publicações.</h2>
            </div>
            <span className="section-hero__icon">
              <SidebarIcon name="perfil" />
            </span>
          </div>

          <div className="profile-overview">
            <div className="profile-avatar" aria-hidden="true">
              {(companyProfile.companyName || 'GLM').slice(0, 2).toUpperCase()}
            </div>
            <div className="profile-overview__content">
              <span>Identidade da empresa</span>
              <strong>{companyProfile.companyName || 'Empresa ainda não identificada'}</strong>
              <p>
                {companyProfile.cnpj ? `CNPJ ${companyProfile.cnpj}` : 'Preencha os dados abaixo para vincular as próximas cargas.'}
              </p>
            </div>
            <div className="profile-overview__meta">
              <span>Status</span>
              <strong>{companyProfile.companyName && companyProfile.cnpj ? 'Perfil em andamento' : 'Incompleto'}</strong>
            </div>
          </div>

          <form className="cargo-form profile-form">
            <div className="form-block">
              <h3>Dados da empresa</h3>
              <div className="field-grid field-grid--two">
                <label>
                  Nome da empresa
                  <input
                    required
                    type="text"
                    placeholder="Ex.: Logistica Vale Norte"
                    value={companyProfile.companyName}
                    onChange={handleCompanyProfileChange('companyName')}
                  />
                </label>
                <label>
                  CNPJ
                  <input
                    required
                    type="text"
                    placeholder="00.000.000/0000-00"
                    value={companyProfile.cnpj}
                    onChange={handleCompanyProfileChange('cnpj')}
                  />
                </label>
                <label>
                  Responsável pela operação
                  <input
                    required
                    type="text"
                    placeholder="Nome do contato operacional"
                    value={companyProfile.contactName}
                    onChange={handleCompanyProfileChange('contactName')}
                  />
                </label>
                <label>
                  Telefone / WhatsApp
                  <input
                    required
                    type="text"
                    placeholder="(00) 00000-0000"
                    value={companyProfile.phone}
                    onChange={handleCompanyProfileChange('phone')}
                  />
                </label>
                <label className="field-grid__full">
                  E-mail da operação
                  <input
                    type="email"
                    placeholder="operacao@empresa.com.br"
                    value={companyProfile.email}
                    onChange={handleCompanyProfileChange('email')}
                  />
                </label>
              </div>
            </div>

            <div className="form-actions">
              <button className="button button--primary" type="button" onClick={() => setActiveSection('nova-carga')}>
                Usar dados e adicionar carga
              </button>
            </div>
          </form>
        </section>
        )}

        {session && isAdmin && (
          <section className="section" id="admin">
            <div className="section-heading">
              <span>Visão administrativa</span>
              <h2>Busque cargas de todas as empresas com filtro operacional.</h2>
            </div>

            <form className="admin-toolbar" onSubmit={handleAdminSearch}>
              <label className="admin-toolbar__search">
                Busca
                <input
                  type="text"
                  placeholder="Empresa, produto, cidade, UF ou tipo de veículo"
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
                        {cargo.exigencias_motorista && <p><strong>Exigências:</strong> {cargo.exigencias_motorista}</p>}
                        {cargo.observacoes && <p><strong>Observações:</strong> {cargo.observacoes}</p>}
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
    </div>
  )
}

export default App

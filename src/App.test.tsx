import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

type MockSession = {
  user: {
    id: string
    email: string
  }
}

type QueryFilter = {
  type: 'eq' | 'in'
  column: string
  value?: unknown
  values?: unknown[]
}

type QueryState = {
  table: string
  action: 'select' | 'insert' | 'update'
  columns?: string
  filters: QueryFilter[]
  order?: {
    column: string
    options?: unknown
  }
  values?: unknown
  terminal?: 'then' | 'maybeSingle' | 'single'
}

type QueryResponse = {
  data: unknown
  error: { message: string } | null
}

const {
  mockState,
  queryMock,
  resetMockState,
  supabaseMock,
  testSession,
} = vi.hoisted(() => {
  type LocalMockSession = {
    user: {
      id: string
      email: string
    }
  }

  type LocalQueryFilter = {
    type: 'eq' | 'in'
    column: string
    value?: unknown
    values?: unknown[]
  }

  type LocalQueryState = {
    table: string
    action: 'select' | 'insert' | 'update'
    columns?: string
    filters: LocalQueryFilter[]
    order?: {
      column: string
      options?: unknown
    }
    values?: unknown
    terminal?: 'then' | 'maybeSingle' | 'single'
  }

  type LocalQueryResponse = {
    data: unknown
    error: { message: string } | null
  }

  const testSession = {
    user: {
      id: 'empresa-user-1',
      email: 'operacao@glm.com.br',
    },
  } satisfies LocalMockSession

  const mockState = {
    adminCargos: [] as unknown[],
    chatMessages: [] as Record<string, unknown>[],
    chatRooms: [] as Record<string, unknown>[],
    chatThreads: [] as Record<string, unknown>[],
    companyCargos: [] as unknown[],
    companyProfile: null as Record<string, unknown> | null,
    isAdmin: false,
    queryErrors: {} as Record<string, { message: string }>,
    rpcErrors: {} as Record<string, { message: string }>,
    session: null as LocalMockSession | null,
    tripRequests: [] as Record<string, unknown>[],
  }

  const resetMockState = () => {
    mockState.adminCargos = []
    mockState.chatMessages = []
    mockState.chatRooms = []
    mockState.chatThreads = []
    mockState.companyCargos = []
    mockState.companyProfile = null
    mockState.isAdmin = false
    mockState.queryErrors = {}
    mockState.rpcErrors = {}
    mockState.session = null
    mockState.tripRequests = []
  }

  const response = (
    data: unknown,
    error: { message: string } | null = null,
  ): LocalQueryResponse => ({
    data,
    error,
  })

  const filterRows = (
    rows: Record<string, unknown>[],
    filters: LocalQueryFilter[],
  ) =>
    filters.reduce((currentRows, filter) => {
      if (filter.type === 'eq') {
        return currentRows.filter((row) => row[filter.column] === filter.value)
      }

      return currentRows.filter((row) =>
        filter.values?.includes(row[filter.column]),
      )
    }, rows)

  const queryMock = vi.fn((state: LocalQueryState): LocalQueryResponse => {
    const tableError = mockState.queryErrors[state.table]

    if (tableError) {
      return response(null, tableError)
    }

    if (state.table === 'empresas_web') {
      return response(mockState.companyProfile)
    }

    if (state.table === 'chat_rooms') {
      return response(filterRows(mockState.chatRooms, state.filters))
    }

    if (state.table === 'solicitacoes_viagem') {
      if (state.action === 'update') {
        const values = state.values as Record<string, unknown>
        const updatedAt = '2026-05-10T13:10:00.000Z'

        mockState.tripRequests = mockState.tripRequests.map((request) => {
          const matches = state.filters.every(
            (filter) =>
              filter.type !== 'eq' || request[filter.column] === filter.value,
          )

          return matches
            ? {
                ...request,
                ...values,
                responded_at: updatedAt,
              }
            : request
        })

        return response({
          status: values.status,
          responded_at: updatedAt,
        })
      }

      return response(filterRows(mockState.tripRequests, state.filters))
    }

    if (state.table === 'chat_messages') {
      if (state.action === 'insert') {
        const values = state.values as Record<string, unknown>
        const insertedMessage = {
          id: `msg-${mockState.chatMessages.length + 1}`,
          room_id: values.room_id,
          sender_user_id: values.sender_user_id,
          message: values.message,
          created_at: '2026-05-10T13:15:00.000Z',
        }

        mockState.chatMessages.push(insertedMessage)

        return response(insertedMessage)
      }

      return response(filterRows(mockState.chatMessages, state.filters))
    }

    return response([])
  })

  const snapshot = (state: LocalQueryState, terminal: LocalQueryState['terminal']) => ({
    ...state,
    filters: [...state.filters],
    terminal,
  })

  const createQueryBuilder = (table: string) => {
    const state: LocalQueryState = {
      table,
      action: 'select',
      filters: [],
    }

    const builder = {
      eq: vi.fn((column: string, value: unknown) => {
        state.filters.push({ type: 'eq', column, value })
        return builder
      }),
      in: vi.fn((column: string, values: unknown[]) => {
        state.filters.push({ type: 'in', column, values })
        return builder
      }),
      insert: vi.fn((values: unknown) => {
        state.action = 'insert'
        state.values = values
        return builder
      }),
      maybeSingle: vi.fn(() =>
        Promise.resolve(queryMock(snapshot(state, 'maybeSingle'))),
      ),
      order: vi.fn((column: string, options?: unknown) => {
        state.order = { column, options }
        return builder
      }),
      select: vi.fn((columns?: string) => {
        state.action = state.action === 'select' ? 'select' : state.action
        state.columns = columns
        return builder
      }),
      single: vi.fn(() =>
        Promise.resolve(queryMock(snapshot(state, 'single'))),
      ),
      then: (
        resolve: (value: LocalQueryResponse) => unknown,
        reject: (reason?: unknown) => unknown,
      ) => Promise.resolve(queryMock(snapshot(state, 'then'))).then(resolve, reject),
      update: vi.fn((values: unknown) => {
        state.action = 'update'
        state.values = values
        return builder
      }),
    }

    return builder
  }

  const supabaseMock = {
    auth: {
      getSession: vi.fn(() =>
        Promise.resolve({ data: { session: mockState.session } }),
      ),
      onAuthStateChange: vi.fn(() => ({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      })),
      signInWithPassword: vi.fn((_credentials: unknown) =>
        Promise.resolve<{
          data: { session: LocalMockSession | null }
          error: { message: string } | null
        }>({ data: { session: mockState.session }, error: null }),
      ),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
      signUp: vi.fn((_credentials: unknown) =>
        Promise.resolve<{
          data: { session: LocalMockSession | null }
          error: { message: string } | null
        }>({ data: { session: null }, error: null }),
      ),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    from: vi.fn((table: string) => createQueryBuilder(table)),
    removeChannel: vi.fn(() => Promise.resolve()),
    rpc: vi.fn((name: string, args?: Record<string, unknown>) => {
      const rpcError = mockState.rpcErrors[name]

      if (rpcError) {
        return Promise.resolve({ data: null, error: rpcError })
      }

      if (name === 'minhas_cargas_web') {
        return Promise.resolve({ data: mockState.companyCargos, error: null })
      }

      if (name === 'is_web_admin') {
        return Promise.resolve({ data: mockState.isAdmin, error: null })
      }

      if (name === 'admin_listar_cargas_web') {
        return Promise.resolve({ data: mockState.adminCargos, error: null })
      }

      if (name === 'empresa_listar_conversas_chat_web') {
        return Promise.resolve({ data: mockState.chatThreads, error: null })
      }

      if (name === 'listar_mensagens_chat_web') {
        const candidaturaId = args?.p_candidatura_id

        return Promise.resolve({
          data: mockState.chatMessages.filter(
            (message) => message.candidatura_id === candidaturaId,
          ),
          error: null,
        })
      }

      if (name === 'enviar_mensagem_chat_web') {
        mockState.chatMessages.push({
          id: `msg-${mockState.chatMessages.length + 1}`,
          candidatura_id: args?.p_candidatura_id,
          sender_auth_user_id: testSession.user.id,
          sender_role: 'empresa',
          mensagem: args?.p_mensagem,
          created_at: '2026-05-10T13:15:00.000Z',
        })

        return Promise.resolve({ data: `msg-${mockState.chatMessages.length}`, error: null })
      }

      return Promise.resolve({ data: 101, error: null })
    }),
  }

  return {
    mockState,
    queryMock,
    resetMockState,
    supabaseMock,
    testSession,
  }
})

vi.mock('./lib/supabase', () => ({
  supabase: supabaseMock,
}))

const mockCitiesFetch = () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve([
            {
              id: 1,
              nome: 'Campinas',
              microrregiao: {
                mesorregiao: {
                  UF: {
                    sigla: 'SP',
                  },
                },
              },
            },
            {
              id: 2,
              nome: 'Curitiba',
              microrregiao: {
                mesorregiao: {
                  UF: {
                    sigla: 'PR',
                  },
                },
              },
            },
          ]),
        ok: true,
      }),
    ),
  )
}

const renderApp = async () => {
  const user = userEvent.setup()

  render(<App />)
  await waitFor(() => expect(supabaseMock.auth.getSession).toHaveBeenCalled())

  return user
}

const defaultCompanyProfile = {
  tipo_pessoa: 'juridica',
  nome: 'GLM Transportes',
  cpf: null,
  cnpj: '12.345.678/0001-90',
  responsavel: 'Luisa Scherer',
  telefone: '(51) 99999-0000',
  email: 'operacao@glm.com.br',
  cep: null,
  logradouro: null,
  numero_endereco: null,
  complemento: null,
  bairro: null,
  cidade: null,
  uf: null,
  vinculado_nome: 'Luisa Scherer',
  vinculado_cpf: null,
  vinculado_cnpj: null,
}

const getPublishPayload = () => {
  const call = supabaseMock.rpc.mock.calls.find(
    ([name]) => name === 'publicar_carga_web',
  )

  return call?.[1] as Record<string, unknown> | undefined
}

const findQueryCall = (partial: Partial<QueryState>) =>
  queryMock.mock.calls.find(([state]: [QueryState]) =>
    Object.entries(partial).every(
      ([key, value]) => state[key as keyof QueryState] === value,
    ),
  )?.[0]

describe('GLM Cargas web', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetMockState()
    mockCitiesFetch()
    window.location.hash = ''
  })

  it('exibe erro amigavel quando o login falha e envia o e-mail sem espacos', async () => {
    supabaseMock.auth.signInWithPassword.mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'Invalid login credentials' },
    })

    await renderApp()

    const emailInput = await screen.findByLabelText(/E-mail de acesso/i)
    const passwordInput = screen.getByLabelText(/Senha/i)
    const form = emailInput.closest('form')

    expect(form).not.toBeNull()

    fireEvent.change(emailInput, {
      target: { value: ' comercial@empresa.com.br ' },
    })
    fireEvent.change(passwordInput, {
      target: { value: '123456' },
    })
    fireEvent.submit(form as HTMLFormElement)

    await waitFor(() =>
      expect(supabaseMock.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'comercial@empresa.com.br',
        password: '123456',
      }),
    )
    expect(
      await screen.findByText(/E-mail ou senha incorretos/i),
    ).toBeInTheDocument()
  })

  it('permite criar conta da empresa quando o fluxo de cadastro existe no projeto', async () => {
    await renderApp()

    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /Clique aqui/i }))
    await user.type(
      screen.getByLabelText(/Razão social/i),
      'Nova GLM Transportes',
    )
    await user.type(screen.getByLabelText(/^CNPJ$/i), '12345678000190')
    await user.type(screen.getByLabelText(/Telefone/i), '51999990000')
    await user.type(screen.getByLabelText(/E-mail de acesso/i), 'nova@glm.com.br')
    await user.type(screen.getByLabelText(/Senha/i), '123456')
    const createButtons = screen.getAllByRole('button', { name: /Criar conta/i })
    await user.click(createButtons[createButtons.length - 1])

    await waitFor(() =>
      expect(supabaseMock.auth.signUp).toHaveBeenCalledWith({
        email: 'nova@glm.com.br',
        password: '123456',
        options: {
          data: {
            tipo_pessoa: 'juridica',
            nome: 'Nova GLM Transportes',
            cpf: '',
            cnpj: '12345678000190',
            telefone: '51999990000',
            email: 'nova@glm.com.br',
          },
        },
      }),
    )
    expect(
      await screen.findByText(/Cadastro realizado/i),
    ).toBeInTheDocument()
  })

  it('carrega perfil da empresa do Supabase e mostra os campos para revisao', async () => {
    mockState.session = testSession as MockSession
    mockState.companyProfile = defaultCompanyProfile

    const user = await renderApp()

    await screen.findByText(/Dashboard da conta/i)
    await user.click(screen.getByRole('button', { name: /Perfil da conta/i }))

    expect(
      await screen.findByDisplayValue('GLM Transportes'),
    ).toBeInTheDocument()
    expect(screen.getByDisplayValue('12.345.678/0001-90')).toBeInTheDocument()
    expect(screen.getByDisplayValue('(51) 99999-0000')).toBeInTheDocument()
    expect(screen.getByText(/Incompleto/i)).toBeInTheDocument()
  })

  it('lista cargas da empresa, formata datas/valores e marca motorista aceito', async () => {
    mockState.session = testSession as MockSession
    mockState.companyProfile = defaultCompanyProfile
    mockState.companyCargos = [
      {
        id: 77,
        status: 'publicada',
        empresa_nome: 'GLM Transportes',
        cidade_coleta: 'Campinas',
        uf_coleta: 'SP',
        data_coleta: '2026-05-11',
        cidade_entrega: 'Curitiba',
        uf_entrega: 'PR',
        prazo_entrega: '2026-05-12',
        produto: 'Bobinas de aco',
        peso_total: '28 toneladas',
        valor_frete: 1250,
        valor_frete_texto: null,
        tipo_veiculo: 'Truck',
        tipo_carroceria: 'Sider',
        categoria_carga: 'Lotacao',
        janela_carregamento: '08:00 as 14:00',
        exigencias_motorista: 'Lona',
        observacoes: 'Entrada pela doca 2',
        created_at: '2026-05-10T10:00:00.000Z',
        updated_at: '2026-05-10T12:00:00.000Z',
      },
    ]
    await renderApp()

    expect(await screen.findByText('Bobinas de aco')).toBeInTheDocument()
    expect(screen.getByText(/Campinas\/SP.*Curitiba\/PR/i)).toBeInTheDocument()
    expect(screen.getByText(/R\$\s*1\.250,00/i)).toBeInTheDocument()
    expect(screen.getByText('11/05/2026')).toBeInTheDocument()
    expect(screen.getByText('12/05/2026')).toBeInTheDocument()
    expect(screen.getByText(/^Publicada$/i)).toBeInTheDocument()
  })

  it('nao publica carga sem perfil de empresa cadastrado', async () => {
    mockState.session = testSession as MockSession

    const user = await renderApp()

    await user.click(await screen.findByRole('button', { name: /Adicionar primeira carga/i }))
    await user.click(screen.getByRole('button', { name: /Salvar rascunho/i }))

    await waitFor(() =>
      expect(screen.getByText(/Dados principais da conta/i)).toBeInTheDocument(),
    )
    expect(
      supabaseMock.rpc.mock.calls.some(
        ([name]) => name === 'publicar_carga_web',
      ),
    ).toBe(false)
  })

  it('publica carga com payload normalizado para a RPC do Supabase', async () => {
    mockState.session = testSession as MockSession
    mockState.companyProfile = defaultCompanyProfile

    const user = await renderApp()

    await user.click(await screen.findByRole('button', { name: /^Adicionar carga$/i }))
    await user.type(screen.getByPlaceholderText('Ex.: Campinas'), 'Campinas')
    await user.clear(screen.getByPlaceholderText('SP'))
    await user.type(screen.getByPlaceholderText('SP'), 'sp')
    await user.type(screen.getByPlaceholderText('Ex.: Curitiba'), 'Curitiba')
    await user.clear(screen.getByPlaceholderText('PR'))
    await user.type(screen.getByPlaceholderText('PR'), 'pr')
    await user.type(screen.getByPlaceholderText('Ex.: bobinas de aco'), ' Bobinas de aco ')
    await user.type(screen.getByPlaceholderText('Ex.: 28 toneladas'), ' 28 toneladas ')
    await user.type(screen.getByLabelText(/Valor do frete/i), '1234,56')

    const selects = screen.getAllByRole('combobox')
    await user.selectOptions(selects[0], 'Truck')
    await user.selectOptions(selects[1], 'Sider')
    await user.selectOptions(selects[2], 'Fracionada')

    await user.type(screen.getByPlaceholderText('Ex.: 08:00 as 14:00'), ' 08:00 as 14:00 ')
    await user.type(screen.getByPlaceholderText(/MOPP/i), ' Lona ')
    await user.type(screen.getByRole('textbox', { name: /Observ/i }), ' Doca 2 ')
    await user.click(screen.getByRole('button', { name: /Salvar public/i }))

    await waitFor(() =>
      expect(getPublishPayload()).toMatchObject({
        p_status: 'publicada',
        p_tipo_pessoa: 'juridica',
        p_nome: 'GLM Transportes',
        p_cpf: null,
        p_cnpj: '12345678000190',
        p_telefone: '51999990000',
        p_email: 'operacao@glm.com.br',
        p_cidade_coleta: 'Campinas',
        p_uf_coleta: 'SP',
        p_data_coleta: null,
        p_coleta_endereco: 'Campinas, SP, Brasil',
        p_coleta_latitude: null,
        p_coleta_longitude: null,
        p_coleta_place_id: null,
        p_cidade_entrega: 'Curitiba',
        p_uf_entrega: 'PR',
        p_prazo_entrega: null,
        p_entrega_endereco: 'Curitiba, PR, Brasil',
        p_entrega_latitude: null,
        p_entrega_longitude: null,
        p_entrega_place_id: null,
        p_produto: 'Bobinas de aco',
        p_peso_total: '28 toneladas',
        p_valor_frete: 1234.56,
        p_tipo_veiculo: 'Truck',
        p_tipo_carroceria: 'Sider',
        p_categoria_carga: 'Fracionada',
        p_janela_carregamento: '08:00 as 14:00',
        p_exigencias_motorista: 'Lona',
        p_observacoes: 'Doca 2',
      }),
    )
    expect(String(getPublishPayload()?.p_valor_frete_texto)).toMatch(
      /1\.234,56|1234,56/,
    )
  })

  it('carrega chat e envia mensagem sem espacos extras', async () => {
    mockState.session = testSession as MockSession
    mockState.companyProfile = defaultCompanyProfile
    mockState.chatRooms = [
      {
        id: 'room-1',
        created_at: '2026-05-10T11:00:00.000Z',
        viagem_id: 7,
        Viagens: {
          empresa: 'GLM Transportes',
          origem_cidade: 'Campinas',
          origem_uf: 'SP',
          destino_cidade: 'Curitiba',
          destino_uf: 'PR',
        },
      },
    ]
    mockState.tripRequests = [
      {
        room_id: 'room-1',
        status: 'Aguardando',
        created_at: '2026-05-10T11:05:00.000Z',
        responded_at: null,
        mensagem_inicial: 'Me chamo Bruno e tenho interesse.',
      },
    ]
    mockState.chatThreads = [
      {
        candidatura_id: 'cand-1',
        status: 'aceita',
        carga_id: '7',
        carga_produto: 'Bobinas de aco',
        carga_origem: 'Campinas/SP',
        carga_destino: 'Curitiba/PR',
        motorista_auth_user_id: 'motorista-1',
        motorista_nome: 'Bruno',
        motorista_telefone: '(51) 98888-0000',
        motorista_email: 'bruno@motorista.com',
        ultima_mensagem: 'Posso coletar hoje.',
        ultima_mensagem_em: '2026-05-10T11:10:00.000Z',
        created_at: '2026-05-10T11:05:00.000Z',
      },
    ]
    mockState.chatMessages = [
      {
        id: 'msg-1',
        candidatura_id: 'cand-1',
        room_id: 'room-1',
        sender_auth_user_id: 'motorista-1',
        sender_user_id: 'motorista-1',
        sender_role: 'motorista',
        message: 'Posso coletar hoje.',
        mensagem: 'Posso coletar hoje.',
        created_at: '2026-05-10T11:10:00.000Z',
      },
    ]

    const user = await renderApp()

    await user.click(screen.getByRole('button', { name: /^Chat$/i }))

    expect((await screen.findAllByText(/Bruno/i)).length).toBeGreaterThan(0)
    expect((await screen.findAllByText('Posso coletar hoje.')).length).toBeGreaterThan(0)

    await user.type(
      screen.getByPlaceholderText(/Digite uma mensagem/i),
      '  Podemos alinhar por aqui?  ',
    )
    await user.click(screen.getByRole('button', { name: /Enviar/i }))

    await waitFor(() =>
      expect(
        queryMock.mock.calls.some(([state]: [QueryState]) => {
          const values = state.values as Record<string, unknown> | undefined

          return (
            state.table === 'chat_messages' &&
            state.action === 'insert' &&
            values?.message === 'Podemos alinhar por aqui?'
          )
        }) ||
          supabaseMock.rpc.mock.calls.some(([name, args]) => {
            const payload = args as Record<string, unknown> | undefined

            return (
              name === 'enviar_mensagem_chat_web' &&
              payload?.p_mensagem === 'Podemos alinhar por aqui?'
            )
          }),
      ).toBe(true),
    )
  })
})

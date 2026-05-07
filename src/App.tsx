import { ChangeEvent, FormEvent, MouseEvent, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';

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
];

const processSteps = [
  'Cadastre a operação com cidade de coleta, destino, peso e tipo de caminhão.',
  'Defina restrições da carga, janela de embarque e observações da doca.',
  'Receba interesse de motoristas aderentes e avance para o contato comercial.',
];

const metrics = [
  {
    value: '24h',
    label: 'para publicar novas cargas com consistência operacional',
  },
  {
    value: 'UF + cidade',
    label: 'como base para localizar motoristas mais próximos da origem',
  },
  {
    value: 'Veículo + carroceria',
    label: 'como critério principal de compatibilidade logística',
  },
];

const vehicleTypeOptions = [
  'Bitrem',
  'Carreta',
  'Carreta LS',
  'Rodotrem',
  'Vanderléia',
  'Bitruck',
  'Truck',
  '3/4',
  'Fiorino',
  'Toco',
  'VLC',
];

const bodyTypeOptions = [
  'Baú',
  'Baú Frigorífico',
  'Baú Refrigerado',
  'Sider',
  'Caçamba',
  'Grade Baixa',
  'Graneleiro',
  'Plataforma',
  'Prancha',
  'Apenas Cavalo',
  'Bug Porta Container',
  'Cavaqueira',
  'Cegonheiro',
  'Gaiola',
  'Hopper',
  'Munck',
  'Silo',
  'Tanque',
];

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
};

const initialCompanyProfile = {
  companyName: '',
  cnpj: '',
  contactName: '',
  phone: '',
  email: '',
};

const initialAuthForm = {
  email: '',
  password: '',
};

const initialAdminFilters = {
  search: '',
  status: '',
};

type FormState = typeof initialForm;
type CompanyProfileState = typeof initialCompanyProfile;
type AuthFormState = typeof initialAuthForm;
type SubmitMode = 'publicada' | 'rascunho';
type AuthMode = 'login' | 'register';
type CargoStatus = 'publicada' | 'rascunho' | 'encerrada';
type ActiveSection = 'cargas' | 'nova-carga' | 'chat' | 'perfil';
type AdminFilters = typeof initialAdminFilters;
type TripRequestStatus = 'Aguardando' | 'Aceita' | 'Recusada';

type CompanyCargo = {
  id: number;
  status: CargoStatus;
  empresa_nome: string;
  cidade_coleta: string;
  uf_coleta: string;
  data_coleta: string | null;
  cidade_entrega: string;
  uf_entrega: string;
  prazo_entrega: string | null;
  produto: string;
  peso_total: string;
  valor_frete: number | null;
  valor_frete_texto: string | null;
  tipo_veiculo: string;
  tipo_carroceria: string;
  categoria_carga: string;
  janela_carregamento: string | null;
  exigencias_motorista: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  hasAcceptedDriver?: boolean;
  chosenDriverName?: string | null;
  chosenTripId?: number | null;
};

type CompanyProfileRow = {
  nome: string;
  cnpj: string;
  responsavel: string;
  telefone: string;
  email: string | null;
};

type ChatTripRow = {
  empresa: string | null;
  produto?: string | null;
  origem_cidade: string | null;
  origem_uf: string | null;
  destino_cidade: string | null;
  destino_uf: string | null;
  data_limite_entrega?: string | null;
  valor?: number | null;
};

type ChatRoomRow = {
  id: string;
  viagem_id: number;
  created_at: string;
  Viagens: ChatTripRow[] | ChatTripRow | null;
};

type ChatRequestRow = {
  room_id: string;
  status: TripRequestStatus;
  created_at: string;
  responded_at: string | null;
  mensagem_inicial: string | null;
};

type ChatMessageRow = {
  id: string;
  room_id: string;
  sender_user_id: string;
  message: string | null;
  created_at: string;
};

type ChatMessage = {
  id: string;
  roomId: string;
  senderUserId: string;
  message: string;
  createdAt: string;
};

type ChatRoomSummary = {
  id: string;
  viagemId: number;
  createdAt: string;
  companyName: string;
  driverName: string;
  routeLabel: string;
  status: TripRequestStatus;
  respondedAt: string | null;
  initialMessage: string | null;
  lastMessagePreview: string;
  lastMessageAt: string | null;
};

type CargoNegotiationMatch = {
  roomId: string;
  viagemId: number;
  produto: string;
  cidadeColeta: string;
  ufColeta: string;
  cidadeEntrega: string;
  ufEntrega: string;
  status: TripRequestStatus;
  respondedAt: string | null;
  createdAt: string;
  driverName: string;
};

type CityOption = {
  id: number;
  name: string;
  state: string;
};

type CityField = 'pickupCity' | 'deliveryCity';

function parseCurrencyToNumber(value: string) {
  const normalized = value
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  const amount = Number(digits) / 100;

  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value: string | null) {
  if (!value) return 'Não informado';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

function formatCurrency(value: number | null, raw: string | null) {
  if (raw) {
    const trimmed = raw.trim();

    if (!trimmed) return 'A combinar';
    if (trimmed.toLowerCase().includes('combinar')) return trimmed;
    if (trimmed.startsWith('R$')) return trimmed;

    return `R$ ${trimmed}`;
  }
  if (value === null) return 'A combinar';

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatDateTime(value: string | null) {
  if (!value) return 'Agora';

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatChatTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatRouteLabel(trip: ChatTripRow | null, viagemId: number) {
  const origemCidade = trip?.origem_cidade?.trim() || '';
  const origemUf = trip?.origem_uf?.trim() || '';
  const destinoCidade = trip?.destino_cidade?.trim() || '';
  const destinoUf = trip?.destino_uf?.trim() || '';

  if (!origemCidade && !destinoCidade) {
    return `Viagem #${viagemId}`;
  }

  return `${origemCidade}-${origemUf} -> ${destinoCidade}-${destinoUf}`;
}

function normalizeSearchValue(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

function getCityStateField(cityField: CityField) {
  return cityField === 'pickupCity' ? 'pickupState' : 'deliveryState';
}

function getChatTrip(value: ChatTripRow[] | ChatTripRow | null) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function getDriverNameFromMessage(message: string | null) {
  const content = message?.trim();

  if (!content) {
    return 'Motorista';
  }

  const patterns = [
    /meu nome\s+(?:é|e|eh)\s+(.+?)(?:\s+e tenho interesse|\.)/i,
    /me chamo\s+(.+?)(?:\s+e tenho interesse|\.)/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);

    if (match?.[1]?.trim()) {
      return match[1].trim();
    }
  }

  return 'Motorista';
}

function normalizeChatMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    roomId: row.room_id,
    senderUserId: row.sender_user_id,
    message: row.message?.trim() || 'Mensagem sem texto',
    createdAt: row.created_at,
  };
}

function chatStatusLabel(status: TripRequestStatus) {
  if (status === 'Aceita') return 'Aceita';
  if (status === 'Recusada') return 'Recusada';
  return 'Aguardando';
}

function chatStatusClassName(status: TripRequestStatus) {
  if (status === 'Aceita') return 'chat-status chat-status--accepted';
  if (status === 'Recusada') return 'chat-status chat-status--rejected';
  return 'chat-status chat-status--waiting';
}

function getStatusMessage(status: Exclude<TripRequestStatus, 'Aguardando'>) {
  if (status === 'Aceita') {
    return 'Sua viagem foi aceita. Vamos conversar para alinhar os próximos detalhes.';
  }

  return 'Sua viagem foi recusada. No momento ja encontramos outro motorista para esta carga.';
}

function statusLabel(status: CargoStatus, hasAcceptedDriver = false) {
  if (hasAcceptedDriver) return 'Motorista escolhido';
  if (status === 'publicada') return 'Publicada';
  if (status === 'rascunho') return 'Rascunho';
  return 'Encerrada';
}

function getCargoStatusClassName(status: CargoStatus, hasAcceptedDriver = false) {
  if (hasAcceptedDriver) return 'status-badge status-badge--chosen';
  return `status-badge status-badge--${status}`;
}

function isCargoActiveForNegotiation(cargo: CompanyCargo) {
  return cargo.status === 'publicada' && !cargo.hasAcceptedDriver;
}

function canEditCargo(cargo: CompanyCargo) {
  return cargo.status !== 'encerrada' && !cargo.hasAcceptedDriver;
}

function mapCargoToFormState(cargo: CompanyCargo): FormState {
  return {
    pickupCity: cargo.cidade_coleta,
    pickupState: cargo.uf_coleta,
    pickupDate: cargo.data_coleta ?? '',
    deliveryCity: cargo.cidade_entrega,
    deliveryState: cargo.uf_entrega,
    deliveryDate: cargo.prazo_entrega ?? '',
    cargoType: cargo.produto,
    cargoWeight: cargo.peso_total,
    freightValue: cargo.valor_frete_texto?.trim()
      ? formatCurrencyInput(cargo.valor_frete_texto)
      : cargo.valor_frete !== null
        ? formatCurrencyInput(String(Math.round(cargo.valor_frete * 100)))
        : '',
    vehicleType: cargo.tipo_veiculo,
    bodyType: cargo.tipo_carroceria,
    loadCategory: cargo.categoria_carga,
    loadingWindow: cargo.janela_carregamento ?? '',
    driverRequirements: cargo.exigencias_motorista ?? '',
    notes: cargo.observacoes ?? '',
  };
}

function cargoMatchesNegotiation(
  cargo: CompanyCargo,
  negotiation: CargoNegotiationMatch,
) {
  return (
    normalizeSearchValue(cargo.produto) ===
      normalizeSearchValue(negotiation.produto) &&
    normalizeSearchValue(cargo.cidade_coleta) ===
      normalizeSearchValue(negotiation.cidadeColeta) &&
    normalizeSearchValue(cargo.uf_coleta) ===
      normalizeSearchValue(negotiation.ufColeta) &&
    normalizeSearchValue(cargo.cidade_entrega) ===
      normalizeSearchValue(negotiation.cidadeEntrega) &&
    normalizeSearchValue(cargo.uf_entrega) ===
      normalizeSearchValue(negotiation.ufEntrega)
  );
}

function getAcceptedNegotiationForCargo(
  cargo: CompanyCargo,
  negotiations: CargoNegotiationMatch[],
) {
  const matches = negotiations
    .filter(
      (negotiation) =>
        negotiation.status === 'Aceita' &&
        cargoMatchesNegotiation(cargo, negotiation),
    )
    .sort(
      (left, right) =>
        new Date(right.respondedAt ?? right.createdAt).getTime() -
        new Date(left.respondedAt ?? left.createdAt).getTime(),
    );

  return matches[0] ?? null;
}

function getAuthErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos. Verifique os dados e tente novamente.';
  }

  if (normalized.includes('email not confirmed')) {
    return 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada antes de entrar.';
  }

  if (normalized.includes('password should be at least')) {
    return 'A senha precisa ter pelo menos 6 caracteres.';
  }

  if (normalized.includes('user already registered')) {
    return 'Este e-mail já tem cadastro. Clique em entrar e use sua senha.';
  }

  return message;
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
    );
  }

  if (name === 'nova-carga') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M12 5v14" />
        <path d="M5 12h14" />
        <path d="M6.5 4.5h11a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z" />
      </svg>
    );
  }

  if (name === 'chat') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M5.5 6.5h13a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7l-4 3v-3h-2a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" />
        <path d="M8 10.5h8" />
        <path d="M8 14h5" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 12.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authForm, setAuthForm] = useState<AuthFormState>(initialAuthForm);
  const [authMessage, setAuthMessage] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfileState>(
    initialCompanyProfile,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [companyCargos, setCompanyCargos] = useState<CompanyCargo[]>([]);
  const [isLoadingCargos, setIsLoadingCargos] = useState(false);
  const [cargoListError, setCargoListError] = useState('');
  const [actionCargoId, setActionCargoId] = useState<number | null>(null);
  const [editingCargoId, setEditingCargoId] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminFilters, setAdminFilters] =
    useState<AdminFilters>(initialAdminFilters);
  const [adminCargos, setAdminCargos] = useState<CompanyCargo[]>([]);
  const [isLoadingAdminCargos, setIsLoadingAdminCargos] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [chatRooms, setChatRooms] = useState<ChatRoomSummary[]>([]);
  const [isLoadingChatRooms, setIsLoadingChatRooms] = useState(false);
  const [chatRoomsError, setChatRoomsError] = useState('');
  const [activeChatRoomId, setActiveChatRoomId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoadingChatMessages, setIsLoadingChatMessages] = useState(false);
  const [chatMessagesError, setChatMessagesError] = useState('');
  const [chatDraft, setChatDraft] = useState('');
  const [isSendingChatMessage, setIsSendingChatMessage] = useState(false);
  const [isUpdatingChatStatus, setIsUpdatingChatStatus] = useState(false);
  const [cityOptions, setCityOptions] = useState<CityOption[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [citiesError, setCitiesError] = useState('');
  const [activeCityField, setActiveCityField] = useState<CityField | null>(
    null,
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>('cargas');

  const loadCompanyProfile = async () => {
    if (!session) {
      setCompanyProfile(initialCompanyProfile);
      return;
    }

    const { data, error } = await supabase
      .from('empresas_web')
      .select('nome, cnpj, responsavel, telefone, email')
      .maybeSingle();

    if (error) {
      setSubmitError(error.message);
      return;
    }

    if (!data) {
      setCompanyProfile((current) => ({
        ...current,
        email: current.email || session.user.email || '',
      }));
      return;
    }

    const profile = data as CompanyProfileRow;

    setCompanyProfile({
      companyName: profile.nome,
      cnpj: profile.cnpj,
      contactName: profile.responsavel,
      phone: profile.telefone,
      email: profile.email || session.user.email || '',
    });
  };

  const loadCompanyCargos = async () => {
    if (!session) {
      setCompanyCargos([]);
      return;
    }

    setIsLoadingCargos(true);
    setCargoListError('');

    try {
      const { data, error } = await supabase.rpc('minhas_cargas_web');

      if (error) {
        throw error;
      }

      const cargos = ((data ?? []) as CompanyCargo[]).map((cargo) => ({
        ...cargo,
        hasAcceptedDriver: false,
        chosenDriverName: null,
        chosenTripId: null,
      }));

      let negotiations: CargoNegotiationMatch[] = [];

      try {
        const { data: roomData, error: roomError } = await supabase
          .from('chat_rooms')
          .select(
            'id, created_at, viagem_id, Viagens:viagem_id(produto, origem_cidade, origem_uf, destino_cidade, destino_uf)',
          )
          .order('created_at', { ascending: false });

        if (roomError) {
          throw roomError;
        }

        const rooms = (roomData ?? []) as ChatRoomRow[];
        const roomIds = rooms.map((room) => room.id);

        if (roomIds.length > 0) {
          const { data: requestData, error: requestError } = await supabase
            .from('solicitacoes_viagem')
            .select(
              'room_id, status, created_at, responded_at, mensagem_inicial',
            )
            .in('room_id', roomIds);

          if (requestError) {
            throw requestError;
          }

          const requestByRoomId = new Map(
            ((requestData ?? []) as ChatRequestRow[]).map((request) => [
              request.room_id,
              request,
            ]),
          );

          negotiations = rooms
            .map((room) => {
              const trip = getChatTrip(room.Viagens);
              const request = requestByRoomId.get(room.id);
              const produto = trip?.produto?.trim() || '';
              const cidadeColeta = trip?.origem_cidade?.trim() || '';
              const ufColeta = trip?.origem_uf?.trim() || '';
              const cidadeEntrega = trip?.destino_cidade?.trim() || '';
              const ufEntrega = trip?.destino_uf?.trim() || '';

              if (
                !request ||
                !produto ||
                !cidadeColeta ||
                !ufColeta ||
                !cidadeEntrega ||
                !ufEntrega
              ) {
                return null;
              }

              return {
                roomId: room.id,
                viagemId: room.viagem_id,
                produto,
                cidadeColeta,
                ufColeta,
                cidadeEntrega,
                ufEntrega,
                status: request.status,
                respondedAt: request.responded_at,
                createdAt: request.created_at,
                driverName: getDriverNameFromMessage(request.mensagem_inicial),
              } satisfies CargoNegotiationMatch;
            })
            .filter((negotiation): negotiation is CargoNegotiationMatch =>
              Boolean(negotiation),
            );
        }
      } catch {
        negotiations = [];
      }

      setCompanyCargos(
        cargos.map((cargo) => {
          const acceptedNegotiation = getAcceptedNegotiationForCargo(
            cargo,
            negotiations,
          );

          if (!acceptedNegotiation) {
            return cargo;
          }

          return {
            ...cargo,
            hasAcceptedDriver: true,
            chosenDriverName: acceptedNegotiation.driverName,
            chosenTripId: acceptedNegotiation.viagemId,
          };
        }),
      );
    } catch (error) {
      setCargoListError(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel carregar as cargas da empresa.',
      );
    } finally {
      setIsLoadingCargos(false);
    }
  };

  const loadAdminCargos = async (filters = adminFilters) => {
    if (!session || !isAdmin) {
      setAdminCargos([]);
      return;
    }

    setIsLoadingAdminCargos(true);
    setAdminError('');

    const { data, error } = await supabase.rpc('admin_listar_cargas_web', {
      p_status: filters.status || null,
      p_busca: filters.search.trim() || null,
    });

    setIsLoadingAdminCargos(false);

    if (error) {
      setAdminError(error.message);
      return;
    }

    setAdminCargos((data ?? []) as CompanyCargo[]);
  };

  const loadChatRooms = async (preferredRoomId?: string | null) => {
    if (!session) {
      setChatRooms([]);
      setActiveChatRoomId(null);
      return;
    }

    setIsLoadingChatRooms(true);
    setChatRoomsError('');

    try {
      const { data: roomData, error: roomError } = await supabase
        .from('chat_rooms')
        .select(
          'id, created_at, viagem_id, Viagens:viagem_id(empresa, origem_cidade, origem_uf, destino_cidade, destino_uf)',
        )
        .order('created_at', { ascending: false });

      if (roomError) {
        throw roomError;
      }

      const rooms = (roomData ?? []) as ChatRoomRow[];
      const roomIds = rooms.map((room) => room.id);
      let requests: ChatRequestRow[] = [];
      let messages: ChatMessage[] = [];

      if (roomIds.length > 0) {
        const [
          { data: requestData, error: requestError },
          { data: messageData, error: messageError },
        ] = await Promise.all([
          supabase
            .from('solicitacoes_viagem')
            .select(
              'room_id, status, created_at, responded_at, mensagem_inicial',
            )
            .in('room_id', roomIds),
          supabase
            .from('chat_messages')
            .select('id, room_id, sender_user_id, message, created_at')
            .in('room_id', roomIds)
            .order('created_at', { ascending: true }),
        ]);

        if (requestError) {
          throw requestError;
        }

        if (messageError) {
          throw messageError;
        }

        requests = (requestData ?? []) as ChatRequestRow[];
        messages = ((messageData ?? []) as ChatMessageRow[]).map(
          normalizeChatMessage,
        );
      }

      const requestByRoomId = new Map(
        requests.map((request) => [request.room_id, request]),
      );
      const lastMessageByRoomId = new Map<string, ChatMessage>();

      messages.forEach((message) => {
        lastMessageByRoomId.set(message.roomId, message);
      });

      const nextRooms = rooms
        .map((room) => {
          const trip = getChatTrip(room.Viagens);
          const request = requestByRoomId.get(room.id);
          const lastMessage = lastMessageByRoomId.get(room.id);

          return {
            id: room.id,
            viagemId: room.viagem_id,
            createdAt: room.created_at,
            companyName: trip?.empresa?.trim() || 'GLM Cargas',
            driverName: getDriverNameFromMessage(
              request?.mensagem_inicial ?? lastMessage?.message ?? null,
            ),
            routeLabel: formatRouteLabel(trip, room.viagem_id),
            status: request?.status ?? 'Aguardando',
            respondedAt: request?.responded_at ?? null,
            initialMessage: request?.mensagem_inicial ?? null,
            lastMessagePreview:
              lastMessage?.message ??
              request?.mensagem_inicial?.trim() ??
              'Conversa iniciada',
            lastMessageAt:
              lastMessage?.createdAt ?? request?.created_at ?? room.created_at,
          } satisfies ChatRoomSummary;
        })
        .sort(
          (left, right) =>
            new Date(right.lastMessageAt ?? right.createdAt).getTime() -
            new Date(left.lastMessageAt ?? left.createdAt).getTime(),
        );

      setChatRooms(nextRooms);
      setActiveChatRoomId((current) => {
        const candidate = preferredRoomId ?? current;

        if (candidate && nextRooms.some((room) => room.id === candidate)) {
          return candidate;
        }

        return nextRooms[0]?.id ?? null;
      });
    } catch (error) {
      setChatRooms([]);
      setActiveChatRoomId(null);
      setChatRoomsError(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel carregar as conversas.',
      );
    } finally {
      setIsLoadingChatRooms(false);
    }
  };

  const loadChatMessages = async (roomId: string | null) => {
    if (!roomId) {
      setChatMessages([]);
      return;
    }

    setIsLoadingChatMessages(true);
    setChatMessagesError('');

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id, room_id, sender_user_id, message, created_at')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      setChatMessages(
        ((data ?? []) as ChatMessageRow[]).map(normalizeChatMessage),
      );
    } catch (error) {
      setChatMessages([]);
      setChatMessagesError(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar as mensagens.',
      );
    } finally {
      setIsLoadingChatMessages(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      setIsLoadingSession(false);
      setIsAdmin(false);
      setCompanyProfile((current) => ({
        ...current,
        email: current.email || data.session?.user.email || '',
      }));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsAdmin(false);
      setCompanyProfile((current) => ({
        ...current,
        email: nextSession?.user.email || current.email,
      }));
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    void loadCompanyCargos();
    void loadCompanyProfile();
  }, [session]);

  useEffect(() => {
    if (!session) {
      setIsAdmin(false);
      setAdminCargos([]);
      return;
    }

    let isMounted = true;

    supabase.rpc('is_web_admin').then(({ data, error }) => {
      if (!isMounted) return;
      setIsAdmin(!error && Boolean(data));
    });

    return () => {
      isMounted = false;
    };
  }, [session]);

  useEffect(() => {
    if (!isAdmin) {
      setAdminCargos([]);
      return;
    }

    void loadAdminCargos();
  }, [isAdmin]);

  useEffect(() => {
    let isMounted = true;

    const loadCities = async () => {
      setIsLoadingCities(true);
      setCitiesError('');

      try {
        const response = await fetch(
          'https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome',
        );

        if (!response.ok) {
          throw new Error('Não foi possível carregar as cidades.');
        }

        const data = (await response.json()) as Array<{
          id: number;
          nome: string;
          microrregiao?: {
            mesorregiao?: {
              UF?: {
                sigla?: string;
              };
            };
          };
        }>;

        if (!isMounted) {
          return;
        }

        setCityOptions(
          data
            .map((city) => ({
              id: city.id,
              name: city.nome,
              state: city.microrregiao?.mesorregiao?.UF?.sigla?.trim() || '',
            }))
            .filter((city) => city.name && city.state),
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setCitiesError(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar a lista de cidades.',
        );
      } finally {
        if (isMounted) {
          setIsLoadingCities(false);
        }
      }
    };

    void loadCities();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (activeSection !== 'chat') {
      return;
    }

    void loadChatRooms();
  }, [activeSection, session]);

  useEffect(() => {
    if (activeSection !== 'chat') {
      return;
    }

    void loadChatMessages(activeChatRoomId);
  }, [activeSection, activeChatRoomId]);

  useEffect(() => {
    if (!session || activeSection !== 'chat') {
      return;
    }

    const roomChannel = supabase
      .channel(`web-chat-rooms:${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_rooms',
          filter: `empresa_user_id=eq.${session.user.id}`,
        },
        () => {
          void loadChatRooms(activeChatRoomId);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(roomChannel);
    };
  }, [session, activeSection, activeChatRoomId]);

  useEffect(() => {
    if (!session || activeSection !== 'chat' || chatRooms.length === 0) {
      return;
    }

    const messageChannel = supabase.channel(
      `web-chat-messages:${session.user.id}:${chatRooms.map((room) => room.id).join(',')}`,
    );

    chatRooms.forEach((room) => {
      messageChannel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          const record = payload.new as Partial<ChatMessageRow>;

          if (
            typeof record.id !== 'string' ||
            typeof record.room_id !== 'string' ||
            typeof record.sender_user_id !== 'string' ||
            typeof record.created_at !== 'string'
          ) {
            return;
          }

          const incomingMessage = normalizeChatMessage({
            id: record.id,
            room_id: record.room_id,
            sender_user_id: record.sender_user_id,
            message: typeof record.message === 'string' ? record.message : null,
            created_at: record.created_at,
          });

          if (incomingMessage.roomId === activeChatRoomId) {
            setChatMessages((current) => {
              if (
                current.some((message) => message.id === incomingMessage.id)
              ) {
                return current;
              }

              return [...current, incomingMessage];
            });
          }

          setChatRooms((current) =>
            [...current]
              .map((chatRoom) =>
                chatRoom.id === incomingMessage.roomId
                  ? {
                      ...chatRoom,
                      lastMessagePreview: incomingMessage.message,
                      lastMessageAt: incomingMessage.createdAt,
                    }
                  : chatRoom,
              )
              .sort(
                (left, right) =>
                  new Date(right.lastMessageAt ?? right.createdAt).getTime() -
                  new Date(left.lastMessageAt ?? left.createdAt).getTime(),
              ),
          );
        },
      );
    });

    messageChannel.subscribe();

    return () => {
      void supabase.removeChannel(messageChannel);
    };
  }, [session, activeSection, activeChatRoomId, chatRooms]);

  const handleFieldChange =
    (field: keyof FormState) =>
    (
      event: ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      const value =
        field === 'pickupState' || field === 'deliveryState'
          ? event.target.value.toUpperCase()
          : event.target.value;

      setForm((current) => ({
        ...current,
        [field]: value,
      }));
    };

  const handleCityFieldChange =
    (field: CityField) => (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      const stateField = getCityStateField(field);
      const exactMatches = cityOptions.filter(
        (city) =>
          normalizeSearchValue(city.name) === normalizeSearchValue(value),
      );

      setForm((current) => ({
        ...current,
        [field]: value,
        [stateField]: exactMatches.length === 1 ? exactMatches[0].state : '',
      }));
      setActiveCityField(field);
    };

  const handleCitySelect = (field: CityField, city: CityOption) => {
    const stateField = getCityStateField(field);

    setForm((current) => ({
      ...current,
      [field]: city.name,
      [stateField]: city.state,
    }));
    setActiveCityField(null);
  };

  const handleFreightValueChange = (event: ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatCurrencyInput(event.target.value);

    setForm((current) => ({
      ...current,
      freightValue: formattedValue,
    }));
  };

  const handleAuthFieldChange =
    (field: keyof AuthFormState) => (event: ChangeEvent<HTMLInputElement>) => {
      setAuthForm((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  const handleCompanyProfileChange =
    (field: keyof CompanyProfileState) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setCompanyProfile((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  const handleAdminFilterChange =
    (field: keyof AdminFilters) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setAdminFilters((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsAuthenticating(true);
    setAuthMessage('');
    setAuthError('');

    const credentials = {
      email: authForm.email.trim(),
      password: authForm.password,
    };

    const response =
      authMode === 'login'
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials);

    setIsAuthenticating(false);

    if (response.error) {
      setAuthError(getAuthErrorMessage(response.error.message));
      return;
    }

    setAuthForm(initialAuthForm);
    setAuthMessage(
      authMode === 'login'
        ? 'Login realizado com sucesso.'
        : response.data.session
          ? 'Conta criada com sucesso.'
          : 'Cadastro realizado. Confirme seu e-mail antes de entrar.',
    );
  };

  const handleLogout = async () => {
    setAuthMessage('');
    setAuthError('');
    setAdminFilters(initialAdminFilters);
    await supabase.auth.signOut();
  };

  const resetCargoEditor = () => {
    setEditingCargoId(null);
    setForm(initialForm);
  };

  const handleEditCargo = (cargo: CompanyCargo) => {
    setEditingCargoId(cargo.id);
    setSubmitMessage('');
    setSubmitError('');
    setForm(mapCargoToFormState(cargo));
    setActiveSection('nova-carga');
  };

  const handleCancelCargoEdit = () => {
    setSubmitMessage('');
    setSubmitError('');
    resetCargoEditor();
  };

  const handleCreateCargoSection = () => {
    setSubmitMessage('');
    setSubmitError('');
    resetCargoEditor();
    setActiveSection('nova-carga');
  };

  const submitCargo = async (mode: SubmitMode) => {
    setIsSubmitting(true);
    setSubmitMessage('');
    setSubmitError('');

    const isCompanyProfileComplete =
      companyProfile.companyName.trim() &&
      companyProfile.cnpj.trim() &&
      companyProfile.contactName.trim() &&
      companyProfile.phone.trim();

    if (!isCompanyProfileComplete) {
      setIsSubmitting(false);
      setSubmitError(
        'Preencha o perfil da empresa antes de adicionar uma carga.',
      );
      setActiveSection('perfil');
      return;
    }

    const payload = {
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
    };

    const { error } = editingCargoId
      ? await supabase.rpc('atualizar_carga_web', {
          p_carga_id: editingCargoId,
          ...payload,
        })
      : await supabase.rpc('publicar_carga_web', payload);

    setIsSubmitting(false);

    if (error) {
      const normalizedError = error.message.toLowerCase();

      if (
        editingCargoId &&
        normalizedError.includes('atualizar_carga_web')
      ) {
        setSubmitError(
          'A funcao de atualizacao ainda nao foi aplicada no Supabase. Rode o SQL novo antes de editar cargas existentes.',
        );
        return;
      }

      setSubmitError(error.message);
      return;
    }

    setSubmitMessage(
      editingCargoId
        ? mode === 'publicada'
          ? 'Carga atualizada com sucesso.'
          : 'Rascunho atualizado com sucesso.'
        : mode === 'publicada'
          ? 'Carga publicada com sucesso.'
          : 'Rascunho salvo com sucesso.',
    );
    resetCargoEditor();
    await loadCompanyCargos();
    if (isAdmin) {
      await loadAdminCargos();
    }
    setActiveSection('cargas');
  };

  const handleCargoStatusChange = async (
    cargoId: number,
    nextStatus: CargoStatus,
  ) => {
    const targetCargo = companyCargos.find((cargo) => cargo.id === cargoId);

    if (
      targetCargo?.hasAcceptedDriver &&
      nextStatus !== 'encerrada'
    ) {
      setCargoListError(
        'Esta carga ja teve um motorista aceito. Agora ela deve seguir para acompanhamento ou encerramento.',
      );
      return;
    }

    setActionCargoId(cargoId);
    setCargoListError('');

    const { error } = await supabase.rpc('atualizar_status_carga_web', {
      p_carga_id: cargoId,
      p_status: nextStatus,
    });

    setActionCargoId(null);

    if (error) {
      setCargoListError(error.message);
      return;
    }

    await loadCompanyCargos();
    if (isAdmin) {
      await loadAdminCargos();
    }
  };

  const handleSubmit =
    (mode: SubmitMode) =>
    async (
      event?: FormEvent<HTMLFormElement> | MouseEvent<HTMLButtonElement>,
    ) => {
      event?.preventDefault();
      await submitCargo(mode);
    };

  const handleAdminSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await loadAdminCargos();
  };

  const handleRefreshChats = async () => {
    await loadChatRooms(activeChatRoomId);
  };

  const handleSendChatMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      !session ||
      !activeChatRoomId ||
      !chatDraft.trim() ||
      isSendingChatMessage
    ) {
      return;
    }

    setIsSendingChatMessage(true);
    setChatMessagesError('');

    const message = chatDraft.trim();
    const optimisticId = `local-${Date.now()}`;
    const optimisticCreatedAt = new Date().toISOString();

    setChatDraft('');

    setChatMessages((current) => [
      ...current,
      {
        id: optimisticId,
        roomId: activeChatRoomId,
        senderUserId: session.user.id,
        message,
        createdAt: optimisticCreatedAt,
      },
    ]);

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: activeChatRoomId,
          sender_user_id: session.user.id,
          message,
        })
        .select('id, room_id, sender_user_id, message, created_at')
        .single();

      if (error) {
        throw error;
      }

      const persistedMessage = normalizeChatMessage(data as ChatMessageRow);
      setChatMessages((current) =>
        current.map((chatMessage) =>
          chatMessage.id === optimisticId ? persistedMessage : chatMessage,
        ),
      );
      setChatRooms((current) =>
        [...current]
          .map((room) =>
            room.id === activeChatRoomId
              ? {
                  ...room,
                  lastMessagePreview: message,
                  lastMessageAt: persistedMessage.createdAt,
                }
              : room,
          )
          .sort(
            (left, right) =>
              new Date(right.lastMessageAt ?? right.createdAt).getTime() -
              new Date(left.lastMessageAt ?? left.createdAt).getTime(),
          ),
      );
    } catch (error) {
      setChatMessages((current) =>
        current.filter((chatMessage) => chatMessage.id !== optimisticId),
      );
      setChatDraft(message);
      setChatMessagesError(
        error instanceof Error
          ? error.message
          : 'Não foi possível enviar a mensagem.',
      );
    } finally {
      setIsSendingChatMessage(false);
    }
  };

  const handleChatRequestStatusChange = async (
    nextStatus: Exclude<TripRequestStatus, 'Aguardando'>,
  ) => {
    if (!session || !activeChatRoomId || isUpdatingChatStatus) {
      return;
    }

    setIsUpdatingChatStatus(true);
    setChatMessagesError('');
    const optimisticId = `status-${Date.now()}`;

    try {
      const { data, error } = await supabase
        .from('solicitacoes_viagem')
        .update({ status: nextStatus })
        .eq('room_id', activeChatRoomId)
        .select('status, responded_at')
        .single();

      if (error) {
        throw error;
      }

      const status = data.status as TripRequestStatus;
      const respondedAt =
        typeof data.responded_at === 'string' ? data.responded_at : null;
      const statusMessage = getStatusMessage(nextStatus);
      const optimisticCreatedAt = new Date().toISOString();

      setChatRooms((current) =>
        current.map((room) =>
          room.id === activeChatRoomId
            ? {
                ...room,
                status,
                respondedAt,
              }
            : room,
        ),
      );

      setChatMessages((current) => [
        ...current,
        {
          id: optimisticId,
          roomId: activeChatRoomId,
          senderUserId: session.user.id,
          message: statusMessage,
          createdAt: optimisticCreatedAt,
        },
      ]);

      const { data: messageData, error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          room_id: activeChatRoomId,
          sender_user_id: session.user.id,
          message: statusMessage,
        })
        .select('id, room_id, sender_user_id, message, created_at')
        .single();

      if (messageError) {
        throw messageError;
      }

      const persistedMessage = normalizeChatMessage(
        messageData as ChatMessageRow,
      );

      setChatMessages((current) =>
        current.map((chatMessage) =>
          chatMessage.id === optimisticId ? persistedMessage : chatMessage,
        ),
      );
      setChatRooms((current) =>
        current.map((room) =>
          room.id === activeChatRoomId
            ? {
                ...room,
                lastMessagePreview: persistedMessage.message,
                lastMessageAt: persistedMessage.createdAt,
              }
            : room,
        ),
      );
      await loadCompanyCargos();
    } catch (error) {
      setChatMessages((current) =>
        current.filter((chatMessage) => chatMessage.id !== optimisticId),
      );
      setChatMessagesError(
        error instanceof Error
          ? error.message
          : 'Não foi possível atualizar a solicitação.',
      );
    } finally {
      setIsUpdatingChatStatus(false);
    }
  };

  const activeChatRoom =
    chatRooms.find((room) => room.id === activeChatRoomId) ?? null;

  const activeNegotiationCount = companyCargos.filter(isCargoActiveForNegotiation)
    .length;

  const pickupCitySuggestions =
    form.pickupCity.trim().length >= 2
      ? cityOptions
          .filter((city) =>
            normalizeSearchValue(city.name).includes(
              normalizeSearchValue(form.pickupCity),
            ),
          )
          .slice(0, 8)
      : [];

  const deliveryCitySuggestions =
    form.deliveryCity.trim().length >= 2
      ? cityOptions
          .filter((city) =>
            normalizeSearchValue(city.name).includes(
              normalizeSearchValue(form.deliveryCity),
            ),
          )
          .slice(0, 8)
      : [];

  const authFeedbackClass = authError
    ? 'form-feedback form-feedback--error'
    : 'form-feedback';
  const submitFeedbackClass = submitError
    ? 'form-feedback form-feedback--error'
    : 'form-feedback';

  if (isLoadingSession) {
    return (
      <div className="auth-page">
        <div className="auth-loading">
          <span className="panel-card__label">GLM Cargas</span>
          <strong>Verificando sessão da empresa...</strong>
        </div>
      </div>
    );
  }

  if (!session && window.location.hash !== '#home-preview') {
    return (
      <div className="auth-page">
        <main className="auth-page__shell auth-page__shell--center">
          <section
            className="auth-card auth-card--entry"
            aria-label="Acesso da empresa"
          >
            <div className="auth-brand">
              <span>GLM</span>
              <strong>Cargas</strong>
            </div>

            <div className="auth-card__heading">
              <span className="panel-card__label">Acesso da empresa</span>
              <h2>
                {authMode === 'login'
                  ? 'Entrar na conta'
                  : 'Criar conta da empresa'}
              </h2>
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
                <div className={authFeedbackClass}>
                  {authError || authMessage}
                </div>
              )}
              <button
                className="button button--primary auth-form__submit"
                type="submit"
                disabled={isAuthenticating}
              >
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
                    setAuthMode(authMode === 'login' ? 'register' : 'login');
                    setAuthMessage('');
                    setAuthError('');
                  }}
                >
                  {authMode === 'login'
                    ? 'Clique aqui e crie uma'
                    : 'Clique aqui para entrar'}
                </button>
              </p>
            </form>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div
      className={
        isSidebarCollapsed
          ? 'app-layout app-layout--sidebar-collapsed'
          : 'app-layout'
      }
    >
      <aside className="sidebar" aria-label="Navegação principal">
        <div className="sidebar__brand">
          <span>GLM</span>
          <strong>Cargas</strong>
        </div>

        <button
          className="sidebar__toggle"
          type="button"
          aria-label={
            isSidebarCollapsed
              ? 'Expandir menu lateral'
              : 'Recolher menu lateral'
          }
          onClick={() => setIsSidebarCollapsed((current) => !current)}
        >
          {isSidebarCollapsed ? '>' : '<'}
        </button>

        <nav className="sidebar__nav">
          <button
            className={
              activeSection === 'cargas'
                ? 'sidebar__link sidebar__link--active'
                : 'sidebar__link'
            }
            type="button"
            onClick={() => setActiveSection('cargas')}
          >
            <span>
              <SidebarIcon name="cargas" />
            </span>
            <strong>Minhas cargas</strong>
          </button>
          <button
            className={
              activeSection === 'nova-carga'
                ? 'sidebar__link sidebar__link--active'
                : 'sidebar__link'
            }
            type="button"
            onClick={handleCreateCargoSection}
          >
            <span>
              <SidebarIcon name="nova-carga" />
            </span>
            <strong>Adicionar carga</strong>
          </button>
          <button
            className={
              activeSection === 'chat'
                ? 'sidebar__link sidebar__link--active'
                : 'sidebar__link'
            }
            type="button"
            onClick={() => setActiveSection('chat')}
          >
            <span>
              <SidebarIcon name="chat" />
            </span>
            <strong>Chat</strong>
          </button>
          <button
            className={
              activeSection === 'perfil'
                ? 'sidebar__link sidebar__link--active'
                : 'sidebar__link'
            }
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
            <span className="panel-card__label">
              {session ? 'Sessão ativa' : 'Visualização'}
            </span>
            <strong>
              {session?.user.email ?? 'Preview da homepage sem login'}
            </strong>
          </div>
          {session ? (
            <button
              className="button button--ghost"
              type="button"
              onClick={handleLogout}
            >
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
                    <h2>
                      Cadastre uma carga com os principais dados que impactam a
                      contratação.
                    </h2>
                  </div>
                  <span className="section-hero__icon">
                    <SidebarIcon name="nova-carga" />
                  </span>
                </div>

                <form
                  className="cargo-form cargo-form--compact"
                  onSubmit={handleSubmit('publicada')}
                >
                  <div className="form-profile-summary">
                    <div>
                      <span>Empresa vinculada</span>
                      <strong>
                        {companyProfile.companyName ||
                          'Perfil da empresa não preenchido'}
                      </strong>
                      <p>
                        CNPJ: {companyProfile.cnpj || 'Não informado'} |
                        Responsável:{' '}
                        {companyProfile.contactName || 'Não informado'}
                      </p>
                    </div>
                    <button
                      className="button button--ghost"
                      type="button"
                      onClick={() => setActiveSection('perfil')}
                    >
                      Editar perfil
                    </button>
                    {editingCargoId && (
                      <button
                        className="button button--ghost"
                        type="button"
                        onClick={handleCancelCargoEdit}
                      >
                        Cancelar edicao
                      </button>
                    )}
                  </div>

                  <div className="form-block">
                    <h3>Rota</h3>
                    <div className="field-grid field-grid--three">
                      <label>
                        Cidade de coleta
                        <div className="city-autocomplete">
                          <input
                            required
                            type="text"
                            autoComplete="off"
                            placeholder="Ex.: Campinas"
                            value={form.pickupCity}
                            onChange={handleCityFieldChange('pickupCity')}
                            onFocus={() => setActiveCityField('pickupCity')}
                            onBlur={() => {
                              window.setTimeout(
                                () => setActiveCityField(null),
                                120,
                              );
                            }}
                          />
                          {activeCityField === 'pickupCity' &&
                            pickupCitySuggestions.length > 0 && (
                              <div className="city-autocomplete__menu">
                                {pickupCitySuggestions.map((city) => (
                                  <button
                                    key={`pickup-${city.id}`}
                                    className="city-autocomplete__option"
                                    type="button"
                                    onMouseDown={(event) => {
                                      event.preventDefault();
                                      handleCitySelect('pickupCity', city);
                                    }}
                                  >
                                    <strong>{city.name}</strong>
                                    <span>{city.state}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                        </div>
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
                        <div className="city-autocomplete">
                          <input
                            required
                            type="text"
                            autoComplete="off"
                            placeholder="Ex.: Curitiba"
                            value={form.deliveryCity}
                            onChange={handleCityFieldChange('deliveryCity')}
                            onFocus={() => setActiveCityField('deliveryCity')}
                            onBlur={() => {
                              window.setTimeout(
                                () => setActiveCityField(null),
                                120,
                              );
                            }}
                          />
                          {activeCityField === 'deliveryCity' &&
                            deliveryCitySuggestions.length > 0 && (
                              <div className="city-autocomplete__menu">
                                {deliveryCitySuggestions.map((city) => (
                                  <button
                                    key={`delivery-${city.id}`}
                                    className="city-autocomplete__option"
                                    type="button"
                                    onMouseDown={(event) => {
                                      event.preventDefault();
                                      handleCitySelect('deliveryCity', city);
                                    }}
                                  >
                                    <strong>{city.name}</strong>
                                    <span>{city.state}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                        </div>
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
                    {(isLoadingCities || citiesError) && (
                      <p className="field-grid__helper">
                        {isLoadingCities
                          ? 'Carregando lista oficial de cidades...'
                          : `${citiesError} Você ainda pode preencher manualmente se preferir.`}
                      </p>
                    )}
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
                          inputMode="numeric"
                          placeholder="0,00"
                          value={form.freightValue}
                          onChange={handleFreightValueChange}
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
                          {vehicleTypeOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Tipo de carroceria
                        <select
                          required
                          value={form.bodyType}
                          onChange={handleFieldChange('bodyType')}
                        >
                          <option value="" disabled>
                            Selecione
                          </option>
                          {bodyTypeOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
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
                          <option value="Lotacao">Lotação</option>
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
                    <div className={submitFeedbackClass}>
                      {submitError || submitMessage}
                    </div>
                  )}

                  <div className="form-actions">
                    <button
                      className="button button--primary"
                      type="submit"
                      disabled={isSubmitting}
                    >
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
                  <h2>
                    Acompanhe o que já foi publicado e ajuste o status das
                    cargas.
                  </h2>
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
                      <strong>
                        {activeNegotiationCount}
                      </strong>
                      <span>publicadas e ativas para negociação</span>
                    </div>
                    <div className="metric-card metric-card--draft">
                      <span className="metric-card__icon">
                        <SidebarIcon name="chat" />
                      </span>
                      <strong>
                        {
                          companyCargos.filter(
                            (cargo) => cargo.status === 'rascunho',
                          ).length
                        }
                      </strong>
                      <span>rascunhos aguardando revisão</span>
                    </div>
                  </div>

                  {cargoListError && (
                    <div className="form-feedback form-feedback--error">
                      {cargoListError}
                    </div>
                  )}

                  {isLoadingCargos ? (
                    <div className="locked-form">
                      <strong>Carregando dashboard</strong>
                      <p>
                        Buscando as cargas publicadas pela empresa autenticada.
                      </p>
                    </div>
                  ) : companyCargos.length === 0 ? (
                    <div className="empty-state">
                      <span className="empty-state__icon">
                        <SidebarIcon name="nova-carga" />
                      </span>
                      <strong>Nenhuma carga cadastrada</strong>
                      <p>
                        Comece criando sua primeira carga. Ela aparecerá aqui
                        com status, rota, compatibilidade e ações rápidas.
                      </p>
                      <button
                        className="button button--primary"
                        type="button"
                        onClick={handleCreateCargoSection}
                      >
                        Adicionar primeira carga
                      </button>
                    </div>
                  ) : (
                    <div className="cargo-list">
                      {companyCargos.map((cargo) => (
                        <article className="cargo-card" key={cargo.id}>
                          <div className="cargo-card__top">
                            <div>
                              <span
                                className={getCargoStatusClassName(
                                  cargo.status,
                                  cargo.hasAcceptedDriver,
                                )}
                              >
                                {statusLabel(
                                  cargo.status,
                                  cargo.hasAcceptedDriver,
                                )}
                              </span>
                              <h3>{cargo.produto}</h3>
                            </div>
                            <div className="cargo-card__price">
                              {formatCurrency(
                                cargo.valor_frete,
                                cargo.valor_frete_texto,
                              )}
                            </div>
                          </div>

                          <div className="cargo-card__grid">
                            <div>
                              <span>Rota</span>
                              <strong>
                                {cargo.cidade_coleta}/{cargo.uf_coleta} {'->'}{' '}
                                {cargo.cidade_entrega}/{cargo.uf_entrega}
                              </strong>
                            </div>
                            <div>
                              <span>Compatibilidade</span>
                              <strong>
                                {cargo.tipo_veiculo} | {cargo.tipo_carroceria}
                              </strong>
                            </div>
                            <div>
                              <span>
                                {cargo.hasAcceptedDriver
                                  ? 'Motorista escolhido'
                                  : 'Categoria'}
                              </span>
                              <strong>
                                {cargo.hasAcceptedDriver
                                  ? cargo.chosenDriverName || 'Motorista'
                                  : cargo.categoria_carga}
                              </strong>
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

                          {(cargo.janela_carregamento ||
                            cargo.exigencias_motorista ||
                            cargo.observacoes) && (
                            <div className="cargo-card__notes">
                              {cargo.janela_carregamento && (
                                <p>
                                  <strong>Janela:</strong>{' '}
                                  {cargo.janela_carregamento}
                                </p>
                              )}
                              {cargo.exigencias_motorista && (
                                <p>
                                  <strong>Exigências:</strong>{' '}
                                  {cargo.exigencias_motorista}
                                </p>
                              )}
                              {cargo.observacoes && (
                                <p>
                                  <strong>Observações:</strong>{' '}
                                  {cargo.observacoes}
                                </p>
                              )}
                            </div>
                          )}

                          <div className="cargo-card__footer">
                            <span>
                              Atualizada em{' '}
                              {new Intl.DateTimeFormat('pt-BR', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              }).format(new Date(cargo.updated_at))}
                            </span>
                            <div className="cargo-card__actions">
                              {canEditCargo(cargo) && (
                                <button
                                  className="button button--ghost"
                                  type="button"
                                  disabled={actionCargoId === cargo.id}
                                  onClick={() => handleEditCargo(cargo)}
                                >
                                  Editar
                                </button>
                              )}
                              {!cargo.hasAcceptedDriver &&
                                cargo.status !== 'publicada' && (
                                <button
                                  className="button button--ghost"
                                  type="button"
                                  disabled={actionCargoId === cargo.id}
                                  onClick={() =>
                                    handleCargoStatusChange(
                                      cargo.id,
                                      'publicada',
                                    )
                                  }
                                >
                                  {actionCargoId === cargo.id
                                    ? 'Atualizando...'
                                    : 'Publicar'}
                                </button>
                              )}
                              {!cargo.hasAcceptedDriver &&
                                cargo.status !== 'rascunho' && (
                                <button
                                  className="button button--ghost"
                                  type="button"
                                  disabled={actionCargoId === cargo.id}
                                  onClick={() =>
                                    handleCargoStatusChange(
                                      cargo.id,
                                      'rascunho',
                                    )
                                  }
                                >
                                  {actionCargoId === cargo.id
                                    ? 'Atualizando...'
                                    : 'Mover para rascunho'}
                                </button>
                              )}
                              {cargo.status !== 'encerrada' && (
                                <button
                                  className="button button--ghost"
                                  type="button"
                                  disabled={actionCargoId === cargo.id}
                                  onClick={() =>
                                    handleCargoStatusChange(
                                      cargo.id,
                                      'encerrada',
                                    )
                                  }
                                >
                                  {actionCargoId === cargo.id
                                    ? 'Atualizando...'
                                    : 'Encerrar'}
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
                    <strong>
                      {chatRooms.length} conversa
                      {chatRooms.length === 1 ? '' : 's'}
                    </strong>
                  </div>

                  <button
                    className="button button--ghost chat-list__refresh"
                    type="button"
                    onClick={handleRefreshChats}
                  >
                    Atualizar conversas
                  </button>

                  {chatRoomsError && (
                    <div className="form-feedback form-feedback--error">
                      {chatRoomsError}
                    </div>
                  )}

                  {isLoadingChatRooms ? (
                    <div className="chat-empty">
                      <strong>Carregando conversas</strong>
                      <p>
                        Buscando interesses e mensagens vinculados às suas
                        viagens.
                      </p>
                    </div>
                  ) : chatRooms.length === 0 ? (
                    <div className="chat-empty">
                      <strong>Nenhuma conversa por enquanto</strong>
                      <p>
                        Quando um motorista demonstrar interesse em uma carga, a
                        mensagem aparecerá aqui.
                      </p>
                    </div>
                  ) : (
                    chatRooms.map((room) => (
                      <button
                        key={room.id}
                        className={
                          room.id === activeChatRoomId
                            ? 'chat-thread chat-thread--active'
                            : 'chat-thread'
                        }
                        type="button"
                        onClick={() => setActiveChatRoomId(room.id)}
                      >
                        <span className="chat-thread__avatar">M</span>
                        <span className="chat-thread__content">
                          <strong>{room.driverName}</strong>
                          <small>{room.routeLabel}</small>
                          <small>
                            Última atividade{' '}
                            {formatDateTime(room.lastMessageAt)}
                          </small>
                          <span className={chatStatusClassName(room.status)}>
                            {chatStatusLabel(room.status)}
                          </span>
                          <p className="chat-thread__preview">
                            {room.lastMessagePreview}
                          </p>
                        </span>
                      </button>
                    ))
                  )}
                </aside>

                <section
                  className="chat-window"
                  aria-label="Janela da conversa"
                >
                  {activeChatRoom ? (
                    <>
                      <div className="chat-window__top">
                        <div>
                          <span>Canal de negociação</span>
                          <strong>{activeChatRoom.driverName}</strong>
                          <small>{activeChatRoom.routeLabel}</small>
                          <small>
                            Última atividade{' '}
                            {formatDateTime(activeChatRoom.lastMessageAt)}
                          </small>
                        </div>
                        <div className="chat-window__status">
                          <span
                            className={chatStatusClassName(
                              activeChatRoom.status,
                            )}
                          >
                            {chatStatusLabel(activeChatRoom.status)}
                          </span>
                          {activeChatRoom.status === 'Aguardando' ? (
                            <div className="chat-window__actions">
                              <button
                                className="button button--primary"
                                type="button"
                                disabled={isUpdatingChatStatus}
                                onClick={() =>
                                  handleChatRequestStatusChange('Aceita')
                                }
                              >
                                {isUpdatingChatStatus
                                  ? 'Salvando...'
                                  : 'Aceitar'}
                              </button>
                              <button
                                className="button button--ghost"
                                type="button"
                                disabled={isUpdatingChatStatus}
                                onClick={() =>
                                  handleChatRequestStatusChange('Recusada')
                                }
                              >
                                Recusar
                              </button>
                            </div>
                          ) : (
                            activeChatRoom.respondedAt && (
                              <small className="chat-window__status-time">
                                Atualizado em{' '}
                                {formatDateTime(activeChatRoom.respondedAt)}
                              </small>
                            )
                          )}
                        </div>
                      </div>

                      <div className="chat-window__body">
                        {chatMessagesError && (
                          <div className="form-feedback form-feedback--error">
                            {chatMessagesError}
                          </div>
                        )}

                        {isLoadingChatMessages ? (
                          <div className="chat-window__empty">
                            <strong>Carregando mensagens</strong>
                            <p>
                              Montando o histórico da conversa desta viagem.
                            </p>
                          </div>
                        ) : chatMessages.length === 0 ? (
                          <div className="chat-window__empty">
                            <strong>Sem mensagens nesta conversa</strong>
                            <p>
                              A primeira interação do motorista aparecerá aqui
                              assim que a solicitação for enviada.
                            </p>
                          </div>
                        ) : (
                          <div className="chat-messages">
                            {chatMessages.map((message) => {
                              const isCompanyMessage =
                                message.senderUserId === session?.user.id;

                              return (
                                <article
                                  key={message.id}
                                  className={
                                    isCompanyMessage
                                      ? 'chat-message chat-message--own'
                                      : 'chat-message'
                                  }
                                >
                                  <span>
                                    {isCompanyMessage ? 'Você' : 'Motorista'}
                                  </span>
                                  <p>{message.message}</p>
                                  <time
                                    className="chat-message__time"
                                    dateTime={message.createdAt}
                                  >
                                    {formatChatTime(message.createdAt)}
                                  </time>
                                </article>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <form
                        className="chat-compose"
                        onSubmit={handleSendChatMessage}
                      >
                        <input
                          type="text"
                          placeholder="Digite uma mensagem para o motorista..."
                          value={chatDraft}
                          onChange={(event) => setChatDraft(event.target.value)}
                        />
                        <button
                          className="button button--primary"
                          type="submit"
                          disabled={!chatDraft.trim() || isSendingChatMessage}
                        >
                          {isSendingChatMessage ? 'Enviando...' : 'Enviar'}
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="chat-window__empty">
                      <strong>Selecione uma conversa</strong>
                      <p>
                        Escolha um motorista na lateral para visualizar a
                        mensagem automática e responder.
                      </p>
                    </div>
                  )}
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
                  {(companyProfile.companyName || 'GLM')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="profile-overview__content">
                  <span>Identidade da empresa</span>
                  <strong>
                    {companyProfile.companyName ||
                      'Empresa ainda não identificada'}
                  </strong>
                  <p>
                    {companyProfile.cnpj
                      ? `CNPJ ${companyProfile.cnpj}`
                      : 'Preencha os dados abaixo para vincular as próximas cargas.'}
                  </p>
                </div>
                <div className="profile-overview__meta">
                  <span>Status</span>
                  <strong>
                    {companyProfile.companyName && companyProfile.cnpj
                      ? 'Perfil em andamento'
                      : 'Incompleto'}
                  </strong>
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
                  <button
                    className="button button--primary"
                    type="button"
                    onClick={() => setActiveSection('nova-carga')}
                  >
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
                <h2>
                  Busque cargas de todas as empresas com filtro operacional.
                </h2>
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
                  <select
                    value={adminFilters.status}
                    onChange={handleAdminFilterChange('status')}
                  >
                    <option value="">Todos</option>
                    <option value="publicada">Publicada</option>
                    <option value="rascunho">Rascunho</option>
                    <option value="encerrada">Encerrada</option>
                  </select>
                </label>
                <button
                  className="button button--primary admin-toolbar__button"
                  type="submit"
                >
                  Buscar
                </button>
              </form>

              {adminError && (
                <div className="form-feedback form-feedback--error">
                  {adminError}
                </div>
              )}

              {isLoadingAdminCargos ? (
                <div className="locked-form">
                  <strong>Carregando painel administrativo</strong>
                  <p>Buscando cargas globais do portal web.</p>
                </div>
              ) : adminCargos.length === 0 ? (
                <div className="locked-form">
                  <strong>Nenhum resultado encontrado</strong>
                  <p>
                    Ajuste a busca ou o filtro para localizar cargas no painel
                    administrativo.
                  </p>
                </div>
              ) : (
                <div className="cargo-list">
                  {adminCargos.map((cargo) => (
                    <article className="cargo-card" key={`admin-${cargo.id}`}>
                      <div className="cargo-card__top">
                        <div>
                          <span
                            className={`status-badge status-badge--${cargo.status}`}
                          >
                            {statusLabel(cargo.status)}
                          </span>
                          <h3>{cargo.produto}</h3>
                        </div>
                        <div className="cargo-card__price">
                          {formatCurrency(
                            cargo.valor_frete,
                            cargo.valor_frete_texto,
                          )}
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
                            {cargo.cidade_coleta}/{cargo.uf_coleta} {'->'}{' '}
                            {cargo.cidade_entrega}/{cargo.uf_entrega}
                          </strong>
                        </div>
                        <div>
                          <span>Compatibilidade</span>
                          <strong>
                            {cargo.tipo_veiculo} | {cargo.tipo_carroceria}
                          </strong>
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

                      {(cargo.janela_carregamento ||
                        cargo.exigencias_motorista ||
                        cargo.observacoes) && (
                        <div className="cargo-card__notes">
                          {cargo.janela_carregamento && (
                            <p>
                              <strong>Janela:</strong>{' '}
                              {cargo.janela_carregamento}
                            </p>
                          )}
                          {cargo.exigencias_motorista && (
                            <p>
                              <strong>Exigências:</strong>{' '}
                              {cargo.exigencias_motorista}
                            </p>
                          )}
                          {cargo.observacoes && (
                            <p>
                              <strong>Observações:</strong> {cargo.observacoes}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="cargo-card__footer">
                        <span>
                          Atualizada em{' '}
                          {new Intl.DateTimeFormat('pt-BR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          }).format(new Date(cargo.updated_at))}
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
  );
}

export default App;

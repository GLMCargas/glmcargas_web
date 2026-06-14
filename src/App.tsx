import {
  ChangeEvent,
  FormEvent,
  MouseEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';

declare global {
  interface Window {
    mapboxgl?: any;
    __glmMapboxPromise?: Promise<any>;
  }
}

const mapboxAccessToken =
  import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ??
  import.meta.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

const mapboxGlVersion = '2.15.0';

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
  pickupAddress: '',
  pickupLatitude: '',
  pickupLongitude: '',
  pickupPlaceId: '',
  deliveryCity: '',
  deliveryState: '',
  deliveryDate: '',
  deliveryAddress: '',
  deliveryLatitude: '',
  deliveryLongitude: '',
  deliveryPlaceId: '',
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

type PersonType = 'fisica' | 'juridica';

const initialAccountProfile = {
  personType: 'juridica' as PersonType,
  name: '',
  cpf: '',
  cnpj: '',
  phone: '',
  email: '',
  postalCode: '',
  street: '',
  addressNumber: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  linkedName: '',
  linkedCpf: '',
  linkedCnpj: '',
};

const initialAuthForm = {
  personType: 'juridica' as PersonType,
  name: '',
  cpf: '',
  cnpj: '',
  phone: '',
  email: '',
  password: '',
};

const initialAdminFilters = {
  search: '',
  status: '',
};

type FormState = typeof initialForm;
type AccountProfileState = typeof initialAccountProfile;
type AuthFormState = typeof initialAuthForm;
type SubmitMode = 'publicada' | 'rascunho';
type AuthMode = 'login' | 'register';
type CargoStatus = 'publicada' | 'rascunho' | 'encerrada';
type ActiveSection = 'cargas' | 'nova-carga' | 'chat' | 'perfil';
type AdminFilters = typeof initialAdminFilters;
type TripRequestStatus = 'Aguardando' | 'Aceita' | 'Recusada';
type TripExecutionStatus =
  | 'Aguardando retirada'
  | 'Retirada informada'
  | 'Em entrega'
  | 'Entrega informada'
  | 'Concluida'
  | 'Cancelada';

type CompanyCargo = {
  id: number;
  status: CargoStatus;
  empresa_nome: string;
  cidade_coleta: string;
  uf_coleta: string;
  data_coleta: string | null;
  coleta_endereco: string | null;
  coleta_latitude: number | null;
  coleta_longitude: number | null;
  coleta_place_id: string | null;
  cidade_entrega: string;
  uf_entrega: string;
  prazo_entrega: string | null;
  entrega_endereco: string | null;
  entrega_latitude: number | null;
  entrega_longitude: number | null;
  entrega_place_id: string | null;
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
  chosenRequestId?: string | null;
  chosenExecutionStatus?: TripExecutionStatus | null;
};

type AccountProfileRow = {
  tipo_pessoa: PersonType | null;
  nome: string;
  cpf: string | null;
  cnpj: string | null;
  telefone: string;
  email: string | null;
  cep: string | null;
  logradouro: string | null;
  numero_endereco: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  vinculado_nome: string | null;
  vinculado_cpf: string | null;
  vinculado_cnpj: string | null;
};

type ChatTripRow = {
  empresa: string | null;
  produto?: string | null;
  origem_cidade: string | null;
  origem_uf: string | null;
  destino_cidade: string | null;
  destino_uf: string | null;
  coleta_endereco?: string | null;
  coleta_latitude?: number | null;
  coleta_longitude?: number | null;
  coleta_place_id?: string | null;
  entrega_endereco?: string | null;
  entrega_latitude?: number | null;
  entrega_longitude?: number | null;
  entrega_place_id?: string | null;
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
  id: string;
  room_id: string;
  status: TripRequestStatus;
  status_execucao: TripExecutionStatus | null;
  coleta_informada_em: string | null;
  coleta_confirmada_em: string | null;
  entrega_informada_em: string | null;
  entrega_confirmada_em: string | null;
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
  requestId: string | null;
  viagemId: number;
  createdAt: string;
  companyName: string;
  driverName: string;
  routeLabel: string;
  status: TripRequestStatus;
  statusExecucao: TripExecutionStatus | null;
  coletaInformadaEm: string | null;
  coletaConfirmadaEm: string | null;
  entregaInformadaEm: string | null;
  entregaConfirmadaEm: string | null;
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
  requestId: string;
  statusExecucao: TripExecutionStatus | null;
  respondedAt: string | null;
  createdAt: string;
  driverName: string;
};

type CityOption = {
  id: number;
  name: string;
  state: string;
};

type PostalCodeLookupResponse = {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

type CityField = 'pickupCity' | 'deliveryCity' | 'profileCity';
type MapPickerTarget = 'pickup' | 'delivery';

type MapSelection = {
  address: string;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
  city: string;
  state: string;
};

type MapboxFeature = {
  id?: string;
  place_name?: string;
  text?: string;
  center?: [number, number];
  place_type?: string[];
  context?: Array<{
    id?: string;
    text?: string;
    short_code?: string;
  }>;
  properties?: Record<string, unknown>;
};

function parseCurrencyToNumber(value: string) {
  const normalized = value
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseCoordinateToNumber(value: string) {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCoordinateInput(value: number | string | null) {
  if (value === null || value === undefined || value === '') return '';
  return String(value).replace('.', ',');
}

function buildNavigationAddress(address: string, city: string, state: string) {
  const trimmedAddress = address.trim();
  if (trimmedAddress) return trimmedAddress;

  return [city.trim(), state.trim().toUpperCase(), 'Brasil']
    .filter(Boolean)
    .join(', ');
}

function loadMapboxGl() {
  if (window.mapboxgl) {
    return Promise.resolve(window.mapboxgl);
  }

  if (!mapboxAccessToken) {
    return Promise.reject(
      new Error('Configure VITE_MAPBOX_ACCESS_TOKEN para usar o seletor no mapa.'),
    );
  }

  if (window.__glmMapboxPromise) {
    return window.__glmMapboxPromise;
  }

  window.__glmMapboxPromise = new Promise((resolve, reject) => {
    const existingCss = document.querySelector(
      `link[href*="mapbox-gl-js/v${mapboxGlVersion}/mapbox-gl.css"]`,
    );

    if (!existingCss) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://api.mapbox.com/mapbox-gl-js/v${mapboxGlVersion}/mapbox-gl.css`;
      document.head.appendChild(link);
    }

    const script = document.createElement('script');
    script.src = `https://api.mapbox.com/mapbox-gl-js/v${mapboxGlVersion}/mapbox-gl.js`;
    script.async = true;
    script.onload = () => resolve(window.mapboxgl);
    script.onerror = () =>
      reject(new Error('Não foi possível carregar o Mapbox.'));

    document.head.appendChild(script);
  });

  return window.__glmMapboxPromise;
}

function getMapboxContextText(feature: MapboxFeature, prefix: string) {
  return feature.context?.find((item) => item.id?.startsWith(prefix))?.text ?? '';
}

function getMapboxState(feature: MapboxFeature) {
  const region = feature.context?.find((item) => item.id?.startsWith('region'));
  const shortCode = region?.short_code?.split('-').pop();
  return (shortCode || region?.text || '').toUpperCase();
}

function selectionFromMapboxFeature(feature: MapboxFeature): MapSelection | null {
  if (!feature.center || feature.center.length < 2) {
    return null;
  }

  const [longitude, latitude] = feature.center;
  const city =
    feature.place_type?.includes('place') || feature.place_type?.includes('locality')
      ? feature.text || ''
      : getMapboxContextText(feature, 'place') ||
        getMapboxContextText(feature, 'locality') ||
        getMapboxContextText(feature, 'district');

  return {
    address: feature.place_name || feature.text || '',
    latitude,
    longitude,
    placeId: feature.id ?? null,
    city,
    state: getMapboxState(feature),
  };
}

async function fetchMapboxFeatures(query: string) {
  if (!mapboxAccessToken) {
    throw new Error('Configure VITE_MAPBOX_ACCESS_TOKEN para usar o seletor no mapa.');
  }

  const params = new URLSearchParams({
    access_token: mapboxAccessToken,
    autocomplete: 'true',
    country: 'br',
    language: 'pt-BR',
    limit: '5',
    types: 'address,poi,place,locality,neighborhood',
  });
  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error('Não foi possível buscar esse endereço no Mapbox.');
  }

  const data = (await response.json()) as { features?: MapboxFeature[] };
  return data.features ?? [];
}

async function reverseMapboxGeocode(longitude: number, latitude: number) {
  if (!mapboxAccessToken) {
    throw new Error('Configure VITE_MAPBOX_ACCESS_TOKEN para usar o seletor no mapa.');
  }

  const params = new URLSearchParams({
    access_token: mapboxAccessToken,
    language: 'pt-BR',
    limit: '1',
    types: 'address,poi,place,locality,neighborhood',
  });
  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error('Não foi possível identificar esse ponto no Mapbox.');
  }

  const data = (await response.json()) as { features?: MapboxFeature[] };
  return data.features?.[0] ?? null;
}

function mapsUrlForNavigationPoint(point: {
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
}) {
  const hasCoordinates = point.latitude !== null && point.longitude !== null;
  const destination = hasCoordinates
    ? `${point.latitude},${point.longitude}`
    : point.address?.trim();

  if (!destination) return null;

  const params = new URLSearchParams({
    api: '1',
    destination,
    travelmode: 'driving',
  });

  if (point.placeId?.trim() && point.address?.trim()) {
    params.set('destination', point.address.trim());
    params.set('destination_place_id', point.placeId.trim());
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function executionStatusLabel(status: TripExecutionStatus | null) {
  if (!status) return 'Aguardando aceite';
  if (status === 'Concluida') return 'Concluída';
  return status;
}

function executionStatusDescription(room: ChatRoomSummary) {
  if (room.status !== 'Aceita') {
    return 'A navegação do motorista começa depois que a solicitação é aceita.';
  }

  switch (room.statusExecucao) {
    case 'Aguardando retirada':
    case null:
      return 'Motorista liberado para seguir até o local de coleta.';
    case 'Retirada informada':
      return 'O motorista informou a coleta. Confirme para liberar a rota de entrega.';
    case 'Em entrega':
      return 'Coleta confirmada. O motorista está liberado para seguir até a entrega.';
    case 'Entrega informada':
      return 'O motorista informou a entrega. Confirme para concluir a viagem.';
    case 'Concluida':
      return 'Entrega confirmada e viagem concluída.';
    case 'Cancelada':
      return 'Esta execução foi cancelada.';
  }
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

function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

function formatCpf(value: string) {
  const digits = digitsOnly(value).slice(0, 11);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatCnpj(value: string) {
  const digits = digitsOnly(value).slice(0, 14);

  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  }
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }

  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function formatPhone(value: string) {
  const digits = digitsOnly(value).slice(0, 11);

  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatPostalCode(value: string) {
  const digits = digitsOnly(value).slice(0, 8);

  if (digits.length <= 5) {
    return digits;
  }

  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function formatDocumentByPersonType(personType: PersonType, value: string) {
  return personType === 'fisica' ? formatCpf(value) : formatCnpj(value);
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
  if (cityField === 'pickupCity') return 'pickupState';
  if (cityField === 'deliveryCity') return 'deliveryState';
  return 'state';
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

  return 'Sua viagem foi recusada. No momento já encontramos outro motorista para esta carga.';
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
    pickupAddress: cargo.coleta_endereco ?? '',
    pickupLatitude: formatCoordinateInput(cargo.coleta_latitude),
    pickupLongitude: formatCoordinateInput(cargo.coleta_longitude),
    pickupPlaceId: cargo.coleta_place_id ?? '',
    deliveryCity: cargo.cidade_entrega,
    deliveryState: cargo.uf_entrega,
    deliveryDate: cargo.prazo_entrega ?? '',
    deliveryAddress: cargo.entrega_endereco ?? '',
    deliveryLatitude: formatCoordinateInput(cargo.entrega_latitude),
    deliveryLongitude: formatCoordinateInput(cargo.entrega_longitude),
    deliveryPlaceId: cargo.entrega_place_id ?? '',
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

function normalizePersonType(value: unknown): PersonType {
  return value === 'fisica' ? 'fisica' : 'juridica';
}

function getPersonTypeLabel(personType: PersonType) {
  return personType === 'fisica' ? 'Pessoa física' : 'Pessoa jurídica';
}

function getAccountNameLabel(personType: PersonType) {
  return personType === 'fisica' ? 'Nome completo' : 'Razão social';
}

function getAccountNamePlaceholder(personType: PersonType) {
  return personType === 'fisica'
    ? 'Ex.: Maria Aparecida Silva'
    : 'Ex.: Transportadora Vale do Norte LTDA';
}

function getAccountDocumentLabel(personType: PersonType) {
  return personType === 'fisica' ? 'CPF' : 'CNPJ';
}

function getAccountDocumentPlaceholder(personType: PersonType) {
  return personType === 'fisica'
    ? '000.000.000-00'
    : '00.000.000/0000-00';
}

function getAccountDocumentValue(account: {
  personType: PersonType;
  cpf: string;
  cnpj: string;
}) {
  return account.personType === 'fisica' ? account.cpf : account.cnpj;
}

function hasRequiredAccountIdentity(profile: AccountProfileState) {
  return Boolean(
    profile.name.trim() &&
      getAccountDocumentValue(profile).trim() &&
      profile.phone.trim() &&
      profile.email.trim(),
  );
}

function isAddressComplete(profile: AccountProfileState) {
  return Boolean(
    profile.postalCode.trim() &&
      profile.street.trim() &&
      profile.addressNumber.trim() &&
      profile.neighborhood.trim() &&
      profile.city.trim() &&
      profile.state.trim(),
  );
}

function isAccountProfileComplete(profile: AccountProfileState) {
  return hasRequiredAccountIdentity(profile) && isAddressComplete(profile);
}

function getAccountProfileValidationMessage(profile: AccountProfileState) {
  if (!profile.name.trim()) {
    return `Informe ${getAccountNameLabel(profile.personType).toLowerCase()}.`;
  }

  if (!getAccountDocumentValue(profile).trim()) {
    return `Informe ${getAccountDocumentLabel(profile.personType)}.`;
  }

  if (!profile.phone.trim()) {
    return 'Informe telefone ou WhatsApp.';
  }

  if (!profile.email.trim()) {
    return 'Informe o e-mail da conta.';
  }

  return '';
}

function getLinkedEntitySectionTitle(personType: PersonType) {
  return personType === 'fisica'
    ? 'Empresa vinculada'
    : 'Pessoa física vinculada';
}

function getLinkedEntityNameLabel(personType: PersonType) {
  return personType === 'fisica' ? 'Razão social' : 'Nome completo';
}

function getLinkedEntityNamePlaceholder(personType: PersonType) {
  return personType === 'fisica'
    ? 'Ex.: Transportadora Vale do Norte LTDA'
    : 'Ex.: Maria Aparecida Silva';
}

function getLinkedEntityDocumentLabel(personType: PersonType) {
  return personType === 'fisica' ? 'CNPJ' : 'CPF';
}

function getLinkedEntityDocumentPlaceholder(personType: PersonType) {
  return personType === 'fisica'
    ? '00.000.000/0000-00'
    : '000.000.000-00';
}

function getLinkedEntityDocumentValue(profile: AccountProfileState) {
  return profile.personType === 'fisica'
    ? profile.linkedCnpj
    : profile.linkedCpf;
}

function buildAccountProfileFromAuthForm(authForm: AuthFormState) {
  return {
    personType: authForm.personType,
    name: authForm.name,
    cpf: authForm.personType === 'fisica' ? formatCpf(authForm.cpf) : '',
    cnpj: authForm.personType === 'juridica' ? formatCnpj(authForm.cnpj) : '',
    phone: formatPhone(authForm.phone),
    email: authForm.email,
    postalCode: '',
    street: '',
    addressNumber: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    linkedName: '',
    linkedCpf: '',
    linkedCnpj: '',
  } satisfies AccountProfileState;
}

function getAccountProfileFromMetadata(
  metadata: Record<string, unknown> | undefined,
  emailFallback: string,
) {
  if (!metadata) {
    return null;
  }

  const personType = normalizePersonType(metadata.tipo_pessoa ?? metadata.personType);
  const name =
    typeof metadata.nome === 'string'
      ? metadata.nome
      : typeof metadata.name === 'string'
        ? metadata.name
        : '';
  const cpf = typeof metadata.cpf === 'string' ? metadata.cpf : '';
  const cnpj = typeof metadata.cnpj === 'string' ? metadata.cnpj : '';
  const phone =
    typeof metadata.telefone === 'string'
      ? metadata.telefone
      : typeof metadata.phone === 'string'
        ? metadata.phone
        : '';
  const email =
    typeof metadata.email === 'string' && metadata.email.trim()
      ? metadata.email
      : emailFallback;

  if (!name && !cpf && !cnpj && !phone) {
    return null;
  }

  return {
    personType,
    name,
    cpf: personType === 'fisica' ? formatCpf(cpf) : '',
    cnpj: personType === 'juridica' ? formatCnpj(cnpj) : '',
    phone: formatPhone(phone),
    email,
    postalCode: '',
    street: '',
    addressNumber: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    linkedName: '',
    linkedCpf: '',
    linkedCnpj: '',
  } satisfies AccountProfileState;
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
  const [accountProfile, setAccountProfile] = useState<AccountProfileState>(
    initialAccountProfile,
  );
  const [savedAccountProfile, setSavedAccountProfile] =
    useState<AccountProfileState>(initialAccountProfile);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
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
  const [isUpdatingExecutionStatus, setIsUpdatingExecutionStatus] =
    useState(false);
  const [cityOptions, setCityOptions] = useState<CityOption[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [citiesError, setCitiesError] = useState('');
  const [isLookingUpPostalCode, setIsLookingUpPostalCode] = useState(false);
  const [postalCodeError, setPostalCodeError] = useState('');
  const [activeCityField, setActiveCityField] = useState<CityField | null>(
    null,
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>('cargas');
  const [mapPickerTarget, setMapPickerTarget] =
    useState<MapPickerTarget | null>(null);
  const [mapPickerError, setMapPickerError] = useState('');
  const [mapPickerQuery, setMapPickerQuery] = useState('');
  const [mapPickerResults, setMapPickerResults] = useState<MapboxFeature[]>([]);
  const [isSearchingMap, setIsSearchingMap] = useState(false);
  const mapPickerElementRef = useRef<HTMLDivElement | null>(null);
  const mapboxMapRef = useRef<any>(null);
  const mapboxMarkerRef = useRef<any>(null);

  const persistAccountProfile = async (
    profile: AccountProfileState,
    options?: {
      showFeedback?: boolean;
      successMessage?: string;
    },
  ) => {
    const validationMessage = getAccountProfileValidationMessage(profile);

    if (validationMessage) {
      if (options?.showFeedback !== false) {
        setProfileMessage('');
        setProfileError(validationMessage);
      }

      return {
        success: false,
        error: validationMessage,
      };
    }

    const normalizedProfile = {
      personType: profile.personType,
      name: profile.name.trim(),
      cpf: profile.personType === 'fisica' ? formatCpf(profile.cpf.trim()) : '',
      cnpj: profile.personType === 'juridica' ? formatCnpj(profile.cnpj.trim()) : '',
      phone: formatPhone(profile.phone.trim()),
      email: profile.email.trim() || session?.user.email || '',
      postalCode: formatPostalCode(profile.postalCode.trim()),
      street: profile.street.trim(),
      addressNumber: profile.addressNumber.trim(),
      complement: profile.complement.trim(),
      neighborhood: profile.neighborhood.trim(),
      city: profile.city.trim(),
      state: profile.state.trim().toUpperCase(),
      linkedName: profile.linkedName.trim(),
      linkedCpf:
        profile.personType === 'juridica'
          ? formatCpf(profile.linkedCpf.trim())
          : '',
      linkedCnpj:
        profile.personType === 'fisica'
          ? formatCnpj(profile.linkedCnpj.trim())
          : '',
    } satisfies AccountProfileState;

    const { error } = await supabase.rpc('salvar_conta_web', {
      p_tipo_pessoa: normalizedProfile.personType,
      p_nome: normalizedProfile.name,
      p_cpf: digitsOnly(normalizedProfile.cpf) || null,
      p_cnpj: digitsOnly(normalizedProfile.cnpj) || null,
      p_telefone: digitsOnly(normalizedProfile.phone),
      p_email: normalizedProfile.email || null,
      p_responsavel: null,
      p_cep: digitsOnly(normalizedProfile.postalCode) || null,
      p_logradouro: normalizedProfile.street || null,
      p_numero_endereco: normalizedProfile.addressNumber || null,
      p_complemento: normalizedProfile.complement || null,
      p_bairro: normalizedProfile.neighborhood || null,
      p_cidade: normalizedProfile.city || null,
      p_uf: normalizedProfile.state || null,
      p_vinculado_nome: normalizedProfile.linkedName || null,
      p_vinculado_cpf: digitsOnly(normalizedProfile.linkedCpf) || null,
      p_vinculado_cnpj: digitsOnly(normalizedProfile.linkedCnpj) || null,
    });

    if (error) {
      if (options?.showFeedback !== false) {
        setProfileMessage('');
        setProfileError(error.message);
      }

      return {
        success: false,
        error: error.message,
      };
    }

    setAccountProfile(normalizedProfile);
    setSavedAccountProfile(normalizedProfile);
    setIsEditingProfile(false);

    if (options?.showFeedback !== false) {
      setProfileError('');
      setProfileMessage(
        options?.successMessage ?? 'Dados principais da conta salvos com sucesso.',
      );
    }

    return {
      success: true,
    };
  };

  const loadAccountProfile = async () => {
    if (!session) {
      setAccountProfile(initialAccountProfile);
      setSavedAccountProfile(initialAccountProfile);
      setIsEditingProfile(false);
      return;
    }

    const { data, error } = await supabase
      .from('empresas_web')
      .select(
        'tipo_pessoa, nome, cpf, cnpj, telefone, email, cep, logradouro, numero_endereco, complemento, bairro, cidade, uf, vinculado_nome, vinculado_cpf, vinculado_cnpj',
      )
      .maybeSingle();

    if (error) {
      setProfileMessage('');
      setProfileError(error.message);
      return;
    }

    if (!data) {
      const metadataProfile = getAccountProfileFromMetadata(
        session.user.user_metadata as Record<string, unknown> | undefined,
        session.user.email || '',
      );

      if (metadataProfile) {
        setAccountProfile(metadataProfile);
        setSavedAccountProfile(metadataProfile);
        await persistAccountProfile(metadataProfile, { showFeedback: false });
        return;
      }

      setAccountProfile((current) => ({
        ...current,
        email: current.email || session.user.email || '',
      }));
      setSavedAccountProfile((current) => ({
        ...current,
        email: current.email || session.user.email || '',
      }));
      return;
    }

    const profile = data as AccountProfileRow;

    const nextProfile = {
      personType: normalizePersonType(profile.tipo_pessoa),
      name: profile.nome,
      cpf: formatCpf(profile.cpf || ''),
      cnpj: formatCnpj(profile.cnpj || ''),
      phone: formatPhone(profile.telefone),
      email: profile.email || session.user.email || '',
      postalCode: formatPostalCode(profile.cep || ''),
      street: profile.logradouro || '',
      addressNumber: profile.numero_endereco || '',
      complement: profile.complemento || '',
      neighborhood: profile.bairro || '',
      city: profile.cidade || '',
      state: (profile.uf || '').toUpperCase(),
      linkedName: profile.vinculado_nome || '',
      linkedCpf: formatCpf(profile.vinculado_cpf || ''),
      linkedCnpj: formatCnpj(profile.vinculado_cnpj || ''),
    } satisfies AccountProfileState;

    setAccountProfile(nextProfile);
    setSavedAccountProfile(nextProfile);
    setIsEditingProfile(false);
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
        chosenRequestId: null,
        chosenExecutionStatus: null,
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
              'id, room_id, status, status_execucao, coleta_informada_em, coleta_confirmada_em, entrega_informada_em, entrega_confirmada_em, created_at, responded_at, mensagem_inicial',
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
                requestId: request.id,
                status: request.status,
                statusExecucao: request.status_execucao,
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
            chosenRequestId: acceptedNegotiation.requestId,
            chosenExecutionStatus: acceptedNegotiation.statusExecucao,
          };
        }),
      );
    } catch (error) {
      setCargoListError(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar as cargas da conta.',
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
          'id, created_at, viagem_id, Viagens:viagem_id(empresa, origem_cidade, origem_uf, destino_cidade, destino_uf, coleta_endereco, coleta_latitude, coleta_longitude, coleta_place_id, entrega_endereco, entrega_latitude, entrega_longitude, entrega_place_id)',
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
              'id, room_id, status, status_execucao, coleta_informada_em, coleta_confirmada_em, entrega_informada_em, entrega_confirmada_em, created_at, responded_at, mensagem_inicial',
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
            requestId: request?.id ?? null,
            viagemId: room.viagem_id,
            createdAt: room.created_at,
            companyName: trip?.empresa?.trim() || 'GLM Cargas',
            driverName: getDriverNameFromMessage(
              request?.mensagem_inicial ?? lastMessage?.message ?? null,
            ),
            routeLabel: formatRouteLabel(trip, room.viagem_id),
            status: request?.status ?? 'Aguardando',
            statusExecucao: request?.status_execucao ?? null,
            coletaInformadaEm: request?.coleta_informada_em ?? null,
            coletaConfirmadaEm: request?.coleta_confirmada_em ?? null,
            entregaInformadaEm: request?.entrega_informada_em ?? null,
            entregaConfirmadaEm: request?.entrega_confirmada_em ?? null,
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
          : 'Não foi possível carregar as conversas.',
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
      setAccountProfile((current) => ({
        ...current,
        email: current.email || data.session?.user.email || '',
      }));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsAdmin(false);
      setAccountProfile((current) => ({
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
    void loadAccountProfile();
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
    if (!isEditingProfile) {
      setIsLookingUpPostalCode(false);
      setPostalCodeError('');
      return;
    }

    const sanitizedPostalCode = digitsOnly(accountProfile.postalCode);

    if (!sanitizedPostalCode) {
      setPostalCodeError('');
      setIsLookingUpPostalCode(false);
      return;
    }

    if (sanitizedPostalCode.length < 8) {
      setPostalCodeError('');
      setIsLookingUpPostalCode(false);
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    const lookupPostalCode = async () => {
      setIsLookingUpPostalCode(true);
      setPostalCodeError('');

      try {
        const response = await fetch(
          `https://viacep.com.br/ws/${sanitizedPostalCode}/json/`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error('Não foi possível consultar o CEP agora.');
        }

        const data = (await response.json()) as PostalCodeLookupResponse;

        if (!isMounted || controller.signal.aborted) {
          return;
        }

        if (data.erro) {
          setPostalCodeError('CEP não encontrado. Você pode preencher manualmente.');
          return;
        }

        setAccountProfile((current) => {
          if (digitsOnly(current.postalCode) !== sanitizedPostalCode) {
            return current;
          }

          return {
            ...current,
            street: data.logradouro?.trim() || current.street,
            neighborhood: data.bairro?.trim() || current.neighborhood,
            city: data.localidade?.trim() || current.city,
            state: data.uf?.trim().toUpperCase() || current.state,
          };
        });
      } catch (error) {
        if (!isMounted || controller.signal.aborted) {
          return;
        }

        setPostalCodeError(
          error instanceof Error
            ? error.message
            : 'Não foi possível consultar o CEP agora.',
        );
      } finally {
        if (isMounted && !controller.signal.aborted) {
          setIsLookingUpPostalCode(false);
        }
      }
    };

    void lookupPostalCode();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [accountProfile.postalCode, isEditingProfile]);

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

  useEffect(() => {
    if (!mapPickerTarget) {
      return;
    }

    let isCancelled = false;
    const target = mapPickerTarget;

    const initMapPicker = async () => {
      try {
        setMapPickerError('');
        const mapboxgl = await loadMapboxGl();

        if (
          isCancelled ||
          !mapboxgl ||
          !mapPickerElementRef.current
        ) {
          return;
        }

        mapboxgl.accessToken = mapboxAccessToken;

        const currentLatitude =
          target === 'pickup'
            ? parseCoordinateToNumber(form.pickupLatitude)
            : parseCoordinateToNumber(form.deliveryLatitude);
        const currentLongitude =
          target === 'pickup'
            ? parseCoordinateToNumber(form.pickupLongitude)
            : parseCoordinateToNumber(form.deliveryLongitude);
        const hasCurrentPoint =
          currentLatitude !== null && currentLongitude !== null;
        const initialCenter = hasCurrentPoint
          ? [currentLongitude, currentLatitude]
          : [-51.92528, -14.235004];
        const map = new mapboxgl.Map({
          container: mapPickerElementRef.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: initialCenter,
          zoom: hasCurrentPoint ? 14 : 3.5,
        });
        const marker = new mapboxgl.Marker({
          color: '#e16f12',
          draggable: true,
        });

        map.addControl(new mapboxgl.NavigationControl(), 'top-right');
        mapboxMapRef.current = map;
        mapboxMarkerRef.current = marker;

        if (hasCurrentPoint) {
          marker.setLngLat(initialCenter).addTo(map);
        }

        marker.on('dragend', async () => {
          const lngLat = marker.getLngLat();

          try {
            const feature = await reverseMapboxGeocode(lngLat.lng, lngLat.lat);
            const selection = feature
              ? selectionFromMapboxFeature(feature)
              : null;

            applyMapSelection(target, {
              address:
                selection?.address ??
                `${lngLat.lat.toFixed(6)}, ${lngLat.lng.toFixed(6)}`,
              latitude: lngLat.lat,
              longitude: lngLat.lng,
              placeId: selection?.placeId ?? null,
              city: selection?.city ?? '',
              state: selection?.state ?? '',
            });
          } catch {
            applyMapSelection(target, {
              address: `${lngLat.lat.toFixed(6)}, ${lngLat.lng.toFixed(6)}`,
              latitude: lngLat.lat,
              longitude: lngLat.lng,
              placeId: null,
              city: '',
              state: '',
            });
          }
        });

        map.on('click', async (event: any) => {
          const { lng, lat } = event.lngLat;
          marker.setLngLat([lng, lat]).addTo(map);

          try {
            const feature = await reverseMapboxGeocode(lng, lat);
            const selection = feature
              ? selectionFromMapboxFeature(feature)
              : null;

            applyMapSelection(target, {
              address:
                selection?.address ?? `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
              latitude: lat,
              longitude: lng,
              placeId: selection?.placeId ?? null,
              city: selection?.city ?? '',
              state: selection?.state ?? '',
            });
            setMapPickerQuery(
              selection?.address ?? `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            );
          } catch {
            applyMapSelection(target, {
              address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
              latitude: lat,
              longitude: lng,
              placeId: null,
              city: '',
              state: '',
            });
            setMapPickerQuery(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
          }
        });
      } catch (error) {
        if (!isCancelled) {
          setMapPickerError(
            error instanceof Error
              ? error.message
              : 'Não foi possível abrir o mapa.',
          );
        }
      }
    };

    void initMapPicker();

    return () => {
      isCancelled = true;
      mapboxMapRef.current?.remove();
      mapboxMapRef.current = null;
      mapboxMarkerRef.current = null;
    };
  }, [mapPickerTarget]);

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

      if (field === 'profileCity') {
        setProfileMessage('');
        setProfileError('');
        setAccountProfile((current) => ({
          ...current,
          city: value,
          state: exactMatches.length === 1 ? exactMatches[0].state : '',
        }));
      } else {
        setForm((current) => ({
          ...current,
          [field]: value,
          [stateField]: exactMatches.length === 1 ? exactMatches[0].state : '',
        }));
      }
      setActiveCityField(field);
    };

  const handleCitySelect = (field: CityField, city: CityOption) => {
    if (field === 'profileCity') {
      setProfileMessage('');
      setProfileError('');
      setAccountProfile((current) => ({
        ...current,
        city: city.name,
        state: city.state,
      }));
    } else {
      const stateField = getCityStateField(field);

      setForm((current) => ({
        ...current,
        [field]: city.name,
        [stateField]: city.state,
      }));
    }
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
      setAuthMessage('');
      setAuthError('');
      const rawValue = event.target.value;
      setAuthForm((current) => ({
        ...current,
        [field]:
          field === 'cpf'
            ? formatCpf(rawValue)
            : field === 'cnpj'
              ? formatCnpj(rawValue)
              : field === 'phone'
                ? formatPhone(rawValue)
                : rawValue,
      }));
    };

  const handleAuthPersonTypeChange = (personType: PersonType) => {
    setAuthMessage('');
    setAuthError('');
    setAuthForm((current) => ({
      ...current,
      personType,
      cpf: personType === 'fisica' ? current.cpf : '',
      cnpj: personType === 'juridica' ? current.cnpj : '',
    }));
  };

  const handleAccountProfileChange =
    (field: keyof AccountProfileState) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setProfileMessage('');
      setProfileError('');
      if (field === 'postalCode') {
        setPostalCodeError('');
      }
      const rawValue = event.target.value;
      setAccountProfile((current) => ({
        ...current,
        [field]:
          field === 'cpf'
            ? formatCpf(rawValue)
            : field === 'cnpj'
              ? formatCnpj(rawValue)
              : field === 'linkedCpf'
                ? formatCpf(rawValue)
                : field === 'linkedCnpj'
                  ? formatCnpj(rawValue)
                  : field === 'postalCode'
                    ? formatPostalCode(rawValue)
                    : field === 'state'
                      ? rawValue.toUpperCase()
              : field === 'phone'
                ? formatPhone(rawValue)
                : rawValue,
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

    if (authMode === 'register') {
      const nextProfile = buildAccountProfileFromAuthForm(authForm);
      const validationMessage = getAccountProfileValidationMessage(nextProfile);

      if (validationMessage) {
        setIsAuthenticating(false);
        setAuthError(validationMessage);
        return;
      }
    }

    const response =
      authMode === 'login'
        ? await supabase.auth.signInWithPassword({
            email: authForm.email.trim(),
            password: authForm.password,
          })
        : await supabase.auth.signUp({
            email: authForm.email.trim(),
            password: authForm.password,
            options: {
              data: {
                tipo_pessoa: authForm.personType,
                nome: authForm.name.trim(),
                cpf:
                  authForm.personType === 'fisica'
                    ? digitsOnly(authForm.cpf)
                    : '',
                cnpj:
                  authForm.personType === 'juridica'
                    ? digitsOnly(authForm.cnpj)
                    : '',
                telefone: digitsOnly(authForm.phone),
                email: authForm.email.trim(),
              },
            },
          });

    setIsAuthenticating(false);

    if (response.error) {
      setAuthError(getAuthErrorMessage(response.error.message));
      return;
    }

    if (authMode === 'register') {
      const nextProfile = buildAccountProfileFromAuthForm(authForm);
      setAccountProfile(nextProfile);

      if (response.data.session) {
        const saveResult = await persistAccountProfile(nextProfile, {
          showFeedback: false,
        });

        if (!saveResult.success) {
          setAuthError(
            saveResult.error ??
              'A conta foi criada, mas não foi possível salvar os dados básicos.',
          );
          return;
        }
      }
    }

    setAuthForm(initialAuthForm);
    setAuthMessage(
      authMode === 'login'
        ? 'Login realizado com sucesso.'
        : response.data.session
          ? 'Conta criada com sucesso.'
          : 'Cadastro realizado. Confirme seu e-mail antes de entrar. Seus dados básicos serão concluídos no primeiro acesso.',
    );
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingProfile(true);
    setProfileMessage('');
    setProfileError('');

    await persistAccountProfile(accountProfile, {
      successMessage: 'Dados principais da conta atualizados com sucesso.',
    });

    setIsSavingProfile(false);
  };

  const handleStartProfileEdit = () => {
    setProfileMessage('');
    setProfileError('');
    setPostalCodeError('');
    setIsEditingProfile(true);
  };

  const handleCancelProfileEdit = () => {
    setProfileMessage('');
    setProfileError('');
    setPostalCodeError('');
    setAccountProfile(savedAccountProfile);
    setActiveCityField((current) =>
      current === 'profileCity' ? null : current,
    );
    setIsEditingProfile(false);
  };

  const handleLogout = async () => {
    setAuthMessage('');
    setAuthError('');
    setProfileMessage('');
    setProfileError('');
    setIsEditingProfile(false);
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

  const applyMapSelection = (
    target: MapPickerTarget,
    selection: MapSelection,
  ) => {
    const latitude =
      selection.latitude === null ? '' : selection.latitude.toFixed(6);
    const longitude =
      selection.longitude === null ? '' : selection.longitude.toFixed(6);

    setForm((current) => {
      if (target === 'pickup') {
        return {
          ...current,
          pickupAddress: selection.address,
          pickupLatitude: latitude,
          pickupLongitude: longitude,
          pickupPlaceId: selection.placeId ?? '',
          pickupCity: selection.city || current.pickupCity,
          pickupState: selection.state || current.pickupState,
        };
      }

      return {
        ...current,
        deliveryAddress: selection.address,
        deliveryLatitude: latitude,
        deliveryLongitude: longitude,
        deliveryPlaceId: selection.placeId ?? '',
        deliveryCity: selection.city || current.deliveryCity,
        deliveryState: selection.state || current.deliveryState,
      };
    });

    if (
      selection.latitude !== null &&
      selection.longitude !== null &&
      mapboxMapRef.current &&
      mapboxMarkerRef.current
    ) {
      const lngLat = [selection.longitude, selection.latitude];
      mapboxMarkerRef.current.setLngLat(lngLat).addTo(mapboxMapRef.current);
      mapboxMapRef.current.flyTo({ center: lngLat, zoom: 15 });
    }
  };

  const openMapPicker = (target: MapPickerTarget) => {
    setMapPickerError('');
    setMapPickerResults([]);
    setMapPickerQuery(
      target === 'pickup'
        ? buildNavigationAddress(form.pickupAddress, form.pickupCity, form.pickupState)
        : buildNavigationAddress(
            form.deliveryAddress,
            form.deliveryCity,
            form.deliveryState,
          ),
    );
    setMapPickerTarget(target);
  };

  const handleMapSearch = async () => {
    if (!mapPickerQuery.trim()) {
      setMapPickerResults([]);
      return;
    }

    setIsSearchingMap(true);
    setMapPickerError('');

    try {
      setMapPickerResults(await fetchMapboxFeatures(mapPickerQuery.trim()));
    } catch (error) {
      setMapPickerError(
        error instanceof Error
          ? error.message
          : 'Não foi possível buscar esse endereço.',
      );
    } finally {
      setIsSearchingMap(false);
    }
  };

  const handleMapResultSelect = (feature: MapboxFeature) => {
    if (!mapPickerTarget) return;

    const selection = selectionFromMapboxFeature(feature);

    if (!selection) {
      setMapPickerError('Selecione um resultado com localização válida.');
      return;
    }

    setMapPickerError('');
    setMapPickerQuery(selection.address);
    setMapPickerResults([]);
    applyMapSelection(mapPickerTarget, selection);
  };

  const submitCargo = async (mode: SubmitMode) => {
    setIsSubmitting(true);
    setSubmitMessage('');
    setSubmitError('');

    const hasCompleteAccountProfile = hasRequiredAccountIdentity(accountProfile);

    if (!hasCompleteAccountProfile) {
      setIsSubmitting(false);
      setSubmitError('Preencha os dados principais da conta antes de adicionar uma carga.');
      setActiveSection('perfil');
      return;
    }

    const pickupLatitude = parseCoordinateToNumber(form.pickupLatitude);
    const pickupLongitude = parseCoordinateToNumber(form.pickupLongitude);
    const deliveryLatitude = parseCoordinateToNumber(form.deliveryLatitude);
    const deliveryLongitude = parseCoordinateToNumber(form.deliveryLongitude);

    if (
      (form.pickupLatitude.trim() && pickupLatitude === null) ||
      (form.pickupLongitude.trim() && pickupLongitude === null) ||
      (form.deliveryLatitude.trim() && deliveryLatitude === null) ||
      (form.deliveryLongitude.trim() && deliveryLongitude === null)
    ) {
      setIsSubmitting(false);
      setSubmitError('Revise latitude e longitude. Use números como -23,550520.');
      return;
    }

    if (
      (pickupLatitude === null) !== (pickupLongitude === null) ||
      (deliveryLatitude === null) !== (deliveryLongitude === null)
    ) {
      setIsSubmitting(false);
      setSubmitError('Informe latitude e longitude juntas, ou deixe ambas vazias.');
      return;
    }

    const payload = {
      p_status: mode,
      p_tipo_pessoa: accountProfile.personType,
      p_nome: accountProfile.name.trim(),
      p_cpf: digitsOnly(accountProfile.cpf) || null,
      p_cnpj: digitsOnly(accountProfile.cnpj) || null,
      p_telefone: digitsOnly(accountProfile.phone),
      p_email: accountProfile.email.trim() || null,
      p_cidade_coleta: form.pickupCity.trim(),
      p_uf_coleta: form.pickupState.trim(),
      p_data_coleta: form.pickupDate || null,
      p_coleta_endereco: buildNavigationAddress(
        form.pickupAddress,
        form.pickupCity,
        form.pickupState,
      ),
      p_coleta_latitude: pickupLatitude,
      p_coleta_longitude: pickupLongitude,
      p_coleta_place_id: form.pickupPlaceId.trim() || null,
      p_cidade_entrega: form.deliveryCity.trim(),
      p_uf_entrega: form.deliveryState.trim(),
      p_prazo_entrega: form.deliveryDate || null,
      p_entrega_endereco: buildNavigationAddress(
        form.deliveryAddress,
        form.deliveryCity,
        form.deliveryState,
      ),
      p_entrega_latitude: deliveryLatitude,
      p_entrega_longitude: deliveryLongitude,
      p_entrega_place_id: form.deliveryPlaceId.trim() || null,
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
          'A função de atualização ainda não foi aplicada no Supabase. Rode o SQL novo antes de editar cargas existentes.',
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
        'Esta carga já teve um motorista aceito. Agora ela deve seguir para acompanhamento ou encerramento.',
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
        .select(
          'id, status, status_execucao, coleta_informada_em, coleta_confirmada_em, entrega_informada_em, entrega_confirmada_em, responded_at',
        )
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
                requestId: data.id,
                status,
                statusExecucao: data.status_execucao as TripExecutionStatus | null,
                coletaInformadaEm:
                  typeof data.coleta_informada_em === 'string'
                    ? data.coleta_informada_em
                    : null,
                coletaConfirmadaEm:
                  typeof data.coleta_confirmada_em === 'string'
                    ? data.coleta_confirmada_em
                    : null,
                entregaInformadaEm:
                  typeof data.entrega_informada_em === 'string'
                    ? data.entrega_informada_em
                    : null,
                entregaConfirmadaEm:
                  typeof data.entrega_confirmada_em === 'string'
                    ? data.entrega_confirmada_em
                    : null,
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

  const handleConfirmExecutionStep = async (
    room: ChatRoomSummary,
    step: 'coleta' | 'entrega',
  ) => {
    if (!session || !room.requestId || isUpdatingExecutionStatus) {
      return;
    }

    setIsUpdatingExecutionStatus(true);
    setChatMessagesError('');

    const rpcName =
      step === 'coleta'
        ? 'confirmar_coleta_empresa'
        : 'confirmar_entrega_empresa';
    const statusMessage =
      step === 'coleta'
        ? 'Coleta confirmada pela empresa. Siga para o local de entrega.'
        : 'Entrega confirmada pela empresa. Viagem concluída.';

    try {
      const { data, error } = await supabase.rpc(rpcName, {
        p_solicitacao_id: room.requestId,
      });

      if (error) {
        throw error;
      }

      const result =
        data && typeof data === 'object'
          ? (data as Record<string, unknown>)
          : {};
      const nextExecutionStatus =
        typeof result.status_execucao === 'string'
          ? (result.status_execucao as TripExecutionStatus)
          : room.statusExecucao;

      setChatRooms((current) =>
        current.map((chatRoom) =>
          chatRoom.id === room.id
            ? {
                ...chatRoom,
                statusExecucao: nextExecutionStatus,
                coletaConfirmadaEm:
                  typeof result.coleta_confirmada_em === 'string'
                    ? result.coleta_confirmada_em
                    : chatRoom.coletaConfirmadaEm,
                entregaConfirmadaEm:
                  typeof result.entrega_confirmada_em === 'string'
                    ? result.entrega_confirmada_em
                    : chatRoom.entregaConfirmadaEm,
              }
            : chatRoom,
        ),
      );

      const { data: messageData, error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          room_id: room.id,
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
        room.id === activeChatRoomId ? [...current, persistedMessage] : current,
      );
      setChatRooms((current) =>
        current.map((chatRoom) =>
          chatRoom.id === room.id
            ? {
                ...chatRoom,
                lastMessagePreview: persistedMessage.message,
                lastMessageAt: persistedMessage.createdAt,
              }
            : chatRoom,
        ),
      );

      await Promise.all([loadChatRooms(room.id), loadCompanyCargos()]);
    } catch (error) {
      setChatMessagesError(
        error instanceof Error
          ? error.message
          : 'Não foi possível confirmar esta etapa da viagem.',
      );
    } finally {
      setIsUpdatingExecutionStatus(false);
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

  const profileCitySuggestions =
    accountProfile.city.trim().length >= 2
      ? cityOptions
          .filter((city) =>
            normalizeSearchValue(city.name).includes(
              normalizeSearchValue(accountProfile.city),
            ),
          )
          .slice(0, 8)
      : [];

  const authFeedbackClass = authError
    ? 'form-feedback form-feedback--error'
    : 'form-feedback';
  const profileFeedbackClass = profileError
    ? 'form-feedback form-feedback--error'
    : 'form-feedback';
  const submitFeedbackClass = submitError
    ? 'form-feedback form-feedback--error'
    : 'form-feedback';
  const accountDocumentLabel = getAccountDocumentLabel(accountProfile.personType);
  const accountDocumentValue = getAccountDocumentValue(accountProfile);
  const accountProfileComplete = isAccountProfileComplete(accountProfile);

  if (isLoadingSession) {
    return (
      <div className="auth-page">
        <div className="auth-loading">
          <span className="panel-card__label">GLM Cargas</span>
          <strong>Verificando sessão da conta...</strong>
        </div>
      </div>
    );
  }

  if (!session && window.location.hash !== '#home-preview') {
    return (
      <div className="auth-page">
        <main className="auth-page__shell auth-page__shell--center">
          <section className="auth-card auth-card--entry" aria-label="Acesso da conta">
            <div className="auth-brand">
              <span>GLM</span>
              <strong>Cargas</strong>
            </div>

            <div className="auth-card__heading">
              <span className="panel-card__label">Acesso da conta</span>
              <h2>
                {authMode === 'login'
                  ? 'Entrar na conta'
                  : 'Criar nova conta'}
              </h2>
              <p>
                {authMode === 'login'
                  ? 'Use o e-mail cadastrado para acessar sua área e publicar cargas.'
                  : 'Escolha se o cadastro será para pessoa física ou jurídica e informe os dados básicos da conta.'}
              </p>
            </div>

            <div className="auth-toggle" role="tablist" aria-label="Modo de acesso">
              <button
                className={
                  authMode === 'login'
                    ? 'auth-toggle__button is-active'
                    : 'auth-toggle__button'
                }
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setAuthMessage('');
                  setAuthError('');
                }}
              >
                Entrar
              </button>
              <button
                className={
                  authMode === 'register'
                    ? 'auth-toggle__button is-active'
                    : 'auth-toggle__button'
                }
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setAuthMessage('');
                  setAuthError('');
                }}
              >
                Criar conta
              </button>
            </div>

            <form className="auth-form" onSubmit={handleAuthSubmit}>
              {authMode === 'register' && (
                <div className="auth-choice-group">
                  <span className="auth-choice-group__label">Tipo de cadastro</span>
                  <div className="auth-toggle">
                    <button
                      className={
                        authForm.personType === 'fisica'
                          ? 'auth-toggle__button is-active'
                          : 'auth-toggle__button'
                      }
                      type="button"
                      onClick={() => handleAuthPersonTypeChange('fisica')}
                    >
                      Pessoa física
                    </button>
                    <button
                      className={
                        authForm.personType === 'juridica'
                          ? 'auth-toggle__button is-active'
                          : 'auth-toggle__button'
                      }
                      type="button"
                      onClick={() => handleAuthPersonTypeChange('juridica')}
                    >
                      Pessoa jurídica
                    </button>
                  </div>
                </div>
              )}

              {authMode === 'register' && (
                <label>
                  {getAccountNameLabel(authForm.personType)}
                  <input
                    required
                    type="text"
                    placeholder={getAccountNamePlaceholder(authForm.personType)}
                    value={authForm.name}
                    onChange={handleAuthFieldChange('name')}
                  />
                </label>
              )}

              {authMode === 'register' && (
                <label>
                  {getAccountDocumentLabel(authForm.personType)}
                  <input
                    required
                    type="text"
                    placeholder={getAccountDocumentPlaceholder(authForm.personType)}
                    value={getAccountDocumentValue(authForm)}
                    onChange={handleAuthFieldChange(
                      authForm.personType === 'fisica' ? 'cpf' : 'cnpj',
                    )}
                  />
                </label>
              )}

              {authMode === 'register' && (
                <label>
                  Telefone / WhatsApp
                  <input
                    required
                    type="text"
                    placeholder="(00) 00000-0000"
                    value={authForm.phone}
                    onChange={handleAuthFieldChange('phone')}
                  />
                </label>
              )}

              <label>
                E-mail de acesso
                <input
                  required
                  type="email"
                  placeholder="voce@exemplo.com.br"
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
                    : 'Criar conta'}
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
            <strong>Perfil da conta</strong>
          </button>
        </nav>

        <div className="sidebar__footer">
          <span>{session ? 'Conta conectada' : 'Modo preview'}</span>
          <strong>{session?.user.email ?? 'Sem login'}</strong>
        </div>
      </aside>

      <div className="page-shell">
        <nav className="topbar" aria-label="Conta">
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
                      <span>Conta vinculada</span>
                      <strong>{accountProfile.name || 'Perfil da conta não preenchido'}</strong>
                      <p>
                        {accountDocumentLabel}: {accountDocumentValue || 'Não informado'} |
                        Tipo: {getPersonTypeLabel(accountProfile.personType)}
                      </p>
                    </div>
                    <button
                      className="button button--ghost"
                      type="button"
                      onClick={() => setActiveSection('perfil')}
                    >
                      Editar conta
                    </button>
                    {editingCargoId && (
                      <button
                        className="button button--ghost"
                        type="button"
                        onClick={handleCancelCargoEdit}
                      >
                        Cancelar edição
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
                    <div className="field-grid field-grid--two route-map-fields">
                      <label className="field-grid__full">
                        Endereço de coleta
                        <input
                          type="text"
                          placeholder="Rua, número, bairro, cidade - UF"
                          value={form.pickupAddress}
                          onChange={handleFieldChange('pickupAddress')}
                        />
                      </label>
                      <label className="field-grid__full">
                        Endereço de entrega
                        <input
                          type="text"
                          placeholder="Rua, número, bairro, cidade - UF"
                          value={form.deliveryAddress}
                          onChange={handleFieldChange('deliveryAddress')}
                        />
                      </label>
                      <div className="field-grid__full map-check-actions">
                        <button
                          className="button button--primary"
                          type="button"
                          onClick={() => openMapPicker('pickup')}
                        >
                          Selecionar coleta no mapa
                        </button>
                        <button
                          className="button button--primary"
                          type="button"
                          onClick={() => openMapPicker('delivery')}
                        >
                          Selecionar entrega no mapa
                        </button>
                        <a
                          className="button button--ghost"
                          href={
                            mapsUrlForNavigationPoint({
                              address: buildNavigationAddress(
                                form.pickupAddress,
                                form.pickupCity,
                                form.pickupState,
                              ),
                              latitude: null,
                              longitude: null,
                              placeId: null,
                            }) ?? undefined
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          Conferir coleta no Google Maps
                        </a>
                        <a
                          className="button button--ghost"
                          href={
                            mapsUrlForNavigationPoint({
                              address: buildNavigationAddress(
                                form.deliveryAddress,
                                form.deliveryCity,
                                form.deliveryState,
                              ),
                              latitude: null,
                              longitude: null,
                              placeId: null,
                            }) ?? undefined
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          Conferir entrega no Google Maps
                        </a>
                      </div>
                    </div>
                    <p className="field-grid__helper">
                      Selecione o ponto no mapa para preencher o endereço
                      automaticamente. Sem token do Mapbox, você ainda
                      pode digitar o endereço manualmente.
                    </p>
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
                  <span>Dashboard da conta</span>
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
                        Buscando as cargas publicadas por esta conta.
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
                            cargo.observacoes ||
                            cargo.coleta_endereco ||
                            cargo.entrega_endereco) && (
                            <div className="cargo-card__notes">
                              {cargo.coleta_endereco && (
                                <p>
                                  <strong>Endereço de coleta:</strong>{' '}
                                  {cargo.coleta_endereco}
                                </p>
                              )}
                              {cargo.entrega_endereco && (
                                <p>
                                  <strong>Endereço de entrega:</strong>{' '}
                                  {cargo.entrega_endereco}
                                </p>
                              )}
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
                              <div className="cargo-card__map-actions">
                                <a
                                  className="button button--ghost"
                                  href={
                                    mapsUrlForNavigationPoint({
                                      address:
                                        cargo.coleta_endereco ??
                                        buildNavigationAddress(
                                          '',
                                          cargo.cidade_coleta,
                                          cargo.uf_coleta,
                                        ),
                                      latitude: cargo.coleta_latitude,
                                      longitude: cargo.coleta_longitude,
                                      placeId: cargo.coleta_place_id,
                                    }) ?? undefined
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Abrir coleta no Google Maps
                                </a>
                                <a
                                  className="button button--ghost"
                                  href={
                                    mapsUrlForNavigationPoint({
                                      address:
                                        cargo.entrega_endereco ??
                                        buildNavigationAddress(
                                          '',
                                          cargo.cidade_entrega,
                                          cargo.uf_entrega,
                                        ),
                                      latitude: cargo.entrega_latitude,
                                      longitude: cargo.entrega_longitude,
                                      placeId: cargo.entrega_place_id,
                                    }) ?? undefined
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Abrir entrega no Google Maps
                                </a>
                              </div>
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

                        <div className="execution-panel">
                          <div>
                            <span>Etapa da viagem</span>
                            <strong>
                              {executionStatusLabel(
                                activeChatRoom.statusExecucao,
                              )}
                            </strong>
                            <p>{executionStatusDescription(activeChatRoom)}</p>
                            {(activeChatRoom.coletaInformadaEm ||
                              activeChatRoom.coletaConfirmadaEm ||
                              activeChatRoom.entregaInformadaEm ||
                              activeChatRoom.entregaConfirmadaEm) && (
                              <small>
                                {activeChatRoom.coletaInformadaEm &&
                                  `Coleta informada: ${formatDateTime(activeChatRoom.coletaInformadaEm)}`}
                                {activeChatRoom.coletaConfirmadaEm &&
                                  ` | Coleta confirmada: ${formatDateTime(activeChatRoom.coletaConfirmadaEm)}`}
                                {activeChatRoom.entregaInformadaEm &&
                                  ` | Entrega informada: ${formatDateTime(activeChatRoom.entregaInformadaEm)}`}
                                {activeChatRoom.entregaConfirmadaEm &&
                                  ` | Entrega confirmada: ${formatDateTime(activeChatRoom.entregaConfirmadaEm)}`}
                              </small>
                            )}
                          </div>
                          {activeChatRoom.status === 'Aceita' &&
                            activeChatRoom.statusExecucao ===
                              'Retirada informada' && (
                              <button
                                className="button button--primary"
                                type="button"
                                disabled={isUpdatingExecutionStatus}
                                onClick={() =>
                                  handleConfirmExecutionStep(
                                    activeChatRoom,
                                    'coleta',
                                  )
                                }
                              >
                                {isUpdatingExecutionStatus
                                  ? 'Confirmando...'
                                  : 'Confirmar coleta'}
                              </button>
                          )}
                          {activeChatRoom.status === 'Aceita' &&
                            activeChatRoom.statusExecucao ===
                              'Entrega informada' && (
                              <button
                                className="button button--primary"
                                type="button"
                                disabled={isUpdatingExecutionStatus}
                                onClick={() =>
                                  handleConfirmExecutionStep(
                                    activeChatRoom,
                                    'entrega',
                                  )
                                }
                              >
                                {isUpdatingExecutionStatus
                                  ? 'Confirmando...'
                                  : 'Confirmar entrega'}
                              </button>
                          )}
                        </div>

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
            <section className="section" id="perfil-conta">
              <div className="section-hero">
                <div className="section-heading">
                  <span>Perfil da conta</span>
                  <h2>Dados básicos da conta e informações complementares do perfil.</h2>
                </div>
                <span className="section-hero__icon">
                  <SidebarIcon name="perfil" />
                </span>
              </div>

              <div className="profile-overview">
                <div className="profile-avatar" aria-hidden="true">
                  {(accountProfile.name || 'GLM')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="profile-overview__content">
                  <span>Identidade da conta</span>
                  <strong>
                    {accountProfile.name || 'Conta ainda não identificada'}
                  </strong>
                  <p>
                    {accountDocumentValue
                      ? `${accountDocumentLabel} ${accountDocumentValue}`
                      : 'Preencha os dados abaixo para vincular as próximas cargas.'}
                  </p>
                </div>
                <div className="profile-overview__meta">
                  <span>Status</span>
                  <strong>{accountProfileComplete ? 'Completo' : 'Incompleto'}</strong>
                </div>
              </div>

              <form className="cargo-form profile-form" onSubmit={handleProfileSubmit}>
                <div className="form-block">
                  <div className="profile-form__header">
                    <div className="profile-form__intro">
                      <h3>Dados principais da conta</h3>
                      <p>
                        O tipo de cadastro é definido na criação da conta. Para trocar
                        de tipo, crie uma nova conta.
                      </p>
                    </div>
                    {!isEditingProfile ? (
                      <button
                        className="button button--ghost"
                        type="button"
                        onClick={handleStartProfileEdit}
                      >
                        Editar dados
                      </button>
                    ) : (
                      <button
                        className="button button--ghost"
                        type="button"
                        onClick={handleCancelProfileEdit}
                      >
                        Cancelar edição
                      </button>
                    )}
                  </div>

                  <div className="field-grid field-grid--two">
                    <label className="field-grid__full">
                      Tipo de cadastro
                      <input
                        type="text"
                        value={getPersonTypeLabel(accountProfile.personType)}
                        disabled
                      />
                    </label>
                    <label>
                      {getAccountNameLabel(accountProfile.personType)}
                      <input
                        required
                        type="text"
                        placeholder={getAccountNamePlaceholder(accountProfile.personType)}
                        value={accountProfile.name}
                        onChange={handleAccountProfileChange('name')}
                        disabled={!isEditingProfile}
                      />
                    </label>
                    <label>
                      {accountDocumentLabel}
                      <input
                        required
                        type="text"
                        placeholder={getAccountDocumentPlaceholder(accountProfile.personType)}
                        value={accountDocumentValue}
                        onChange={handleAccountProfileChange(
                          accountProfile.personType === 'fisica' ? 'cpf' : 'cnpj',
                        )}
                        disabled={!isEditingProfile}
                      />
                    </label>
                    <label>
                      Telefone / WhatsApp
                      <input
                        required
                        type="text"
                        placeholder="(00) 00000-0000"
                        value={accountProfile.phone}
                        onChange={handleAccountProfileChange('phone')}
                        disabled={!isEditingProfile}
                      />
                    </label>
                    <label>
                      E-mail da conta
                      <input
                        required
                        type="email"
                        placeholder="voce@exemplo.com.br"
                        value={accountProfile.email}
                        onChange={handleAccountProfileChange('email')}
                        disabled={!isEditingProfile}
                      />
                    </label>
                  </div>
                </div>

                <div className="form-block">
                  <h3>Endereço</h3>
                  <div className="field-grid field-grid--two">
                    <label>
                      CEP
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="00000-000"
                        value={accountProfile.postalCode}
                        onChange={handleAccountProfileChange('postalCode')}
                        disabled={!isEditingProfile}
                      />
                    </label>
                    <label>
                      Bairro
                      <input
                        type="text"
                        placeholder="Ex.: Centro"
                        value={accountProfile.neighborhood}
                        onChange={handleAccountProfileChange('neighborhood')}
                        disabled={!isEditingProfile}
                      />
                    </label>
                    <label className="field-grid__full">
                      Logradouro
                      <input
                        type="text"
                        placeholder="Ex.: Rua das Palmeiras"
                        value={accountProfile.street}
                        onChange={handleAccountProfileChange('street')}
                        disabled={!isEditingProfile}
                      />
                    </label>
                    <label>
                      Número
                      <input
                        type="text"
                        placeholder="Ex.: 125"
                        value={accountProfile.addressNumber}
                        onChange={handleAccountProfileChange('addressNumber')}
                        disabled={!isEditingProfile}
                      />
                    </label>
                    <label>
                      Complemento
                      <input
                        type="text"
                        placeholder="Ex.: Sala 03"
                        value={accountProfile.complement}
                        onChange={handleAccountProfileChange('complement')}
                        disabled={!isEditingProfile}
                      />
                    </label>
                    <label>
                      Cidade
                      <div className="city-autocomplete">
                        <input
                          type="text"
                          autoComplete="off"
                          placeholder="Ex.: Joinville"
                          value={accountProfile.city}
                          onChange={handleCityFieldChange('profileCity')}
                          onFocus={() => {
                            if (isEditingProfile) {
                              setActiveCityField('profileCity');
                            }
                          }}
                          onBlur={() => {
                            window.setTimeout(() => setActiveCityField(null), 120);
                          }}
                          disabled={!isEditingProfile}
                        />
                        {isEditingProfile &&
                          activeCityField === 'profileCity' &&
                          profileCitySuggestions.length > 0 && (
                            <div className="city-autocomplete__menu">
                              {profileCitySuggestions.map((city) => (
                                <button
                                  key={`profile-${city.id}`}
                                  className="city-autocomplete__option"
                                  type="button"
                                  onMouseDown={(event) => {
                                    event.preventDefault();
                                    handleCitySelect('profileCity', city);
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
                      UF
                      <input
                        type="text"
                        placeholder="SC"
                        maxLength={2}
                        value={accountProfile.state}
                        onChange={handleAccountProfileChange('state')}
                        disabled={!isEditingProfile}
                      />
                    </label>
                  </div>
                  {(isLookingUpPostalCode || postalCodeError) && (
                    <p className="field-grid__helper">
                      {isLookingUpPostalCode
                        ? 'Buscando endereço pelo CEP...'
                        : postalCodeError}
                    </p>
                  )}
                  {(isLoadingCities || citiesError) && (
                    <p className="field-grid__helper">
                      {isLoadingCities
                        ? 'Carregando lista oficial de cidades...'
                        : `${citiesError} Você ainda pode preencher manualmente se preferir.`}
                    </p>
                  )}
                </div>

                <div className="form-block">
                  <h3>{getLinkedEntitySectionTitle(accountProfile.personType)}</h3>
                  <p className="field-grid__helper">
                    {accountProfile.personType === 'fisica'
                      ? 'Se quiser, vincule uma empresa a esta conta de pessoa física.'
                      : 'Se quiser, vincule uma pessoa física responsável a esta conta jurídica.'}
                  </p>
                  <div className="field-grid field-grid--two">
                    <label>
                      {getLinkedEntityNameLabel(accountProfile.personType)}
                      <input
                        type="text"
                        placeholder={getLinkedEntityNamePlaceholder(
                          accountProfile.personType,
                        )}
                        value={accountProfile.linkedName}
                        onChange={handleAccountProfileChange('linkedName')}
                        disabled={!isEditingProfile}
                      />
                    </label>
                    <label>
                      {getLinkedEntityDocumentLabel(accountProfile.personType)}
                      <input
                        type="text"
                        placeholder={getLinkedEntityDocumentPlaceholder(
                          accountProfile.personType,
                        )}
                        value={getLinkedEntityDocumentValue(accountProfile)}
                        onChange={handleAccountProfileChange(
                          accountProfile.personType === 'fisica'
                            ? 'linkedCnpj'
                            : 'linkedCpf',
                        )}
                        disabled={!isEditingProfile}
                      />
                    </label>
                  </div>
                </div>

                {(profileMessage || profileError) && (
                  <div className={profileFeedbackClass}>
                    {profileError || profileMessage}
                  </div>
                )}

                <div className="form-actions">
                  {isEditingProfile && (
                    <button
                      className="button button--primary"
                      type="submit"
                      disabled={isSavingProfile}
                    >
                      {isSavingProfile ? 'Salvando...' : 'Salvar alterações'}
                    </button>
                  )}
                  <button
                    className="button button--ghost"
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
                  Busque cargas de todas as contas com filtro operacional.
                </h2>
              </div>

              <form className="admin-toolbar" onSubmit={handleAdminSearch}>
                <label className="admin-toolbar__search">
                  Busca
                  <input
                    type="text"
                    placeholder="Conta, produto, cidade, UF ou tipo de veículo"
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
                          <span>Conta</span>
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

        {mapPickerTarget && (
          <div
            className="map-picker"
            role="dialog"
            aria-modal="true"
            aria-label="Selecionar ponto no mapa"
          >
            <div className="map-picker__panel">
              <div className="map-picker__header">
                <div>
                  <span>
                    {mapPickerTarget === 'pickup'
                      ? 'Local de coleta'
                      : 'Local de entrega'}
                  </span>
                  <strong>Selecione um ponto no Mapbox</strong>
                </div>
                <button
                  className="button button--ghost"
                  type="button"
                  onClick={() => setMapPickerTarget(null)}
                >
                  Fechar
                </button>
              </div>

              <form
                className="map-picker__search"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleMapSearch();
                }}
              >
                <input
                  type="text"
                  value={mapPickerQuery}
                  onChange={(event) => setMapPickerQuery(event.target.value)}
                  placeholder="Pesquise por empresa, rua, número ou cidade"
                />
                <button
                  className="button button--primary"
                  type="submit"
                  disabled={isSearchingMap || !mapPickerQuery.trim()}
                >
                  {isSearchingMap ? 'Buscando...' : 'Buscar'}
                </button>
                <p>
                  Busque um endereço ou clique diretamente no mapa. O endereço
                  da carga será preenchido automaticamente.
                </p>
              </form>

              {mapPickerResults.length > 0 && (
                <div className="map-picker__results">
                  {mapPickerResults.map((feature) => (
                    <button
                      key={feature.id}
                      className="map-picker__result"
                      type="button"
                      onClick={() => handleMapResultSelect(feature)}
                    >
                      <strong>{feature.text || feature.place_name}</strong>
                      <span>{feature.place_name}</span>
                    </button>
                  ))}
                </div>
              )}

              {mapPickerError && (
                <div className="form-feedback form-feedback--error">
                  {mapPickerError}
                </div>
              )}

              <div ref={mapPickerElementRef} className="map-picker__canvas" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

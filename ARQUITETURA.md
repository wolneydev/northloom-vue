# Arquitetura do Projeto — Frontend Vue (Northloom)

> Documento de apresentação e passagem de conhecimento.
> Objetivo: explicar **todas as decisões arquiteturais**, mostrar **onde** cada
> decisão vive no código e percorrer um **fluxo completo** ponta a ponta.

---

## 1. Visão geral

Aplicação **SPA (Single Page Application)** de gestão de **projetos e tarefas**
(com calendário, usuários e autenticação), construída em **Vue 3** consumindo
uma API **Laravel**.

A arquitetura foi desenhada sobre três pilares:

1. **Organização por módulos de feature** (não por tipo de arquivo).
2. **Separação em camadas** dentro de cada módulo: `pages/components` →
   `store` → `service` → `httpClient`.
3. **Núcleo (`core/`) reutilizável e desacoplado**: HTTP, roteamento, store raiz
   e configuração.

```
View (Vue SFC)  →  Store (Vuex)  →  Service (axios wrapper)  →  HTTP Client  →  API Laravel
     ▲                  │
     └──── getters ─────┘  (estado reativo volta para a tela)
```

A regra de ouro: **cada camada só conversa com a camada imediatamente abaixo**.
A View nunca chama `axios` direto; o Service nunca conhece o componente.

---

## 2. Stack tecnológica

| Tecnologia | Papel | Decisão |
|---|---|---|
| **Vue 3** (`<script setup>`) | Framework de UI | Composition API com SFCs |
| **Vite 6** | Build/dev server | Velocidade + alias `@` |
| **Vue Router 4** | Roteamento SPA | Rotas por módulo + guards |
| **Vuex 4** | Gerência de estado | Módulos namespaced |
| **Axios** | Cliente HTTP | Instância única + interceptors |
| **Vitest + Vue Test Utils** | Testes automatizados | Domínio, contratos, stores e componentes |
| **FullCalendar** | Calendário de tarefas | Visualização de agenda |
| **Lodash** | Utilitários | Helpers pontuais |

> Observação: o `package.json` traz `pinia` instalado, mas o estado em uso hoje é
> **Vuex** (`src/core/store/index.js`). Pinia está disponível como caminho de
> evolução futura, porém não é a fonte de verdade atual.

---

## 3. Estrutura de pastas (decisão: feature-based modular)

```
src/
├── main.js                  # Bootstrap da aplicação
├── App.vue                  # Shell/layout raiz (header + <router-view>)
├── assets/main.css          # Design system (variáveis CSS / paleta Northloom)
│
├── core/                    # Núcleo transversal, sem regra de negócio
│   ├── config/env.js        # Configuração centralizada (env vars)
│   ├── http/
│   │   ├── httpClient.js     # Instância axios + interceptors
│   │   └── httpError.js      # Normalização de erros (HttpError)
│   ├── router/index.js      # Router raiz + guards globais
│   └── store/index.js       # Store raiz (registra módulos Vuex)
│
└── modules/                 # Uma pasta por domínio/feature
    ├── auth/
    ├── dashboard/
    ├── users/
    └── planning/            # Projetos + Tarefas + Calendário
```

Cada módulo segue o **mesmo esqueleto interno**, o que torna o projeto previsível:

```
modules/<feature>/
├── pages/        # Telas (rotas)
├── components/   # Componentes reutilizáveis da feature
├── routes/       # Definição das rotas do módulo
├── services/     # Camada de transporte (chama a API)
├── store/        # Módulo Vuex namespaced (estado)
└── types/        # Tipos de domínio, constantes e mappers
```

**Por que assim?** Escalabilidade e coesão: tudo que diz respeito a "planning"
está em `modules/planning`. Adicionar uma feature = criar uma pasta nova, sem
tocar nas existentes. Remover uma feature = apagar a pasta.

---

## 4. Decisões arquiteturais — mapa rápido (decisão → arquivo)

| # | Decisão arquitetural | Arquivo |
|---|---|---|
| 1 | Alias `@` para `src/` | `vite.config.js` |
| 2 | Configuração centralizada por env vars | `src/core/config/env.js` |
| 3 | Cliente HTTP único com interceptors | `src/core/http/httpClient.js` |
| 4 | Normalização de erros em `HttpError` | `src/core/http/httpError.js` |
| 5 | Injeção da store no HTTP (evita import circular) | `src/main.js` + `httpClient.js` |
| 6 | Bootstrap com "silent login" antes de montar | `src/main.js` |
| 7 | Store raiz agregando módulos namespaced | `src/core/store/index.js` |
| 8 | Rotas compostas por módulo + guards globais | `src/core/router/index.js` |
| 9 | Lazy-loading de páginas | `modules/*/routes/*.routes.js` |
| 10 | Token em memória + cookie HTTP-only (segurança) | `modules/auth/store/auth.store.js` |
| 11 | Camada de Service como "transport layer" fino | `modules/*/services/*.service.js` |
| 12 | Tipos/constantes/mappers de domínio centralizados | `modules/planning/types/planning.types.js` |
| 13 | View desacoplada via getters/dispatch | `modules/planning/pages/CalendarPage.vue` |
| 14 | Sugestão de criação (read-only) no fluxo de novo projeto/tarefa | `modules/planning/services/creationIdeas.service.js` |

---

## 5. As camadas em detalhe

### 5.1. Configuração e build

**Alias `@`** evita imports relativos frágeis (`../../../`).

```8:12:vite.config.js
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
```

**Configuração centralizada**: nenhum arquivo lê `import.meta.env` espalhado; tudo
passa por `env`, com defaults seguros.

```3:8:src/core/config/env.js
export const env = {
  apiBaseUrl:
    import.meta.env.VITE_API_BASE_URL || 'https://imitative-verline-quintuply.ngrok-free.dev/api',
  // Default timeout for HTTP requests, in milliseconds.
  apiTimeout: Number(import.meta.env.VITE_API_TIMEOUT || 15000),
}
```

> As variáveis ficam no `.env` (prefixo obrigatório `VITE_`). Veja `.env.example`.

---

### 5.2. Camada HTTP (o coração transversal)

Existe **uma única instância** de axios para toda a aplicação. Toda chamada herda
`baseURL`, `timeout`, headers e — crucialmente — `withCredentials: true`, que
permite o envio/recebimento do **cookie HTTP-only** de autenticação.

```21:33:src/core/http/httpClient.js
const httpClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: env.apiTimeout,
  // Required so the browser sends/receives the HTTP-only auth cookie set by
  // the Laravel backend (see the backend snippet shared in the chat).
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    // Skips the ngrok-free.dev HTML interstitial so API calls return JSON.
    'ngrok-skip-browser-warning': 'true',
  },
})
```

**Interceptor de request** — injeta o token de acesso (Bearer) quando ele está
em memória na sessão atual:

```40:49:src/core/http/httpClient.js
httpClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)
```

**Interceptor de response** — duas responsabilidades: (a) deslogar
automaticamente quando uma rota protegida retorna **401**; (b) **normalizar** o
erro antes de propagar.

```52:66:src/core/http/httpClient.js
httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const status = error.response?.status

    // A 401 on a protected endpoint means the session is no longer valid:
    // drop the in-memory auth state so the UI reflects a logged-out user.
    if (status === 401 && originalRequest && !isAuthBypass(originalRequest.url) && store) {
      await store.dispatch('auth/forceLogout')
    }

    return Promise.reject(normalizeHttpError(error))
  },
)
```

> **Detalhe importante:** `/login` e `/logout` são exceções (`AUTH_BYPASS_PATHS`).
> Um 401 ali significa "credencial errada", não "sessão expirada" — então não
> forçamos logout.

**Decisão anti-import-circular:** a store **não** é importada aqui (isso criaria
`store → service → httpClient → store`). Em vez disso, ela é *injetada* no
bootstrap:

```7:13:src/core/http/httpClient.js
let store = null

export const registerStore = (injectedStore) => {
  store = injectedStore
}

const getAccessToken = () => store?.getters?.['auth/accessToken'] ?? null
```

**Normalização de erros** — qualquer falha de axios vira um `HttpError` previsível
com `message`, `status`, `data`. A UI nunca precisa entender as entranhas do axios.

```13:24:src/core/http/httpError.js
export const normalizeHttpError = (error) => {
  if (error instanceof HttpError) return error

  // The server responded with a non-2xx status.
  if (error.response) {
    const { status, data } = error.response
    const message =
      data?.message ||
      data?.error ||
      `Request failed with status ${status}.`
    return new HttpError(message, { status, data, original: error })
  }
```

---

### 5.3. Bootstrap da aplicação

O `main.js` orquestra a inicialização **antes** de montar a tela. Isso garante
que o primeiro render já reflita o estado de autenticação correto (sem
"piscar" a tela de login para um usuário logado).

```10:23:src/main.js
registerStore(store)

const bootstrap = async () => {
  // Attempt a silent login using the HTTP-only refresh cookie before mounting,
  // so the first render already reflects the resolved authentication state.
  await store.dispatch('auth/initialize')

  const app = createApp(App)
  app.use(store)
  app.use(router)
  app.mount('#app')
}

bootstrap()
```

---

### 5.4. Estado: store raiz + módulos namespaced

A store raiz apenas **agrega** os módulos de cada feature. Cada módulo é
`namespaced`, então o acesso é sempre `feature/algo`.

```9:16:src/core/store/index.js
const store = createStore({
  modules: {
    auth,
    users,
    projects,
    tasks,
    funds,
    costs,
    allocations,
    telegram,
  },
})
```

**Padrão de cada módulo Vuex** (state factory → getters → mutations → actions):
- `state` é uma **função** (evita estado compartilhado entre instâncias).
- **getters** = leitura derivada (a View nunca lê `state` cru).
- **mutations** = única forma de alterar estado (síncrono).
- **actions** = orquestram service + commits (assíncrono).

Exemplo do módulo `tasks` — note como a action busca via service e comita o
resultado, mantendo flags de `loading`/`error`:

```61:80:src/modules/planning/store/tasks.store.js
  async fetchTasks({ commit, state }) {
    if (!state.range.start || !state.range.end) return
    commit('SET_LOADING', true)
    commit('SET_ERROR', null)
    try {
      const result = await tasksService.list({
        start: state.range.start,
        end: state.range.end,
        projectId: state.filters.projectId,
        status: state.filters.status,
        priority: state.filters.priority,
      })
      const items = Array.isArray(result) ? result : result?.items ?? []
      commit('SET_TASKS', items)
    } catch (err) {
      commit('SET_ERROR', err.message || 'Error loading tasks.')
    } finally {
      commit('SET_LOADING', false)
    }
  },
```

**Decisão de "single source of truth" entre módulos:** o módulo `tasks` resolve o
nome do projeto consultando o getter do módulo `projects` (via `rootGetters`),
em vez de duplicar dados:

```23:26:src/modules/planning/store/tasks.store.js
  calendarEvents: (state, _getters, _rootState, rootGetters) => {
    const projectNames = rootGetters['projects/projectNames'] ?? {}
    return state.tasks.map((task) => taskToCalendarEvent(task, projectNames))
  },
```

---

### 5.5. Camada de Service (transport layer)

Os services são **finos e sem lógica de UI/estado**. Apenas mapeiam funções para
endpoints e ajustam o *shape* do payload. Toda a documentação do contrato da API
fica aqui, junto ao código.

```33:45:src/modules/planning/services/tasks.service.js
export const tasksService = {
  async list({ start, end, projectId = '', status = '', priority = '' } = {}) {
    const { data } = await httpClient.get('/tasks', {
      params: cleanParams({
        start,
        end,
        project_id: projectId,
        status,
        priority,
      }),
    })
    return unwrap(data)
  },
```

Duas convenções recorrentes na camada de service:

- **`unwrap`**: o Laravel costuma embrulhar em `{ data: ... }`; desembrulhamos de
  forma defensiva para o resto do app sempre receber o modelo "limpo".
- **`cleanParams` / `toPayload`**: limpeza de filtros vazios e coerção de campos
  opcionais ao formato esperado pela API.

```13:25:src/modules/planning/services/tasks.service.js
const toPayload = (task) => ({
  project_id: task.project_id,
  title: task.title,
  task_date: task.task_date,
  starts_at: task.starts_at,
  ends_at: task.ends_at || null,
  notes: task.notes || null,
  location: task.location || null,
  priority: task.priority || null,
  status: task.status || 'pending',
  notify: !!task.notify,
  notify_minutes_before: task.notify ? task.notify_minutes_before ?? null : null,
})
```

---

### 5.6. Tipos e domínio centralizados

Como o projeto é **JS puro**, os "tipos" são expressos via **JSDoc** + constantes
de runtime + **mappers**. Isso dá uma única fonte de verdade compartilhada por
services, stores e componentes (catálogos de status/prioridade, cores, helpers de
data e o mapper para o calendário).

```52:57:src/modules/planning/types/planning.types.js
export const TASK_STATUSES = [
  { value: 'pending', label: 'Pending', color: '#c9a86a', soft: '#f6eed9' },
  { value: 'in_progress', label: 'In progress', color: '#b86b4b', soft: '#f7eae1' },
  { value: 'completed', label: 'Completed', color: '#6e8b7b', soft: '#e9efea' },
  { value: 'cancelled', label: 'Cancelled', color: '#b25a52', soft: '#f7e7e4' },
]
```

O mapper `taskToCalendarEvent` traduz a Task (shape da API) para o evento que o
FullCalendar entende — a cor vem do status, a prioridade vira `className`:

```128:146:src/modules/planning/types/planning.types.js
export const taskToCalendarEvent = (task, projectNames = {}) => {
  const status = getStatusMeta(task.status)
  const projectName =
    projectNames instanceof Map
      ? projectNames.get(task.project_id)
      : projectNames[task.project_id]

  return {
    id: String(task.id),
    title: task.title,
    start: combineDateTime(task.task_date, task.starts_at),
    end: task.ends_at ? combineDateTime(task.task_date, task.ends_at) : null,
    backgroundColor: status.color,
    borderColor: status.color,
    textColor: '#fffdf9',
    classNames: [
      `task-status--${task.status}`,
      task.priority ? `task-priority--${task.priority}` : 'task-priority--none',
    ],
```

---

### 5.7. Roteamento

As rotas são **contribuídas por cada módulo** e apenas mescladas no router raiz —
mantém o roteamento descentralizado e coeso com cada feature.

```9:15:src/core/router/index.js
const routes = [...authRoutes, ...dashboardRoutes, ...usersRoutes, ...planningRoutes]

const router = createRouter({
  history: createWebHistory(),
  routes,
})
```

**Lazy-loading**: cada página é importada sob demanda (`() => import(...)`),
gerando chunks separados e acelerando o carregamento inicial.

```1:4:src/modules/planning/routes/planning.routes.js
const ProjectListPage = () => import('@/modules/planning/pages/ProjectListPage.vue')
const ProjectFormPage = () => import('@/modules/planning/pages/ProjectFormPage.vue')
const ProjectDetailPage = () => import('@/modules/planning/pages/ProjectDetailPage.vue')
const CalendarPage = () => import('@/modules/planning/pages/CalendarPage.vue')
```

**Guard global de autenticação** — usa `meta.requiresAuth` / `meta.guestOnly` e
espera o "silent login" terminar antes de decidir:

```17:34:src/core/router/index.js
router.beforeEach(async (to) => {
  // Wait for the silent-refresh bootstrap so guards see the resolved auth state.
  if (store.getters['auth/isInitializing']) {
    await store.dispatch('auth/initialize')
  }

  const isLoggedIn = store.getters['auth/isLoggedIn']

  if (to.meta.requiresAuth && !isLoggedIn) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }

  if (to.meta.guestOnly && isLoggedIn) {
    return { name: 'Dashboard' }
  }

  return true
})
```

As rotas declaram suas exigências via `meta` — exemplo no dashboard:

```4:9:src/modules/dashboard/routes/dashboard.routes.js
  {
    path: '/',
    name: 'Dashboard',
    component: DashboardPage,
    meta: { requiresAuth: true },
  },
```

---

### 5.8. Camada de View (pages e components)

As páginas usam `<script setup>` e conversam com a store **só** via
`getters` (leitura reativa) e `dispatch` (ações). Nenhuma chamada HTTP aqui.

```57:71:src/modules/planning/pages/CalendarPage.vue
const store = useStore()

const statuses = TASK_STATUSES
const projects = computed(() => store.getters['projects/allProjects'])
const events = computed(() => store.getters['tasks/calendarEvents'])
const loading = computed(() => store.getters['tasks/isLoading'])
const taskError = computed(() => store.getters['tasks/taskError'])

const filters = ref({ ...store.getters['tasks/filters'] })

const modalOpen = ref(false)
const selectedTask = ref(null)
const prefill = ref({})

onMounted(() => store.dispatch('projects/fetchProjects'))
```

A comunicação entre componentes filhos e a página é via **props + eventos**
(`@range-change`, `@date-select`, `@event-select`), mantendo os componentes
"burros" e reutilizáveis:

```29:35:src/modules/planning/pages/CalendarPage.vue
      <TaskCalendar
        :events="events"
        @range-change="onRangeChange"
        @date-select="openCreate"
        @event-select="openEdit"
      />
```

---

## 6. Modelo de segurança da autenticação (decisão de destaque)

Esta é uma das decisões mais importantes do projeto. A estratégia está documentada
diretamente no `auth.store.js`:

```3:18:src/modules/auth/store/auth.store.js
// Security model:
// - The access token (JWT) is held ONLY in memory (Vuex state) for the current
//   session. It is never written to localStorage/sessionStorage, so it cannot be
//   exfiltrated from persistent storage via XSS and disappears when the tab closes.
// - For persistence across reloads, the Laravel backend sets the token in an
//   HTTP-only, Secure cookie that JavaScript cannot read. Requests are sent with
//   `withCredentials: true`, so the cookie authenticates them automatically.
// - Because of that, `isLoggedIn` is derived from the loaded user (which is
//   available both right after login and after a cookie-based session restore),
//   not from the in-memory token.
const state = () => ({
  accessToken: null,
  user: null,
  // True until the initial cookie-based session restore completes on app boot.
  initializing: true,
})
```

**Resumindo a decisão:**

| Aspecto | Escolha | Por quê |
|---|---|---|
| Token JWT | Só em memória (Vuex) | Imune a roubo via localStorage/XSS persistente |
| Persistência entre reloads | Cookie **HTTP-only + Secure** (backend) | JS não consegue ler → mais seguro |
| Envio do cookie | `withCredentials: true` | Autenticação automática nas requisições |
| `isLoggedIn` | Derivado do **user**, não do token | Funciona tanto pós-login quanto pós-restore por cookie |

As actions de auth cobrem todo o ciclo de vida da sessão:

```62:88:src/modules/auth/store/auth.store.js
  // Attempt a silent session restore on app boot using the HTTP-only cookie.
  async initialize({ commit }) {
    commit('SET_INITIALIZING', true)
    try {
      const user = await authService.me()
      commit('SET_USER', user)
    } catch {
      // No valid session — stay logged out. This is expected for guests.
      commit('CLEAR_AUTH')
    } finally {
      commit('SET_INITIALIZING', false)
    }
  },

  // User-initiated logout: tell the server to invalidate the cookie, then clear.
  async logout({ commit }) {
    try {
      await authService.logout()
    } finally {
      commit('CLEAR_AUTH')
    }
  },

  // Forced logout triggered when a request returns 401 (session expired).
  forceLogout({ commit }) {
    commit('CLEAR_AUTH')
  },
```

---

## 7. Fluxos completos ponta a ponta

### 7.1. Fluxo de boot + restauração de sessão

```
1. main.js → registerStore(store)        [injeta store no httpClient]
2. main.js → dispatch('auth/initialize') [silent login]
3. auth.store.initialize → authService.me() → GET /user (cookie HTTP-only viaja junto)
4a. Sucesso → SET_USER(user)  → isLoggedIn = true
4b. Falha (401) → CLEAR_AUTH  → segue como visitante
5. main.js monta o app (createApp → use(store) → use(router) → mount)
6. router.beforeEach valida meta.requiresAuth/guestOnly com o estado já resolvido
```

**Arquivos envolvidos:** `src/main.js` → `auth.store.js` → `auth.service.js` →
`httpClient.js` → `router/index.js`.

### 7.2. Fluxo de Login

```
LoginPage.vue (submit)
   └─ dispatch('auth/login', { email, password })
        └─ authService.login() → POST /login
             └─ httpClient (request interceptor: ainda sem token)
                   └─ resposta { access_token, user } + Set-Cookie (HTTP-only)
        └─ commit SET_ACCESS_TOKEN + SET_USER
   └─ router.push(redirect || '/')
```

A página só dispara a action e trata erro/redirect — sem lógica de transporte:

```46:58:src/modules/auth/pages/LoginPage.vue
const doLogin = async () => {
  errorMessage.value = ''
  submitting.value = true
  try {
    await store.dispatch('auth/login', { email: email.value, password: password.value })
    const redirect = route.query.redirect || '/'
    router.push(redirect)
  } catch (err) {
    errorMessage.value = err.message || 'Sign-in failed.'
  } finally {
    submitting.value = false
  }
}
```

A action comita o token (memória) e o user:

```44:49:src/modules/auth/store/auth.store.js
  async login({ commit }, credentials) {
    const data = await authService.login(credentials)
    commit('SET_ACCESS_TOKEN', data.access_token ?? null)
    commit('SET_USER', data.user ?? null)
    return data
  },
```

### 7.3. Fluxo de listar/criar tarefa (CRUD representativo)

```
CalendarPage.vue
   ├─ onMounted → dispatch('projects/fetchProjects')   [carrega projetos p/ labels]
   ├─ TaskCalendar @range-change → dispatch('tasks/setRange', range)
   │       └─ commit SET_RANGE → dispatch('fetchTasks')
   │             └─ tasksService.list() → GET /tasks?start&end&filtros
   │                   └─ httpClient (request interceptor injeta Bearer)
   │             └─ commit SET_TASKS
   │   getter calendarEvents → mapeia via taskToCalendarEvent (+ projectNames)
   │   → events (computed) re-renderiza o calendário automaticamente
   │
   └─ TaskFormModal @saved → dispatch('tasks/createTask' | 'updateTask')
           └─ tasksService.create/update → POST/PUT /tasks
           └─ dispatch('fetchTasks')  [re-sincroniza a lista]
```

Note a decisão de **re-sincronizar após cada mutação** (em vez de manter cache
otimista complexo): toda escrita chama `fetchTasks` de novo, garantindo
consistência com o servidor de forma simples:

```92:100:src/modules/planning/store/tasks.store.js
  async createTask({ commit, dispatch }, payload) {
    commit('SET_SAVING', true)
    try {
      await tasksService.create(payload)
      await dispatch('fetchTasks')
    } finally {
      commit('SET_SAVING', false)
    }
  },
```

### 7.4. Fluxo de expiração de sessão (401 automático)

```
Qualquer service → httpClient → API responde 401 (rota protegida)
   └─ response interceptor detecta 401 (e não é /login|/logout)
        └─ dispatch('auth/forceLogout') → CLEAR_AUTH
   └─ normalizeHttpError → rejeita com HttpError
   → App.vue (isLoggedIn = false) atualiza o header; próxima navegação cai no guard → Login
```

### 7.5. Fluxos financeiros de projeto e tarefa

Fundos, custos e alocações pertencem ao módulo `planning`, mas possuem stores e
services separados para que loading, erro e mutation pending não se bloqueiem:

```
ProjectFundsPage / ProjectCostsPage / TaskFinancePage
   → funds | costs | allocations (Vuex namespaced)
      → funds.service | costs.service | allocations.service
         → httpClient → API Laravel autenticada
```

Contratos e regras principais:

- `Project.currency` (ISO 4217) is optional. When set, it is the source of truth
  for finance formatting. When unset, fund/cost screens keep asking the user to
  configure it. Optional `Project.hours` is a non-negative effort estimate shown
  on the project detail view.
- Valores monetários atravessam a API como strings decimais; validação e comparação
  usam minor units em `BigInt`, nunca aritmética de ponto flutuante.
- `incurred_on` é uma data civil `YYYY-MM-DD` sem conversão de fuso.
- `recorded_at` é um timestamp ISO exibido no fuso local do usuário.
- Custos são independentes e nunca alteram saldos de fundos.
- Uma alocação aceita é seguida por refetch dos fundos e do histórico da tarefa.
- Saldo insuficiente é identificado por `error.data.code === "INSUFFICIENT_FUNDS"`;
  a API deve validar saldo e criar a alocação atomicamente.
- Views não importam Axios/`httpClient`; toda escrita segue
  `component → store action → service → shared client`.

Rotas protegidas e lazy-loaded:

- `/projects/:projectId/funds`
- `/projects/:projectId/costs`
- `/projects/:projectId/tasks/:taskId/finance`

Os contratos de integração completos estão em
`specs/001-project-finances/contracts/project-finances.openapi.yaml`.

### 7.6. Fluxo de ideia de criação (projeto e tarefa)

Abrir o formulário **não** persiste projeto, tarefa nem a própria sugestão.
A ideia é só leitura; criar continua nos POSTs já existentes.

```
ProjectFormPage (create) / TaskFormModal (create)
   → dispatch('creationIdeas/fetchIdea', { target, projectId? })
        → creationIdeasService.get() → GET /api/creation-ideas
        → mapCreationIdea (headline → name/title, suggestion → notes)
   → usuário edita, ou "Sugerir outra ideia" (outro GET, sem POST)
   → dispatch('projects/createProject' | 'tasks/createTask')
        → POST /api/projects | create de tarefa já existente
```

Telas de edição não disparam `fetchIdea`. Falha ao carregar a ideia deixa o
formulário usável. `403` em ideia de tarefa (projeto de outro dono) impede o
submit. O relógio (`at`) não aparece na UI.

---

## 8. Padrões e convenções (cheat sheet para a equipe)

- **Adicionar uma feature nova:** crie `modules/<feature>/` com
  `pages/ components/ routes/ services/ store/ types/`, registre o store em
  `core/store/index.js` e as rotas em `core/router/index.js`.
- **Nunca** chame `axios`/`httpClient` direto de um componente — passe por
  `service` (transporte) e `store` (estado).
- **Leitura de estado** na View sempre via `getters`; **escrita** sempre via
  `dispatch` de actions (que comitam mutations).
- **Mutations são síncronas**; toda chamada assíncrona vive em **actions**.
- **Erros**: capture `err.message` (já normalizado por `HttpError`) e exiba na UI.
- **Contrato da API** fica documentado no topo de cada `*.service.js`.
- **Constantes/labels/cores de domínio** ficam em `types/*.types.js`, nunca
  hardcoded em componentes.

---

## 9. Pontos de atenção / evolução futura

- **Vuex vs Pinia:** o projeto usa Vuex; Pinia está nas dependências como possível
  migração futura (Pinia é o padrão recomendado para Vue 3).
- **Validação de formulários** hoje é manual (`fieldErrors` no `TaskFormModal`);
  poderia ser padronizada com uma lib (ex.: VeeValidate/Zod).
- **Testes automatizados:** Vitest + Vue Test Utils cobrem configuração, helpers
  financeiros, contratos de services, stores, componentes e limites arquiteturais.
- **`env.apiBaseUrl`** tem um default apontando para um túnel ngrok; em produção
  deve sempre vir do `.env`.

---

## 10. Resumo para a apresentação (1 slide)

> O frontend é uma SPA Vue 3 organizada **por features** (`modules/`) sobre um
> **núcleo** transversal (`core/`). Cada feature respeita as mesmas **4 camadas**:
> View → Store (Vuex namespaced) → Service (axios) → HTTP Client único. A
> **segurança de auth** combina token em memória + cookie HTTP-only, com
> logout automático em 401 via interceptor. Rotas e estado são **modulares e
> plugáveis**, tornando o projeto previsível e fácil de escalar.

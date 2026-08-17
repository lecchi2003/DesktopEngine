# Desktop Engine V0.6 - Documentação Oficial

O **Desktop Engine** é um micro-framework focado no desenvolvimento ágil de sistemas corporativos baseados no conceito de **Desktop in Browser** (Janelas flutuantes, arrastáveis e redimensionáveis). Construído exclusivamente com Vanilla JavaScript puro e ES Modules nativos, **sem nenhuma dependência externa ou passos de compilação/build** (sem Webpack, sem Vite, sem Node em runtime).

---

## 💡 Filosofia do Motor
1. **Zero Build & Zero Config:** Código puro executado direto no navegador através de módulos nativos.
2. **Reatividade Nativa por Proxies:** O estado (`state`) de cada janela é empacotado em um Proxy (`core.js`). Ao alterar qualquer propriedade, a interface reage e re-renderiza preservando o foco dos campos de entrada.
3. **Componentização Funcional Pura:** Componentes em `ui.js` são funções puras que retornam elementos DOM com estilizações corporativas consistentes.

---

## 🚀 Executando o Projeto

Por utilizar ES Modules nativos (`import`/`export`), os navegadores bloqueiam requisições via protocolo `file:///`.
Para rodar localmente:
- **No Windows:** Dê dois cliques em **`server.bat`** na pasta raiz. Ele abrirá um servidor local na porta `8000`. Acesse `http://localhost:8000`.
- **Via Terminal:** Execute `npx serve .` ou `python -m http.server 8000`.

**Páginas de Demonstração Incluídas:**
- **`index.html`:** Layout moderno com **MenuBar superior** (estilo macOS) e taskbar de janelas.
- **`index2.html`:** Layout clássico com **Menu Iniciar na Taskbar** (estilo Windows).
- **`index-direct.html`:** **Padrão 1** — Criação Direta (Inline Objects & Multi-Instâncias / Post-its).
- **`index-lazy.html`:** **Padrão 2** — Screen Registry & Lazy Loading Modular (`/screens/*.js`).
- **`index-factory.html`:** **Padrão 3** — Factory Functions & Geradores de Telas Parametrizadas (CRUD Generator, BI KPIs).
- **`index-class.html`:** **Padrão 4** — Orientação a Objetos com Classes ES6 (`class Screen extends BaseScreen`).
- **`index-template.html`:** **Padrão 5** — Templates HTML Estáticos & Strings (Template Literals e tags `<template>`).
- **`docs.html`:** Documentação Completa e Interativa de Referência de Componentes e APIs.

---

## 🖥️ Inicialização do Desktop

No arquivo principal (`index.html`), o ambiente desktop é inicializado com as configurações de taskbar e containers:

```javascript
import { Desktop } from './desktop.js';

Desktop.init({
    windowsContainerId: "windows",       // Container onde as janelas são criadas
    taskbarContainerId: "taskWindows",   // Container da barra de tarefas
    taskbarPosition: "bottom",           // "bottom", "top", "left" ou "right"
    showDesktopButton: true              // Botão para minimizar/restaurar tudo
});

// Métodos Globais Úteis:
Desktop.showDesktop();                   // Minimiza todas ou restaura as janelas
Desktop.arrangeWindows();                // Organiza janelas abertas em grade simétrica
Desktop.notify("Operação concluída!", "success"); // Notificação global ("success", "danger", "info")
```

---

## 🪟 Anatomia de uma Tela (Windows)

Uma tela no DesktopEngine é criada declarativamente através de um objeto com configurações de janela, estado reativo, ações e view:

```javascript
import { Framework } from './core.js';
import { Desktop } from './desktop.js';
import { Input, Button, createElement } from './ui.js';

const MinhaJanela = {
    title: "Cadastro de Usuário",
    icon: "👤",
    width: 450,
    height: 320,
    minWidth: 300,
    minHeight: 200,
    singleInstance: true,  // Se true, foca na janela já aberta ao invés de clonar
    resizable: true,       // Permite puxar pelas bordas para redimensionar
    minimizable: true,     // Exibe botão de minimizar
    maximizable: true,     // Exibe botão de maximizar
    status: "Pronto",      // Texto inicial da barra de status inferior
    
    // 1. Estado Reativo Inicial
    state: {
        nome: ""
    },
    
    // 2. Actions (Middlewares Assíncronos)
    actions: {
        salvar: [async (ctx) => {
            if (!ctx.state.nome) {
                Desktop.notify("Preencha o nome!", "danger");
                return;
            }
            ctx.instance.setStatus("Salvando...");
            ctx.instance.setTitle(`Usuário: ${ctx.state.nome}`);
            Desktop.notify(`Usuário ${ctx.state.nome} cadastrado!`, "success");
            ctx.instance.setStatus("Pronto");
        }]
    },
    
    // 3. View (Retorna os nós DOM)
    view() {
        return createElement("div", "p-3", [
            Input({ label: "Nome do Usuário", bind: "nome", placeholder: "Ex: Maria Silva", instance: this }),
            createElement("br", "", []),
            Button({ text: "Salvar Dados", onClick: "salvar", instance: this, variant: "primary" })
        ]);
    }
};

// Abrindo no Desktop:
Desktop.open(Framework.createWindow(MinhaJanela, "ID_UNICO_JANELA", Desktop));
```

---

## 🗂️ Padrões e Formas de Criação de Telas

O DesktopEngine suporta múltiplos paradigmas de desenvolvimento. Existem **5 formas principais de se criar telas**:

### 1. Padrão Direto / Inline Objects (`index-direct.html`)
Objetos literais declarados no próprio script e instanciados via `Desktop.open(Framework.createWindow(config, id, Desktop))`. Suporta janelas *Single-Instance* e *Multi-Instance* (múltiplos post-its ou anotações com IDs dinâmicos `nota_${Date.now()}`):

```javascript
import { Framework } from './core.js';
import { Desktop } from './desktop.js';
import { Input, createElement } from './ui.js';

const PostItScreen = {
    title: "Nota Rápida",
    icon: "📝",
    width: 320,
    height: 240,
    singleInstance: false, // Permite abrir múltiplas cópias simultâneas!
    state: { texto: "" },
    view() {
        return createElement("div", "p-2", [
            Input({ bind: "texto", instance: this, placeholder: "Digite sua nota..." })
        ]);
    }
};

Desktop.open(Framework.createWindow(PostItScreen, `nota_${Date.now()}`, Desktop));
```

### 2. Padrão Modular com Lazy Loading (`index-lazy.html`)
Para sistemas corporativos de grande porte. Cada tela reside em seu arquivo em `/screens/` e é importada sob demanda via Dynamic Imports nativos:

```javascript
// screens/UsuariosScreen.js
import { Input, Button, Card } from '../ui.js';

export default {
    title: "Gestão de Usuários",
    icon: "👥",
    width: 600,
    height: 400,
    singleInstance: true,
    state: { nome: "" },
    view() {
        return Card({
            title: "Usuário",
            children: [
                Input({ label: "Nome", bind: "nome", instance: this }),
                Button({ text: "Salvar", onClick: "salvar", instance: this, variant: "primary" })
            ]
        });
    }
};

// No index.html:
Desktop.registerScreens({
    "usuarios": () => import('./screens/UsuariosScreen.js'),
    "financeiro": () => import('./screens/FinanceiroScreen.js')
});

// Abertura programática com injeção de parâmetros iniciais:
Desktop.openScreen("usuarios", { nome: "Maria Silva" });
```

### 3. Padrão Factory Functions / Geradores de Telas (`index-factory.html`)
Funções geradoras parametrizadas que produzem telas de CRUD completas, relatórios analíticos de BI ou visualizadores em poucas linhas de código:

```javascript
function createCrudScreen({ entityName, title, columns, fields, initialData = [] }) {
    return {
        title: title || `Gestão de ${entityName}`,
        icon: "📁",
        width: 750,
        height: 520,
        singleInstance: true,
        state: { records: [...initialData], ...initialFields(fields) },
        actions: { /* Salvar, editar, excluir padronizados */ },
        view() { /* Renderiza formulário e tabela a partir do schema */ }
    };
}

const ClientesScreen = createCrudScreen({
    entityName: "Cliente",
    columns: [{ key: "nome", label: "Razão Social" }, { key: "email", label: "E-mail" }],
    fields: [{ label: "Nome", bind: "nome" }, { label: "E-mail", bind: "email", type: "email" }]
});

Desktop.open(Framework.createWindow(ClientesScreen, "crud_clientes", Desktop));
```

### 4. Padrão Orientado a Objetos com Classes ES6 (`index-class.html`)
Encapsulamento com herança de `BaseScreen`. Métodos `action_nome` viram ações da tela e hooks `onMount()` e `onDestroy()` controlam o ciclo de vida:

```javascript
class SystemMonitorScreen extends BaseScreen {
    constructor() {
        super({
            title: "Monitor do Servidor",
            icon: "📈",
            width: 600,
            height: 400,
            state: { cpu: 20, ram: 50 }
        });
    }

    onMount() {
        this.timer = setInterval(() => {
            this.state.cpu = Math.floor(Math.random() * 80);
            this.setStatus(`Atualizado às ${new Date().toLocaleTimeString()}`);
        }, 1000);
    }

    onDestroy() {
        clearInterval(this.timer);
    }

    async action_limpar(ctx) {
        this.notify("Dados limpos!", "info");
    }

    render() {
        return Card({
            title: "Recursos em Uso",
            children: [
                ProgressBar({ value: this.state.cpu, max: 100 }),
                Button({ text: "Limpar", onClick: "limpar", instance: this.instance })
            ]
        });
    }
}

new SystemMonitorScreen().open("monitor_sys");
```

### 5. Padrão Templates HTML Estáticos & Strings (`index-template.html`)
Desenvolvimento com marcação HTML pura, Template Strings ou tags `<template id="...">` nativas no DOM com bindings reativos:

```javascript
const CalculadoraScreen = {
    title: "Calculadora de Empréstimo",
    icon: "🧮",
    width: 500,
    height: 400,
    state: { valor: 1000, taxa: 2 },
    view() {
        const div = document.createElement("div");
        div.className = "p-3";
        div.innerHTML = `
            <div class="ui-card">
                <label>Valor Principal (R$):</label>
                <input type="number" class="ui-input inp-val" value="${this.state.valor}" />
                <h3>Total Calculado: R$ ${(this.state.valor * (1 + this.state.taxa/100)).toFixed(2)}</h3>
            </div>
        `;
        div.querySelector(".inp-val").oninput = (e) => {
            this.state.valor = parseFloat(e.target.value) || 0;
        };
        return div;
    }
};

Desktop.open(Framework.createWindow(CalculadoraScreen, "calc_win", Desktop));
```

---

## ⚙️ Middlewares nas Actions (Padrão Koa / Express)

As `actions` aceitam uma esteira de funções assíncronas no formato `(ctx, next)`. Chamar `await next()` avança a execução; não chamar interrompe a esteira.

```javascript
// Middleware Reutilizável de Validação
export const ValidarCampos = (campos) => async (ctx, next) => {
    for (let campo of campos) {
        if (!ctx.state[campo]) {
            Desktop.notify(`O campo "${campo}" é obrigatório!`, "danger");
            return; // Interrompe a esteira
        }
    }
    await next(); // Passou no teste, avança para a próxima função
};

// Uso na Janela:
actions: {
    enviarFormulario: [
        ValidarCampos(["nome", "email"]), // 1. Valida antes
        async (ctx) => {                  // 2. Executa se validado
            Desktop.notify("Enviado com sucesso!", "success");
        }
    ]
}
```

---

## 📚 Catálogo Completo de Componentes (`ui.js`)

Todos os componentes aceitam composição direta e utilizam classes CSS corporativas nativas.

### 1. Primitivas de Layout & Utilitários
- `createElement(tag, className, children)`: Fábrica base de nós DOM.
- `printElement(element, options)`: Clona um elemento para um iframe isolado e dispara a impressão nativa.
- `Row({ children, style })`: Linha flexível (`display: flex`).
- `Col({ children, style })`: Coluna flexível expansível (`flex: 1`).
- `Grid({ children, columns })`: Grade CSS com colunas configuráveis (padrão: 2).
- `Card({ title, children })`: Painel com sombra e borda arredondada.
- `Form({ fields, actions })`: Agrupador de campos e botões de ação.
- `Tabs({ tabs, instance, activeTabBind })`: Sistema de abas conectado ao `state`.

```javascript
Tabs({
    activeTabBind: "abaAtiva",
    instance: this,
    tabs: [
        { id: "geral", label: "Geral", view: () => createElement("div", "p-3", ["Conteúdo Geral"]) },
        { id: "seguranca", label: "Segurança", view: () => createElement("div", "p-3", ["Configurações de Segurança"]) }
    ]
})
```

---

### 2. Formulários & Inputs (Two-Way Data Binding)

#### `Input` e `Textarea`
```javascript
Input({ label: "Nome", bind: "nome", placeholder: "Ex: João", instance: this })
Textarea({ label: "Observações", bind: "obs", rows: 4, instance: this })
```

#### `Select`
```javascript
Select({
    label: "Perfil",
    bind: "perfil",
    instance: this,
    options: [
        { label: "Administrador", value: "admin" },
        { label: "Usuário", value: "user" }
    ]
})
```

#### `Button`
```javascript
Button({ text: "Excluir", onClick: "excluirItem", variant: "danger", instance: this })
// Variants: "primary", "secondary", "danger", "success"
```

#### `Checkbox` e `Toggle`
```javascript
Checkbox({ label: "Manter conectado", bind: "lembrar", instance: this })
Toggle({ label: "Modo Escuro", bind: "darkTheme", instance: this })
```

#### `Slider` (Range Contínuo)
```javascript
Slider({ label: "Volume", bind: "vol", min: 0, max: 100, step: 1, instance: this })
```

#### `RadioGroup`
```javascript
RadioGroup({
    label: "Gênero",
    bind: "genero",
    layout: "horizontal", // "horizontal" ou "vertical"
    instance: this,
    options: [
        { label: "Masculino", value: "M" },
        { label: "Feminino", value: "F" }
    ]
})
```

#### `Autocomplete` (Com Chips Múltiplos)
```javascript
Autocomplete({
    label: "Tecnologias",
    bind: "techs",
    multiple: true, // Gera tags/chips removíveis e gerencia um Array no state
    options: ["JavaScript", "Python", "Rust", "Go", "TypeScript"],
    instance: this
})
```

---

### 3. Visualização de Dados

#### `Table` (Simples com Custom Render)
```javascript
Table({
    columns: [
        { key: "id", label: "#" },
        { key: "nome", label: "Produto" },
        { key: "status", label: "Status", render: (val) => Badge({ text: val, variant: val === "OK" ? "success" : "danger" }) }
    ],
    data: [ { id: 1, nome: "Servidor Cloud", status: "OK" } ]
})
```

#### `DataGrid` (Ordenação, Filtros e Paginação)
O componente definitivo para coleções de dados. Suporta ordenação ao clicar no cabeçalho, caixas de filtro com retenção de foco e paginação Client-Side ou Server-Side.

```javascript
DataGrid({
    bindData: "usuarios", // Array de objetos no instance.state
    itemsPerPage: 5,      // Quantidade de registros por página
    instance: this,
    columns: [
        { key: "id", label: "ID", sortable: true },
        { key: "nome", label: "Nome", sortable: true, filterable: true },
        { key: "email", label: "E-mail", filterable: true },
        { key: "status", label: "Situação", render: (val) => Badge({ text: val }) }
    ]
})
```

#### `TreeView` (Árvores Hierárquicas)
```javascript
TreeView({
    data: [
        { label: "Arquivos", children: [{ label: "Doc1.pdf" }, { label: "Planilha.xlsx" }] }
    ],
    onSelect: (node) => console.log("Selecionado:", node.label)
})
```

#### `DraggableList` (Drag and Drop Nativo)
```javascript
DraggableList({
    bindItems: "tarefas",
    instance: this,
    onReorder: (novaLista) => console.log("Ordem alterada:", novaLista)
})
```

#### `WebView` (Iframe Reativo)
```javascript
WebView({ bindUrl: "urlAtual", instance: this, height: "400px" })
```

---

### 4. Feedback & Status
- `Alert({ text, variant })`: Avisos nas variantes `info`, `success`, `warning`, `error`.
- `Spinner({ size, color })`: Ícone de carregamento giratório contínuo.
- `Toast({ message, type, duration })`: Notificações flutuantes (`success`, `info`, `error`).
- `Badge({ text, variant })`: Tags visuais coloridas.
- `ProgressBar({ value, max })`: Barra de preenchimento percentual.
- `Skeleton({ width, height, shape })`: Indicador de placeholder durante carregamentos.

---

### 5. Navegação & Overlays

#### `Accordion` (Painéis Sanfona)
```javascript
Accordion({
    instance: this,
    items: [
        { title: "Seção 1", content: "Texto explicativo..." },
        { title: "Seção 2", content: () => createElement("button", "", ["Clique Aqui"]) }
    ]
})
```

#### `Drawer` (Menu de Contexto Flutuante)
Por padrão, **isola o menu e a sombra dentro dos limites da janela**:
```javascript
Drawer({
    bind: "menuAberto",
    side: "left", // "left" ou "right"
    instance: this,
    // targetContainer: document.getElementById("app"), // Opcional: define escopo global
    content: [ createElement("h3", "", ["Opções Rápidas"]) ]
})
```

#### `Modal` (Diálogos Isolados ou Globais)
```javascript
// 1. Modal Local (Cobre apenas a janela atual):
Modal({
    title: "Confirmação",
    instance: this,
    children: [
        createElement("p", "", ["Deseja salvar as alterações?"]),
        Button({ text: "Sim", onClick: "salvarTudo", instance: this })
    ]
});

// 2. Modal Global (Cobre todo o DesktopEngine):
Modal({
    title: "Alerta Crítico",
    instance: this,
    targetContainer: document.getElementById("app"),
    children: [ createElement("p", "", ["Manutenção do servidor agendada."]) ]
});
```

#### `Breadcrumbs` & `Stepper`
```javascript
Breadcrumbs({ items: [{ label: "Home", action: () => {} }, { label: "Módulos" }] })
Stepper({ steps: ["Passo 1", "Passo 2", "Finalizar"], currentStep: 0 })
```

#### `Carousel` (Esteira Magnética com Posições Customizadas)
```javascript
Carousel({
    height: "150px",
    controlsPosition: "bottom-center", // "side", "top-left/center/right", "bottom-left/center/right"
    prevControl: Button({ text: "◀ Anterior" }),
    nextControl: Button({ text: "Próximo ▶" }),
    items: [
        createElement("div", "p-3", ["Slide A"]),
        createElement("div", "p-3", ["Slide B"])
    ]
})
```

#### `Avatar` & `Tooltip`
```javascript
Tooltip({
    position: "top",
    content: "Administrador Online",
    children: Avatar({ initials: "AD", status: "online", size: 40 })
})
```

---

### 6. Menus Globais e ContextMenu

#### `MenuBar` & `StartMenu`
```javascript
const estruturaMenus = [
    {
        label: "Arquivo",
        items: [
            { label: "Nova Janela", action: () => Desktop.open(MinhaJanela) },
            "separator",
            { label: "Fechar Tudo", action: () => Desktop.showDesktop() }
        ]
    }
];

// Estilo macOS / Linux / Personalizado ("top", "bottom", "left", "right"):
MenuBar({
    containerId: "menubar",
    position: "top", // Se a Taskbar também estiver no topo, a Taskbar fica acima e o MenuBar logo abaixo!
    menus: estruturaMenus
});

// Estilo Windows (Menu Iniciar na Barra de Tarefas):
StartMenu({ buttonId: "btnStart", menus: estruturaMenus });
```

#### `ContextMenu` & `bindContextMenu`
```javascript
bindContextMenu(meuElemento, [
    { label: "Copiar", action: () => console.log("Copiado") },
    { label: "Excluir", action: () => meuElemento.remove() }
]);
```

---

## 🎨 Sistema de Temas e Schema de Paletas de Cores

O DesktopEngine possui um motor completo de alternância de paletas com persistência automática no `localStorage`.

### API de Temas no `Desktop`
```javascript
import { Desktop } from './desktop.js';

// 1. Alterar tema
Desktop.setTheme("dark"); // "light", "dark", "midnight", "emerald", "nord"

// 2. Alternar entre Light e Dark rapidamente
Desktop.toggleTheme();

// 3. Obter o tema ativo
console.log(Desktop.getTheme());

// 4. Registrar uma Paleta Customizada
Desktop.registerPalette("synthwave", {
    "--bg-primary": "#241734",
    "--bg-secondary": "#2e1f47",
    "--text-primary": "#f92aad",
    "--text-secondary": "#00f0ff",
    "--win-bg": "rgba(36, 23, 52, 0.9)",
    "--win-border": "rgba(0, 240, 255, 0.3)",
    "--title-bg-start": "#f92aad",
    "--title-bg-end": "#7b2cbf",
    "--btn-primary": "#00f0ff",
    "--btn-primary-hover": "#00c4d1",
    "--btn-primary-text": "#241734"
});
```

### Paletas Nativas Disponíveis
- **`light` (Azul Corporativo):** Padrão institucional de alto contraste.
- **`dark` (Slate Dark):** Fundo grafite moderno com realces em índigo.
- **`midnight` (Cyber Navy):** Tons de azul escuro profundo com roxo.
- **`emerald` (Fintech):** Tons verdes esmeralda para dashboards e finanças.
- **`nord` (Frost):** Paleta fria e minimalista inspirada no design ártico.
- **`contrast` (Alto Contraste):** O visual clássico retrô Windows de acessibilidade (fundo preto absoluto, bordas ciano/amarelo e barra magenta).

---

## 📖 Visualizando a Documentação Interativa

Para navegar pelo manual visual com menu lateral expansível e tabelas de consulta rápida:
👉 Abra o arquivo **`docs.html`** no seu navegador.

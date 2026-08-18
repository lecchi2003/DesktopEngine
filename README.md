# Desktop Engine V1.0 - Documentação Oficial

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

## ⏱️ Ciclo de Vida das Janelas (Lifecycle Hooks)

Toda janela no DesktopEngine possui um ciclo de vida estruturado em **4 fases** com pontos de gancho (*hooks*) que permitem inicializar configurações, reagir a alterações de dados, monitorar o foco e estado da janela e realizar limpeza de memória ou interceptar o fechamento:

### Tabela de Hooks Disponíveis
| Hook / Método | Fase | Descrição & Assinatura |
|---|---|---|
| `beforeMount()` | Montagem | Executado **antes** do primeiro `render()` da janela. Ideal para inicializar dados pré-DOM. |
| `onMount()` | Montagem | Executado logo após a janela ser inserida fisicamente no DOM. Ideal para requisições `fetch()`, timers e gráficos. |
| `beforeUpdate(prop, new, old)` | Reatividade | Executado imediatamente antes do DOM da janela ser atualizado por uma alteração no `state`. |
| `onUpdate()` | Reatividade | Executado logo após o novo DOM da janela ser reconstruído. |
| `onFocus()` | Janela | Disparado quando a janela ganha foco e passa para o primeiro plano. |
| `onBlur()` | Janela | Disparado quando o foco é transferido para outra janela. |
| `onMinimize()` | Janela | Disparado quando a janela é minimizada para a barra de tarefas. |
| `onRestore()` | Janela | Disparado quando a janela é restaurada da barra de tarefas. |
| `onMaximize(isMax)` | Janela | Disparado ao maximizar (`true`) ou restaurar o tamanho normal (`false`). |
| `onResize(width, height)` | Janela | Disparado ao redimensionar a janela pelas alças. |
| `onMove(x, y)` | Janela | Disparado ao arrastar a janela pela barra de título. |
| `beforeClose()` | Destruição | Executado antes de fechar. Se retornar `false` ou uma `Promise<false>`, o fechamento é **cancelado**. |
| `onDestroy()` | Destruição | Executado após a janela ser removida do DOM. Ideal para limpar `clearInterval` e ouvintes. |

```javascript
export default {
    title: "Exemplo Completo com Todos os Hooks",
    icon: "⏱️",
    width: 600,
    height: 450,
    state: {
        contador: 0,
        timerId: null,
        temAlteracoesPendentes: true
    },

    // 1. ANTES DA MONTAGEM (Pré-DOM)
    beforeMount() {
        console.log("1. [beforeMount] Inicializando configurações antes do primeiro render().");
    },

    // 2. APÓS A MONTAGEM (Inserido no DOM)
    onMount() {
        console.log("2. [onMount] Janela inserida no DOM. Iniciando timer.");
        this.state.timerId = setInterval(() => {
            this.state.contador++;
        }, 1000);
        this.setStatus("Monitor ativo.");
    },

    // 3. ANTES DA RE-RENDERIZAÇÃO
    beforeUpdate(prop, newValue, oldValue) {
        console.log(`3. [beforeUpdate] Propriedade '${prop}' mudando de '${oldValue}' para '${newValue}'.`);
    },

    // 4. APÓS A RE-RENDERIZAÇÃO DO DOM
    onUpdate() {
        console.log("4. [onUpdate] Novo DOM reconstruído e aplicado com sucesso.");
    },

    // 5. GANHO DE FOCO
    onFocus() {
        console.log("5. [onFocus] Janela ganhou o foco e veio para frente.");
        this.setStatus("Janela em primeiro plano.");
    },

    // 6. PERDA DE FOCO
    onBlur() {
        console.log("6. [onBlur] Janela perdeu o foco.");
        this.setStatus("Janela em segundo plano.");
    },

    // 7. MINIMIZAR
    onMinimize() {
        console.log("7. [onMinimize] Janela minimizada para a barra de tarefas.");
    },

    // 8. RESTAURAR
    onRestore() {
        console.log("8. [onRestore] Janela restaurada.");
    },

    // 9. MAXIMIZAR / DESMAXIMIZAR
    onMaximize(isMaximized) {
        console.log(`9. [onMaximize] Janela ${isMaximized ? "maximizada" : "restaurada ao tamanho original"}.`);
    },

    // 10. REDIMENSIONAR
    onResize(width, height) {
        console.log(`10. [onResize] Novas dimensões: ${width}x${height}px.`);
    },

    // 11. ARRASTAR / MOVER
    onMove(x, y) {
        console.log(`11. [onMove] Nova posição: X=${x}px, Y=${y}px.`);
    },

    // 12. INTERCEPTADOR DE FECHAMENTO (Antes de Destruir)
    async beforeClose() {
        if (this.state.temAlteracoesPendentes) {
            // Pode retornar false ou uma Promise<boolean> para cancelar o fechamento
            return await Modal.confirm("Você tem dados não salvos. Deseja realmente fechar?");
        }
        return true; // Permite fechar
    },

    // 13. DESTRUIÇÃO E LIMPEZA DE MEMÓRIA (Pós-Remoção)
    onDestroy() {
        console.log("13. [onDestroy] Janela destruída. Limpando timers e liberando memória.");
        clearInterval(this.state.timerId);
    },

    view() {
        return createElement("div", "flex-col", [
            Card({
                title: "Painel de Demonstração dos Hooks",
                children: [
                    createElement("p", "", [`Contador Reativo: ${this.state.contador}`]),
                    Button({
                        text: "Incrementar Manualmente",
                        variant: "primary",
                        onClick: () => this.state.contador++
                    })
                ]
            })
        ]);
    }
};
```

---

## 📚 Catálogo Completo de Componentes (`ui.js`)

Todos os componentes aceitam composição direta e utilizam classes CSS corporativas nativas.

### 1. Primitivas de Layout & Utilitários
- `createElement(tag, [children])` / `createElement(tag, className, [children])` / `createElement(tag, props, [children])`: Fábrica de nós DOM polimórfica com suporte a arrays de filhos diretos, classes, atributos, estilos e listeners.
- `printElement(element, options)`: Clona um elemento para um iframe isolado e dispara a impressão nativa.
- `Row({ children, style })`: Linha flexível (`display: flex`).
- `Col({ children, style })`: Coluna flexível expansível (`flex: 1`).
- `Grid({ children, columns })`: Grade CSS com colunas configuráveis (padrão: 2).
- `Card({ title, children })`: Painel com sombra e borda arredondada.
- `Form({ fields, actions })`: Agrupador de campos e botões de ação.
- `Tabs({ tabs, instance, activeTabBind })`: Sistema de abas conectado ao `state`.

```javascript
// Exemplos de criação com createElement:
const el1 = createElement("div", [createElement("h2", "Título")]); // Filhos direto sem ""
const el2 = createElement("div", "card-header", [createElement("span", "Badge")]); // Com classe
const el3 = createElement("button", { className: "btn", onclick: () => {} }, ["Salvar"]); // Com props/eventos
const el4 = createElement("hr"); // Tag vazia simples
```

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
    closable: true, // Padrão: true. Se false, oculta o 'X' superior
    children: [
        createElement("p", "", ["Deseja salvar as alterações?"]),
        Button({ text: "Sim", onClick: "salvarTudo", instance: this })
    ]
});

// 2. Modal Global Sem Botão 'X' e com Interceptador beforeClose:
Modal({
    title: "Alerta Crítico",
    instance: this,
    showCloseButton: false, // Oculta o 'X' e desativa a tecla ESC
    targetContainer: document.getElementById("app"),
    async beforeClose() {
        // Pode validar ou bloquear o fechamento retornando false
        return true;
    },
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

#### `MenuBar` & `StartMenu` (Menus Globais)
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

#### `MenuBar em Janelas (Window MenuBar)`
Além da barra de menus global do Desktop, qualquer janela pode possuir sua **própria barra de menus dedicada (Window MenuBar)** posicionada imediatamente abaixo da titlebar, exatamente como nos aplicativos nativos (VS Code, Notepad, navegadores e suites de escritório).
 
Suporta ícones visuais (`icon`), atalhos de teclado alinhados à direita (`shortcut`), submenus aninhados multinível com **inversão automática de lado (Smart Flip)** para nunca transbordar a tela, **ajuste vertical inteligente com rolagem automática** para listas extensas, desabilitação condicional (`disabled`) e injeção automática do contexto da instância da janela `(instance, event)` nas ações.

##### 1. Declaração Declarativa na Configuração da Tela
```javascript
// screens/EditorScreen.js
import { Toast, Modal, createElement } from '../ui.js';

export default {
    title: "Editor de Documentos",
    icon: "📝",
    width: 800,
    height: 500,
    state: { conteudo: "Texto inicial..." },
    menubar: [
        {
            label: "Arquivo",
            icon: "📁",
            items: [
                {
                    label: "Novo Documento",
                    icon: "📄",
                    shortcut: "Ctrl+N",
                    action: (instance) => {
                        instance.state.conteudo = "";
                        instance.setStatus("Novo documento criado.");
                        Toast({ message: "Novo documento iniciado!", type: "info" });
                    }
                },
                {
                    label: "Salvar",
                    icon: "💾",
                    shortcut: "Ctrl+S",
                    action: (instance) => {
                        instance.setStatus("Salvo às " + new Date().toLocaleTimeString());
                        Toast({ message: "Documento salvo!", type: "success" });
                    }
                },
                "separator",
                {
                    label: "Fechar Janela",
                    icon: "❌",
                    shortcut: "Alt+F4",
                    action: (instance) => instance.close()
                }
            ]
        },
        {
            label: "Editar",
            icon: "✏️",
            items: [
                {
                    label: "Inserir Data e Hora",
                    icon: "🕒",
                    action: (instance) => {
                        instance.state.conteudo += `\n[${new Date().toLocaleString()}]`;
                    }
                },
                {
                    label: "Limpar",
                    icon: "🗑️",
                    action: (instance) => {
                        instance.state.conteudo = "";
                    }
                }
            ]
        },
        {
            label: "Janela",
            icon: "🗖",
            items: [
                { label: "Maximizar", action: (instance) => instance.maximize() },
                { label: "Minimizar", action: (instance) => instance.minimize() }
            ]
        }
    ],
    view() {
        return createElement("div", "flex-col", [
            // seu conteúdo aqui...
        ]);
    }
};
```

##### 2. Manipulação Dinâmica em Tempo de Execução via API da Instância
```javascript
// Dentro de qualquer view() ou action:
// 1. Atualizar com novos menus
this.setMenuBar([
    {
        label: "Modo Foco",
        icon: "🎯",
        items: [
            { label: "Restaurar Menus Padrão", action: (inst) => inst.setMenuBar(inst.config.menubar) }
        ]
    }
]);

// 2. Ocultar o MenuBar da janela
this.setMenuBar(null);

// 3. Obter o elemento DOM do MenuBar da janela
const mbEl = this.getMenuBar();
```

##### 3. Propriedades dos Itens do Menu
| Propriedade | Tipo | Descrição |
| :--- | :--- | :--- |
| `label` | `String` | Texto exibido na opção do menu. |
| `icon` | `String` | Ícone / emoji exibido à esquerda (ex: `"💾"`, `"📁"`). |
| `shortcut` | `String` | Dica de atalho de teclado exibida à direita (ex: `"Ctrl+S"`, `"Alt+F4"`). |
| `action` | `Function` | Função executada ao clicar: `(instance, event) => { ... }`. |
| `screen` | `String` | ID de tela registrada no `Desktop.registerScreens` para abrir automaticamente. |
| `props` | `Object` | Props iniciais passadas para a tela quando `screen` for informada. |
| `items` | `Array` | Submenus em cascata (suporta separadores `"separator"` e novos níveis). |
| `disabled` | `Boolean \| Function` | Desabilita visual e funcionalmente a opção se for `true` ou `(instance) => boolean`. |

##### 4. Métodos de Controle Auxiliares da Janela
Toda instância de janela expõe métodos diretos e convenientes para controle:
- `instance.openDialog(config, props)`: Abre uma janela modal filha acoplada e bloqueando a janela atual, retornando uma `Promise` com o resultado.
- `instance.openChildWindow(config, props)`: Alias para `openDialog`.
- `instance.setMenuBar(menus)`: Atualiza ou remove a barra de menus da janela.
- `instance.getMenuBar()`: Retorna o elemento HTML da barra de menus da janela.
- `instance.close(dados)`: Fecha a janela atual (e devolve `dados` para quem abriu via `openDialog`).
- `instance.minimize()`: Minimiza a janela para a taskbar.
- `instance.maximize()`: Alterna entre maximizada e restaurada.
- `instance.restore()`: Restaura a janela se estiver minimizada.
- `instance.focus()`: Traz a janela para o primeiro plano.

---

## 🪟 Janelas Modais Filhas (Dialogs / Sub-Windows)

O DesktopEngine suporta nativamente o clássico padrão de **Janelas Modais Filhas (Child Modal Windows)**. Uma janela mãe pode abrir uma janela filha que é posicionada centralizada sobre ela, bloqueando exclusivamente a janela mãe com uma camada de desfoque (*frosted glass*) enquanto as demais janelas do sistema continuam ativas.

### 1. Padrão de Diálogo com Retorno Assíncrono (`await openDialog`)
Ao chamar `await this.openDialog(config)`, a execução na janela mãe pausa de forma assíncrona até que o usuário feche a janela filha chamando `this.close(dados)`, devolvendo o valor diretamente para a variável local da janela mãe:

```javascript
// Dentro da Janela Mãe (this é a instância da janela mãe):
const usuarioSelecionado = await this.openDialog({
    title: "Selecionar Usuário",
    icon: "👤",
    width: 440,
    height: 320,
    state: {
        lista: ["Carlos Silva", "Mariana Costa", "Rafael Dias"],
        selecionado: "Carlos Silva"
    },
    view() {
        return createElement("div", "flex-col", [
            createElement("p", "", ["Escolha o usuário para vincular:"]),
            Select({ bind: "selecionado", options: this.state.lista, instance: this }),
            Row({
                style: "justify-content: flex-end; gap: 8px; margin-top: auto;",
                children: [
                    Button({
                        text: "Cancelar",
                        onClick: () => this.close(null) // Fecha sem valor
                    }),
                    Button({
                        text: "Confirmar Seleção",
                        variant: "primary",
                        onClick: () => this.close(this.state.selecionado) // Fecha e devolve o valor!
                    })
                ]
            })
        ]);
    }
});

if (usuarioSelecionado) {
    console.log("Usuário recebido da janela filha:", usuarioSelecionado);
}
```

### 2. Modos de Exibição: Confinada vs Flutuante
Você pode controlar se a janela filha deve se movimentar livremente pelo desktop ou ficar restrita ao contorno físico da janela mãe:
- `contained: true`: A janela filha é renderizada **dentro do espaço da janela pai** e seu arrasto fica estritamente confinado aos limites da janela mãe (estilo MDI Clássico).
- `contained: false` (Padrão): A janela filha flutua livremente pelo Desktop, mas mantém o bloqueio modal e foco vinculados à janela mãe.
- `closable: false` / `showCloseButton: false`: Oculta o botão `X` da barra de título, forçando o usuário a interagir com os botões de ação internos.

### 3. Ciclo de Vida Vinculado (Parent-Child)
- **Bloqueio Inteligente:** Clicar na janela mãe bloqueada faz a janela filha piscar (*blink effect*) para alertar o usuário.
- **Minimização Conjunta:** Minimizar ou restaurar a janela mãe minimiza e restaura automaticamente a janela filha modal.
- **Fechamento em Cascata:** Fechar a janela mãe destrói automaticamente as janelas filhas vinculadas.
- **Abertura via Screen Registry:** Também é possível abrir pelo ID registrado: `const dados = await this.openDialog("seletor_usuario", { role: "admin" });`

---

#### `ContextMenu` & `bindContextMenu`
```javascript
bindContextMenu(meuElemento, [
    { label: "Copiar", action: () => console.log("Copiado") },
    { label: "Excluir", action: () => meuElemento.remove() }
]);
```

---

## 🌐 Integração com APIs REST & Backend

O **DesktopEngine** é 100% agnóstico a backends e linguagens de servidor. Toda janela ou componente do framework pode se comunicar de forma assíncrona com APIs RESTful (Node.js, Python, Java, Go, PHP, C#/.NET, etc.) utilizando a Web API padrão `fetch()`, autenticação por cabeçalhos (Bearer JWT, Basic Auth, API Key) e reatividade automática.

### 1. Padrão Arquitetural: Estado Reativo para Consumo de APIs
Recomenda-se centralizar o estado de comunicação (dados, indicador de carregamento, erros e paginação) no `state` da janela:

```javascript
import { createElement, Table, Button, Spinner, Toast, Modal } from './ui.js';

export default {
    title: "Gestão Corporativa (Consumo de API)",
    icon: "🌐",
    width: 880,
    height: 560,
    state: {
        items: [],
        isLoading: false,
        authToken: "Basic " + btoa("usuario:senha123"), // Ou Bearer JWT
        searchQuery: "",
        apiUrl: "https://api.empresa.com/v1"
    },

    onMount() {
        // Disparado assim que a janela é criada e anexada ao DOM
        this.fetchData();
    },

    async fetchData() {
        this.state.isLoading = true;
        this.setStatus("Carregando dados da API...");

        try {
            const url = `${this.state.apiUrl}/recursos?q=${encodeURIComponent(this.state.searchQuery)}`;
            const res = await fetch(url, {
                headers: {
                    "Authorization": this.state.authToken,
                    "Content-Type": "application/json"
                }
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}: Falha na requisição`);

            const json = await res.json();
            this.state.items = json.data || json;
            this.setStatus(`${this.state.items.length} registros carregados.`);
        } catch (err) {
            console.error("Erro na API:", err);
            this.setStatus("Erro na conexão com a API.");
            Toast({ message: "Erro ao comunicar com o servidor: " + err.message, type: "error" });
        } finally {
            this.state.isLoading = false;
        }
    },

    async createItem(dados) {
        try {
            const res = await fetch(`${this.state.apiUrl}/recursos`, {
                method: "POST",
                headers: {
                    "Authorization": this.state.authToken,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(dados)
            });

            if (!res.ok) throw new Error("Erro no cadastro");
            Toast({ message: "Item criado com sucesso!", type: "success" });
            this.fetchData(); // Recarrega a listagem
        } catch (err) {
            Toast({ message: err.message, type: "error" });
        }
    },

    view() {
        if (this.state.isLoading) {
            return createElement("div", "flex-center", [
                Spinner({ size: "32px" }),
                createElement("p", "", ["Consultando servidor remoto..."])
            ]);
        }

        return createElement("div", "flex-col", [
            Table({
                columns: [
                    { label: "ID", key: "id" },
                    { label: "Título", key: "title" },
                    { label: "Status", key: "status" }
                ],
                data: this.state.items
            })
        ]);
    }
};
```

### 2. Boas Práticas na Integração com Serviços
- **Preservação de Foco na Digitação:** Ao vincular campos de busca ou filtros a inputs, o DesktopEngine utiliza `instance._setSilentState()` para atualizar o estado sem destruir os elementos DOM ativos durante a digitação.
- **Orquestração com Actions & Middlewares:** Para fluxos com validações encadeadas, use `actions: { salvar: [validarForm, enviarApi, logAuditoria] }`.
- **Tratamento de Autenticação 401:** Intercepte respostas de status `401 Unauthorized` para abrir dinamicamente um `Modal()` de login ou renovação de token sem fechar a janela do usuário.

---

## 📊 Processamento em Segundo Plano & Multitarefa (Background Tasks & Web Workers)

O DesktopEngine foi desenvolvido para permitir **multitarefa real entre janelas**. Uma janela pode executar relatórios demorados, processamento massivo de planilhas ou cálculos pesados de Big Data em segundo plano enquanto o usuário utiliza outras janelas (como editores, cadastros e gráficos) com **60 FPS fluidos** e zero travamento na interface.

### 1. Padrão Web Worker (Thread de CPU Dedicada)
Para processamento matemático pesado ou parsing de arquivos gigantescos no navegador, utilize um `Web Worker`. O processamento roda em um núcleo de CPU separado da thread de renderização da interface:

```javascript
// Dentro da Janela de Relatórios:
export default {
    title: "Gerador de Relatórios",
    state: { progresso: 0, isProcessando: false, worker: null },

    iniciarCalculoPesado(totalLinhas = 100000) {
        this.state.isProcessando = true;

        // Cria o Worker inline (ou a partir de um arquivo .js)
        const workerCode = `
            self.onmessage = function(e) {
                const total = e.data.total;
                for (let i = 0; i < total; i++) {
                    // Cálculo pesado...
                    if (i % 1000 === 0) {
                        self.postMessage({ progresso: Math.floor((i / total) * 100) });
                    }
                }
                self.postMessage({ progresso: 100, concluido: true });
            };
        `;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        this.state.worker = new Worker(URL.createObjectURL(blob));

        this.state.worker.onmessage = (e) => {
            this.state.progresso = e.data.progresso;
            if (e.data.concluido) {
                this.state.isProcessando = false;
                Desktop.notify("📊 Relatório processado com sucesso!", "success");
            }
        };

        this.state.worker.postMessage({ total: totalLinhas });
    },

    onDestroy() {
        // Limpa a thread do Worker ao fechar a janela para liberar memória
        if (this.state.worker) this.state.worker.terminate();
    },

    view() {
        return createElement("div", "flex-col", [
            ProgressBar({ value: this.state.progresso, max: 100 }),
            Button({
                text: this.state.isProcessando ? "Calculando..." : "Iniciar Geração",
                disabled: this.state.isProcessando,
                onClick: () => this.iniciarCalculoPesado()
            })
        ]);
    }
};
```

### 2. Padrão Async Stream / Chunking (Requisições em Lotes)
Quando a geração do relatório consome dados de APIs remotas, utilize `async/await` com divisão em lotes (*chunking*). O Event Loop do navegador atualiza a barra de progresso e mantém a responsividade das demais janelas:

```javascript
async gerarRelatorioAsync(lotes = 10) {
    this.state.isProcessando = true;
    for (let i = 1; i <= lotes; i++) {
        await new Promise(r => setTimeout(r, 400)); // Simula requisição assíncrona
        this.state.progresso = (i / lotes) * 100;
    }
    this.state.isProcessando = false;
    Desktop.notify("Relatório concluído!", "success");
}
```

---

## 🎭 Sistema de Look and Feel (L&F / OS Skins)

O DesktopEngine possui um subsistema nativo e modular de **Look and Feel (L&F)** que permite transformar completamente a arquitetura visual, disposição dos botões de controle de janela, tipografia, cantos e molduras do ambiente desktop em tempo de execução.

> [!TIP]
> **Ortogonalidade:** O *Look and Feel* (estrutura da carcaça do SO via atributo `data-laf`) é independente da *Paleta de Cores* (cores e tons via atributo `data-theme`). Você pode combinar livremente qualquer Look and Feel com qualquer Tema (ex: macOS no tema Midnight Cyber, Windows 98 em Alto Contraste, ou Java Metal no tema Slate Dark).

### API de Look and Feel no `Desktop`
```javascript
import { Desktop } from './desktop.js';

// 1. Aplicar um Look and Feel nativo
Desktop.setLookAndFeel("macos"); // ou "win11", "win98", "beos", "java-metal", etc.

// 2. Voltar ao Look and Feel padrão
Desktop.setLookAndFeel("default");

// 3. Obter o Look and Feel ativo no momento
const lafAtual = Desktop.getLookAndFeel(); // Ex: "macos"

// 4. Obter catálogo completo com metadados (id, label, icon, category, desc)
const catalogo = Desktop.getAvailableLookAndFeels();

// 5. Escutar eventos de alteração de Look and Feel
EventBus.on("laf:change", (lafName) => {
    console.log("Look and Feel alterado para:", lafName);
});
```

### Catálogo dos 34 Look and Feels Disponíveis

| Categoria | Identificador | Nome / Sistema | Destaques Estruturais e Visuais |
| :--- | :--- | :--- | :--- |
| **Modernos & Mobile** | `"default"` | Padrão Moderno | Design padrão suave e limpo do DesktopEngine. |
| **Modernos & Mobile** | `"macos"` | macOS (Aqua Modern) | Botões semáforo (🔴 🟡 🟢) à **esquerda**, título centralizado e cantos de 12px. |
| **Modernos & Mobile** | `"win11"` | Windows 11 (Fluent) | Cantos arredondados de 8px, controles refinados e botão fechar com hover vermelho. |
| **Modernos & Mobile** | `"material3"` | Material You / M3 (Android) | Superfícies em camadas tonais, cantos de 20px e botões pílula (*Pill*). |
| **Modernos & Mobile** | `"cupertino"` | Cupertino (iOS 18) | Vidro fosco translúcido (*frosted glass* 28px blur), squircle de 20px e sombras suaves. |
| **Modernos & Mobile** | `"oneui"` | Samsung One UI | Cantos ultra arredondados de 24px, cabeçalhos amplos e foco ergonômico. |
| **Modernos & Mobile** | `"metro"` | Windows Metro (Flat) | Design 100% plano, cantos retos (0px), tipografia marcante e alto contraste. |
| **Espacial & Tátil** | `"visionos"` | Apple VisionOS | Vidro espacial hiper-translúcido (35px blur), reflexos especulares finos e sombras volumétricas. |
| **Espacial & Tátil** | `"neumorphism"` | Neumorphism (Soft UI) | Superfícies esculpidas em relevo suave com luz e sombra duplas opostas. |
| **Espacial & Tátil** | `"tactical-hud"` | Tactical HUD (Cyberdeck) | Interface tática militar em âmbar/neon, cantos chanfrados em 45º e estética de ficção científica. |
| **Java PlaF** | `"java-metal"` | Java Metal (Steel Classic) | Visual clássico Java Swing com tons azul-aço, texturas e contornos de relevo. |
| **Java PlaF** | `"java-ocean"` | Java Ocean (Metal 2.0) | Gradiente metálico azul acetinado e chanfros suaves Swing. |
| **Java PlaF** | `"java-nimbus"` | Java Nimbus | Superfícies acetinadas, cantos de 4px e foco luminoso em ouro/âmbar. |
| **Java PlaF** | `"java-flatlaf"` | FlatLaf (IDE IntelliJ) | Estilo moderno de IDE profissional JetBrains/NetBeans, compacto e limpo. |
| **Java PlaF** | `"javafx-modena"` | JavaFX Modena | Estética neutra cinza, limpa e moderna do JavaFX 8+. |
| **Java PlaF** | `"javafx-caspian"` | JavaFX Caspian | Vidro escuro azulado elegante do JavaFX 2. |
| **Retrô & Clássicos** | `"beos"` | BeOS / Haiku OS | A famosa **aba amarela** no topo esquerdo da janela com botões chanfrados. |
| **Retrô & Clássicos** | `"win98"` | Windows 98 (Classic 3D) | Bordas 3D chanfradas *outset/inset*, botões clássicos cinza e barra azul. |
| **Retrô & Clássicos** | `"winxp"` | Windows XP (Luna) | Barra azul royal brilhante e botão de fechar vermelho luminoso. |
| **Retrô & Clássicos** | `"win7"` | Windows 7 (Aero Glass) | Vidro translúcido com reflexos de iluminação e botões com brilho suave. |
| **Retrô & Clássicos** | `"nextstep"` | NeXTSTEP / OpenStep | Estética monocromática em tons de cinza puro e preto com relevos 3D profundos. |
| **Retrô & Clássicos** | `"amiga"` | AmigaOS (Workbench) | Paleta retrô de alto contraste (Azul Royal, Âmbar e Preto) com pinstripes. |
| **Retrô & Clássicos** | `"mac-classic"` | Mac OS System 7 / Platinum | Pinstripes horizontais na barra, botão de fechar quadrado à esquerda. |
| **Retrô & Clássicos** | `"os2-warp"` | OS/2 Warp (IBM) | Visual corporativo azul-acinzentado com moldura chanfrada sólida. |
| **UNIX / Linux** | `"ubuntu"` | Ubuntu (Yaru) | Barra grafite com acentos em Laranja Ubuntu e botões circulares. |
| **UNIX / Linux** | `"elementary"` | Elementary OS (Pantheon) | Fechar à esquerda, maximizar à direita, título centralizado e cantos de 10px. |
| **UNIX / Linux** | `"pop-cosmic"` | Pop!_OS (COSMIC) | Tema escuro moderno com acentos em Teal/Ciano e Laranja Solar (System76). |
| **UNIX / Linux** | `"i3wm"` | i3wm / Sway (Tiling) | Borda ativa fina de 1px, barra monoespacada ultra-compacta e cantos 0px. |
| **UNIX / Linux** | `"xfce"` | XFCE (Greybird) | Gradiente suave azul-acinzentado, botões leves e cantos de 4px. |
| **UNIX / Linux** | `"enlightenment"` | Enlightenment (E25) | Visual futurista em titânio escuro, relevos luminosos e curvas sci-fi. |
| **UNIX / Linux** | `"windowmaker"` | Window Maker (X11) | Gradiente diagonal clássico chanfrado preto/cinza e botões 3D com X e seta. |
| **UNIX / Linux** | `"cde-motif"` | CDE / Motif (Solaris) | Ambiente de workstation UNIX dos anos 90 com bordas sólidas e relevo. |
| **UNIX / Linux** | `"gnome"` | GNOME (Adwaita) | Headerbar espaçosa de 42px com botão de fechar circular minimalista. |
| **UNIX / Linux** | `"kde"` | KDE (Breeze) | Linhas nítidas, acentos vetoriais azuis e cantos de 4px. |
| **TUI & Sci-Fi** | `"turbovision"` | Turbo Vision (DOS TUI) | Visual de modo texto azul DOS com bordas em caracteres duplos e monospace. |
| **TUI & Sci-Fi** | `"cyberpunk"` | Cyberpunk HUD | Bordas chanfradas em 45º, linhas de grade futuristas e acentos neon. |

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

## 📱 Modo Mobile & Responsivo (Stacked Windows, Drawer & Bottom Sheet)

O **DesktopEngine** oferece suporte híbrido responsivo nativo: opera como **Desktop tradicional com janelas flutuantes livres** em telas grandes e converte-se automaticamente em uma **experiência Mobile nativa** em smartphones ou telas menores (`<= 768px` ou via classe `.mobile-mode`).

### 1. Comportamento das Janelas Empilhadas (Mobile Stack Flow)
- **Fluxo Vertical com Auto-Scroll:** As janelas deixam de ter posições absolutas (x,y) e passam a ser empilhadas verticalmente com `width: 100%` dentro do desktop com rolagem vertical suave.
- **Auto-Scroll na Criação:** Ao abrir qualquer tela (ex: `Desktop.openScreen()` ou `Desktop.createWindow()`), o desktop rola suavemente para baixo garantindo foco visual imediato na nova janela aberta.
- **Ajustes de Interação:** Handles de redimensionamento livre e arrastar de coordenadas absolutas são desativados de forma transparente no mobile para não interferir na rolagem da página.

### 2. MenuBar Mobile (Global & Window MenuBars com Hamburger & Accordion)
Em visualizações móveis, tanto a barra superior global quanto os **Window MenuBars** dentro de janelas (ex: Editor, Navegador) transformam-se em botões compactos **Hamburger (☰)**. Ao serem tocados, abrem uma **Drawer Lateral / Bottom Sheet deslizante** contendo toda a hierarquia de menus em formato de sanfona (*Accordion*) com áreas de toque confortáveis (mínimo de 44px de altura) e fechamento automático ao selecionar uma ação.

### 3. Menu de Contexto Mobile (Bottom Sheet / Action Sheet & Long-Press)
O `ContextMenu` detecta o ambiente touch/mobile e abre uma **Bottom Sheet (Folha Inferior deslizante)** com fundo escurecido (*backdrop*), opções táteis com ícones e botão de *Cancelar*. O método `bindContextMenu` inclui suporte automático a **toque prolongado (long-press de 450ms)** com vibração tátil (haptic feedback) em smartphones e tablets.

### 4. Layout Linear dos Componentes nas Janelas
Todos os containers de layout (`Row`, `Col`, `Grid`, `Form`) dentro das janelas adaptam-se para `flex-direction: column` com 100% de largura, campos de formulário ganham altura ergonômica de toque e abas/tabelas recebem rolagem horizontal fluida (touch swipe).

### 5. API de Controle do Modo Mobile
```javascript
import { Desktop } from './desktop.js';

// 1. Inicialização com modo responsivo
Desktop.init({
    responsiveMode: "auto",      // 'auto' (detecta <= 768px), 'mobile' ou 'desktop'
    mobileBreakpoint: 768        // Breakpoint em pixels para troca automática
});

// 2. Métodos e Utilitários Mobile
Desktop.isMobile();              // Retorna true se estiver no modo mobile ativo
Desktop.setMobileMode("mobile"); // Força o modo mobile (janelas empilhadas)
Desktop.setMobileMode("desktop");// Força o modo desktop (janelas flutuantes livres)
Desktop.setMobileMode("auto");   // Retorna para detecção automática por viewport
Desktop.toggleMobileMode();      // Alterna entre Desktop e Mobile instantaneamente
```

---

## 📖 Visualizando a Documentação Interativa

Para navegar pelo manual visual com menu lateral expansível e tabelas de consulta rápida:
👉 Abra o arquivo **`docs.html`** no seu navegador.


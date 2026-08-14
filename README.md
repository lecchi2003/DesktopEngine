# Desktop Engine V0.6 - Documentação Oficial

O Desktop Engine é um micro-framework focado em sistemas corporativos de Janela Única/Múltipla (Desktop in Browser) utilizando apenas Vanilla JS e ES Modules, sem passos de build.

## Executando o Projeto (Módulos ES)
Como o projeto utiliza `import`/`export` nativo do navegador, ele não rodará corretamente se você abrir o `index.html` via protocolo `file:///` no Windows/Chrome.
Para testar, criamos um atalho simples para você:
Basta clicar duas vezes em **`server.bat`** na pasta do projeto. Ele iniciará um servidor Python na porta 8000. Depois, acesse `http://localhost:8000` no seu navegador.

## Inicialização do Desktop
O desktop agora suporta configurações de inicialização para posicionar o "Taskbar" em qualquer canto da tela e ligar/desligar botões de utilidade.

```javascript
import { Desktop } from './desktop.js';

Desktop.init({
    windowsContainerId: "windows",
    taskbarContainerId: "taskWindows",
    taskbarPosition: "bottom", // Aceita: "top", "bottom", "left", "right"
    showDesktopButton: true    // Mostra/oculta o botão de minimizar tudo
});
```

A API também conta com métodos globais úteis:
- `Desktop.showDesktop()`: Minimiza todas as janelas ativas ou as restaura.
- `Desktop.arrangeWindows()`: Organiza todas as janelas abertas numa "Grade" simétrica na tela.

---

## Criando Telas (Windows)
O motor é baseado na criação declarativa de telas através de objetos JavaScript simples, com estado reativo gerenciado por Proxies.

```javascript
import { Framework } from './core.js';
import { Desktop } from './desktop.js';
import { Form, Input, Button, createElement } from './ui.js';

const MinhaTela = {
    title: "Minha Primeira Tela",
    icon: "🚀",
    width: 400,
    height: 300,
    singleInstance: true, // Se true, o framework não criará clones (reaproveitará a janela)
    resizable: false, // Bloqueia o redimensionamento da janela (padrão é true)
    minimizable: false, // Esconde o botão de minimizar e remove do menu (padrão é true)
    maximizable: false, // Esconde o botão de maximizar e remove do menu (padrão é true)
    status: "Carregando...", // Inicializa o rodapé de status (opcional)
    
    // Estado inicial (O motor torna-o reativo)
    state: { nome: "" },
    
    // Actions (Middlewares assíncronos para regras de negócio)
    actions: {
        salvar: [async (ctx, next) => {
            alert(`Salvando ${ctx.state.nome}`);
            // Você pode atualizar o rodapé dinamicamente na sua action!
            ctx.instance.setStatus("Salvo com sucesso!");
        }]
    },
    
    // View (Obrigatório, retorna elementos DOM)
    view() {
        return createElement("div", "", [
            Input({ label: "Nome", bind: "nome", instance: this }),
            Button({ text: "Salvar", onClick: "salvar", instance: this })
        ]);
    }
};

// Abrindo a tela no Desktop
Desktop.open(Framework.createWindow(MinhaTela, "ID_UNICO_DA_TELA", Desktop));
```

### 2.2 Usando Middlewares nas Actions (Validação e Regras)
A grande vantagem do `actions` no framework é o suporte a uma esteira de middlewares no estilo *Koa/Express*. A requisição flui por um array de funções, e você só invoca `next()` se quiser que o próximo passo seja executado. Isso é perfeito para criar barreiras de segurança e validação!

Você pode escrever o middleware diretamente na action (**Inline**) ou exportá-lo como uma função genérica e reutilizável (**Desacoplado**).

#### Exemplo 1: Validação Inline
```javascript
    actions: {
        salvar: [
            async (ctx, next) => {
                // Middleware 1: Validação Inline
                if (!ctx.state.nome || ctx.state.nome.length < 3) {
                    Desktop.notify("Erro: Nome muito curto!", "danger");
                    return; // Interrompe a esteira (não chama next)
                }
                await next(); // Passa no teste, chama o próximo passo
            },
            async (ctx) => {
                // Middleware 2: Execução final
                Desktop.notify(`Enviando ${ctx.state.nome} para a API...`, "success");
            }
        ]
    }
```

#### Exemplo 2: Middleware Desacoplado (Reutilizável)
Para projetos grandes, você pode criar validadores modulares e reaproveitá-los em várias telas diferentes:

```javascript
// Validadores genéricos em um arquivo utils.js
export const RequireAuth = async (ctx, next) => {
    if (!Auth.isLoggedIn) {
        Desktop.notify("Sessão expirada!", "danger");
        return;
    }
    await next();
};

export const ValidateForm = (fields) => async (ctx, next) => {
    for (let field of fields) {
        if (!ctx.state[field]) {
            Desktop.notify(`O campo ${field} é obrigatório!`, "warning");
            return;
        }
    }
    await next();
};

// ... no arquivo da sua tela:
    actions: {
        salvar: [
            RequireAuth, // Protege a ação
            ValidateForm(['nome', 'email', 'telefone']), // Valida os campos do state
            async (ctx) => {
                // Só executa se passar pelo RequireAuth e pelo ValidateForm!
                api.post('/users', ctx.state);
            }
        ]
    }
```

---

## Catálogo de Componentes (ui.js)

### Primitivas de Layout
- `Row({ children, style })`: Cria uma linha flexível (`display: flex`).
- `Col({ children, style })`: Cria uma coluna expansível (`flex: 1`).
- `Grid({ children, columns = 2 })`: Um grid CSS poderoso.
- `Card({ title, children })`: Uma caixa branca com sombra para agrupar informações.
- `Tabs({ tabs, activeTabBind, instance })`: Cria um sistema de abas conectado ao state da janela.

### Inputs e Controles
Esses componentes suportam o recurso `bind` e `instance`, que cria um **Two-Way Binding** real com a variável desejada em `instance.state`.
- `Input({ label, bind, instance, type = "text", placeholder })`: O atributo `type` pode receber padrões como `"date"`, `"number"`, `"password"`, `"color"`, permitindo aproveitar os inputs HTML5 nativos.
- `Select({ label, bind, instance, options })`
- `Checkbox({ label, bind, instance })`
- `Toggle({ label, bind, instance })`: Um switch moderno com animação (estilo iOS/Android).
- `Button({ text, onClick, instance, variant })`: `variant` pode ser "primary" ou indefinido.

### Componentes de Visualização Dinâmica
- `Table({ columns, data })`: Cria uma tabela formatada. Suporta renderização condicional por coluna (`render: (val) => HTML`).
- `Badge({ text, variant })`: Tags coloridas (`primary`, `success`, `danger`, `warning`).
- `ProgressBar({ value, max })`: Barra de progresso visual (útil para dashboards).
- `TreeView({ data, onSelect, instance })`: Árvore de navegação expansível.
  *Exemplo de data:* `[{ label: "Pai", children: [{ label: "Filho" }] }]`
- `DataGrid({ bindData, columns, instance, itemsPerPage })`: Uma tabela **avançada** com inteligência de ordenação, filtros por coluna e **Paginação**. Totalmente reativa ao state.
  *Exemplo de uso:*
  ```javascript
  DataGrid({
      bindData: "clientes", // Nome do array no instance.state
      instance: this,
      itemsPerPage: 5, // Ativa a paginação
      columns: [
          { key: "id", label: "Código", sortable: true },
          { key: "nome", label: "Cliente", sortable: true, filterable: true },
          { key: "status", label: "Situação", render: (val) => Badge({ text: val }) }
      ]
  })
  ```
  > [!TIP]
  > **Paginação Client-Side vs Server-Side:**
  > - **Client-Side (Padrão):** O `DataGrid` espera que a variável atrelada ao `bindData` no `state` contenha *todos* os registros da tabela. O próprio componente fatia (usando `.slice()`) e exibe apenas a quantidade configurada em `itemsPerPage`. É ideal para tabelas com poucas centenas de dados.
  > - **Server-Side:** Se você lida com bases gigantes, o servidor deve paginar. Para adaptar o `DataGrid`, basta ativar a opção `serverSide: true`, passando o `bindTotalPages` e definindo uma action em `onPageChange` para buscar a próxima página da API.
- `DraggableList({ bindItems, onReorder, instance })`: Uma lista nativa baseada na API HTML5 de **Drag and Drop**. O usuário clica e arrasta para reordenar a lista, e o Array atrelado no state é alterado de forma invisível acionando a função `onReorder`.
- `WebView({ bindUrl, instance, height })`: Envelopa um elemento `<iframe>` perfeitamente embutido na janela para abrir painéis e páginas web externas baseado em um parâmetro do `state`.

---

## 4. Componentes Flutuantes Globais

### 4.1 Menus Globais (MenuBar e StartMenu)
O framework oferece suporte nativo a dois grandes padrões de interface do mercado. Você pode escolher qual usar simplesmente alterando a estrutura do seu arquivo `index.html`.

#### Modo 1: StartMenu (Estilo Windows Clássico)
O menu fica ancorado em um botão dentro da sua Taskbar.

**No seu `index.html`:**
Adicione um botão dentro da div `#taskbar`:
```html
<div id="taskbar">
    <button class="taskStart" id="meu_botao_iniciar">Menu Iniciar</button>
    <!-- ... -->
</div>
```

**No seu JavaScript:**
```javascript
import { StartMenu } from './ui.js';

StartMenu({
    buttonId: "meu_botao_iniciar",
    menus: [
        { label: "Opção 1", action: () => alert("1") },
        { label: "Opção 2", items: [ { label: "Sub-opção", action: () => {} } ] }
    ]
});
```

#### Modo 2: MenuBar (Estilo macOS / Linux)
O menu fica fixado no topo da tela em uma barra horizontal contínua. Os dropdowns abrem ao clicar em uma categoria e navegam fluidamente no *hover*.

**No seu `index.html`:**
Crie uma div vazia **antes** da div `#desktop`:
```html
<div id="app">
    <div id="menubar"></div> <!-- A mágica acontece aqui -->
    <div id="desktop">...</div>
    <div id="taskbar">...</div> <!-- Opcionalmente, você pode deixar a taskbar sem o botão iniciar -->
</div>
```

**No seu JavaScript:**
```javascript
import { MenuBar } from './ui.js';

MenuBar({
    containerId: "menubar",
    menus: [ ... ] // A estrutura do array "menus" é exatamente a mesma do StartMenu!
});
```

- **Menu de Contexto (Right Click)**: Pode ser invocado de duas formas.
  1. Globalmente, chamando a função base com `x` e `y`:
  ```javascript
  import { ContextMenu } from './ui.js';
  
  document.getElementById("desktop").addEventListener("contextmenu", (e) => {
      e.preventDefault();
      ContextMenu({
          x: e.clientX, y: e.clientY,
          items: [
              { label: "Atualizar", action: () => location.reload() },
              "separator",
              { label: "Propriedades", action: () => alert("Propriedades...") }
          ]
      });
  });
  ```
  2. Localmente e prioritário usando `bindContextMenu`. Isso garante que o menu só abra no elemento especificado (e impede que o menu global vaze por cima):
  ```javascript
  import { bindContextMenu } from './ui.js';
  
  const myBtn = document.createElement("button");
  myBtn.textContent = "Clique com botão direito em mim!";
  
  bindContextMenu(myBtn, [
      { label: "Editar Botão", action: () => alert("Editando...") },
      { label: "Deletar", action: () => myBtn.remove() }
  ]);
  ```

> [!NOTE]
> Todas as janelas nativas do framework já vêm de fábrica com um Menu de Contexto embutido em suas barras de título (`.titlebar`) com atalhos para Maximizar, Minimizar e Fechar a janela.

- **Modals (Alertas Corporativos)**:
  ```javascript
  Modal({
      title: "Confirmação",
      instance: this, // Permite que a modal execute actions do contexto atual
      children: [ createElement("p", "", ["Deseja realmente continuar?"]) ]
  });
  ```

### 4.4 Utilitários de Exportação / Impressão
O framework fornece uma API nativa para imprimir componentes ou DOM específicos isoladamente, ignorando a interface inteira do navegador.

- `printElement(element, options)`: Recebe um DOM Node (ou ID) e um objeto de opções. Clona o HTML e os estilos da página atual para um `<iframe>` oculto e dispara a impressão nativa apenas do fragmento.

```javascript
import { printElement } from './ui.js';

// Imprimindo apenas a tabela gerada pelo DataGrid
printElement(gridEl, { title: "Relatório Financeiro" });
```

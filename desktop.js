// desktop.js
import { EventBus, Framework } from './core.js';
import { bindContextMenu } from './ui.js';

export const Desktop = {
    windowsEl: null,
    tasksEl: null,
    nextId: 1,
    zCounter: 20,
    windows: {}, // Referências das instâncias ativas
    screens: {}, // Registro de telas (lazy loaders ou objetos)
    currentTheme: "light",
    currentLaF: "default",
    
    init(options = {}) {
        this.windows = {}; // Reseta referências ativas ao inicializar
        this.options = {
            windowsContainerId: "windows",
            taskbarContainerId: "taskWindows",
            taskbarPosition: "bottom",
            showDesktopButton: true,
            defaultTheme: "light",
            defaultLaF: "default",
            ...options
        };
        
        // Carrega tema persistido ou padrão
        try {
            const savedTheme = localStorage.getItem("desktop_engine_theme") || this.options.defaultTheme;
            this.setTheme(savedTheme, false);
        } catch (e) {
            this.setTheme(this.options.defaultTheme, false);
        }

        // Carrega Look and Feel persistido ou padrão
        try {
            const savedLaF = localStorage.getItem("desktop_engine_laf") || this.options.defaultLaF;
            this.setLookAndFeel(savedLaF, false);
        } catch (e) {
            this.setLookAndFeel(this.options.defaultLaF, false);
        }
        
        this.windowsEl = document.getElementById(this.options.windowsContainerId);
        this.tasksEl = document.getElementById(this.options.taskbarContainerId);
        
        const app = document.getElementById("app");
        if (app) app.dataset.taskbar = this.options.taskbarPosition;
        
        const desktopBtn = document.getElementById("showDesktop");
        if (desktopBtn && !this.options.showDesktopButton) {
            desktopBtn.style.display = "none";
        }
        
        window.addEventListener("resize", () => {
            document.querySelectorAll(".window:not(.maximized)").forEach(w => {
                const maxX = this.windowsEl.clientWidth - w.offsetWidth;
                const maxY = this.windowsEl.clientHeight - w.offsetHeight;
                w.style.left = Math.max(0, Math.min(maxX, w.offsetLeft)) + "px";
                w.style.top = Math.max(0, Math.min(maxY, w.offsetTop)) + "px";
            });
        });
        
        document.addEventListener('mousedown', (e) => {
            const winEl = e.target.closest('.window');
            if (winEl) {
                this.focusWindow(winEl);
            }
        });
        
        // --- UX da Taskbar ---
        // Scroll via Mouse Wheel
        this.tasksEl.addEventListener('wheel', (e) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                this.tasksEl.scrollLeft += e.deltaY;
            }
        });
        
        // Drag-to-scroll
        let isDown = false;
        let startX;
        let scrollLeft;
        
        this.tasksEl.addEventListener('mousedown', (e) => {
            // Não ativa o arrastar se clicou especificamente para fechar/minimizar algo, ou fora do container
            isDown = true;
            this.tasksEl.classList.add('dragging');
            startX = e.pageX - this.tasksEl.offsetLeft;
            scrollLeft = this.tasksEl.scrollLeft;
        });
        this.tasksEl.addEventListener('mouseleave', () => {
            isDown = false;
            this.tasksEl.classList.remove('dragging');
        });
        this.tasksEl.addEventListener('mouseup', () => {
            isDown = false;
            this.tasksEl.classList.remove('dragging');
        });
        this.tasksEl.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - this.tasksEl.offsetLeft;
            const walk = (x - startX) * 1.5; // Velocidade do scroll
            this.tasksEl.scrollLeft = scrollLeft - walk;
        });
        
        this.setupNotifyContainer();
    },
    
    arrangeWindows() {
        const visible = [...document.querySelectorAll(".window:not(.minimized):not(.maximized)")];
        if (visible.length === 0) return;
        
        const cols = Math.ceil(Math.sqrt(visible.length));
        const rows = Math.ceil(visible.length / cols);
        
        const w = this.windowsEl.clientWidth / cols;
        const h = this.windowsEl.clientHeight / rows;
        
        visible.forEach((win, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            win.style.width = w + "px";
            win.style.height = h + "px";
            win.style.left = (col * w) + "px";
            win.style.top = (row * h) + "px";
            this.focusWindow(win); // Bring to front naturally
        });
    },
    
    setupNotifyContainer() {
        this.notifyContainer = document.createElement("div");
        this.notifyContainer.className = "desktop-notifications";
        document.body.appendChild(this.notifyContainer);
    },
    
    notify(message, type = "info") {
        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        this.notifyContainer.appendChild(toast);
        
        // Animação de entrada
        requestAnimationFrame(() => toast.classList.add("show"));
        
        setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    blinkWindow(w) {
        if (!w) return;
        w.classList.remove("blink");
        void w.offsetWidth; // Force reflow
        w.classList.add("blink");
        setTimeout(() => {
            if (w && document.body.contains(w)) w.classList.remove("blink");
        }, 400);
    },

    open(instance) {
        // Verifica se a tela permite apenas uma instância aberta simultaneamente
        if (instance.config.singleInstance) {
            for (let id in this.windows) {
                if (this.windows[id] && this.windows[id].config === instance.config) {
                    const w = this.windows[id].windowEl;
                    if (w && document.body.contains(w)) {
                        if (w.classList.contains("minimized")) this.restoreWindow(w);
                        else this.focusWindow(w);
                        this.blinkWindow(w);
                        return w;
                    } else {
                        delete this.windows[id];
                    }
                }
            }
        }

        if (this.windows[instance.id]) {
            // Já está aberta
            const w = this.windows[instance.id].windowEl;
            if (w && document.body.contains(w)) {
                if (w.classList.contains("minimized")) this.restoreWindow(w);
                else this.focusWindow(w);
                this.blinkWindow(w);
                return w;
            } else {
                delete this.windows[instance.id];
            }
        }

        const config = instance.config;

        const w = document.createElement("div");
        w.className = "window";
        w.dataset.id = instance.id;
        instance.windowEl = w;
        this.windows[instance.id] = instance;
        
        const offset = (this.nextId * 27) % 160;
        w.style.left = (45 + offset) + "px";
        w.style.top = (35 + ((this.nextId * 19) % 100)) + "px";
        w.style.zIndex = ++this.zCounter;
        
        if (config.width) w.style.width = config.width + "px";
        if (config.height) w.style.height = config.height + "px";

        const minimizable = config.minimizable !== false;
        const maximizable = config.maximizable !== false;
        const resizable = config.resizable !== false;

        w.innerHTML = `
            <div class="titlebar">
                <div class="titleIcon"></div>
                <div class="titleText"></div>
                <div class="winButtons">
                    ${minimizable ? `<div class="winBtn minimize" title="Minimizar">−</div>` : ''}
                    ${maximizable ? `<div class="winBtn maximize" title="Maximizar">□</div>` : ''}
                    <div class="winBtn close" title="Fechar">×</div>
                </div>
            </div>
            <div class="windowBody"></div>
            <div class="statusbar"></div>
            ${resizable ? `
            <div class="resizeHandle r-n" data-dir="n"></div>
            <div class="resizeHandle r-s" data-dir="s"></div>
            <div class="resizeHandle r-e" data-dir="e"></div>
            <div class="resizeHandle r-w" data-dir="w"></div>
            <div class="resizeHandle r-ne" data-dir="ne"></div>
            <div class="resizeHandle r-nw" data-dir="nw"></div>
            <div class="resizeHandle r-se" data-dir="se"></div>
            <div class="resizeHandle r-sw" data-dir="sw"></div>
            ` : ''}
        `;

        const titleIconEl = w.querySelector(".titleIcon");
        if (titleIconEl) titleIconEl.textContent = config.icon || "🗔";

        const titleTextEl = w.querySelector(".titleText");
        if (titleTextEl) titleTextEl.textContent = config.title || "Window";

        const statusbarEl = w.querySelector(".statusbar");
        if (statusbarEl) statusbarEl.textContent = config.status || "Pronto";

        // Renderiza conteúdo
        const bodyEl = w.querySelector(".windowBody");
        const contentEl = instance.render();
        if (bodyEl && contentEl) {
            bodyEl.appendChild(contentEl);
        }

        this.windowsEl.appendChild(w);

        // --- Menus Dinâmicos Baseados nas Propriedades ---
        const buildMenu = (forTaskbar = false) => {
            const menu = [];
            if (maximizable) menu.push({ label: "Restaurar / Maximizar", action: () => { if(w.classList.contains("minimized")) this.restoreWindow(w); else this.maximizeWindow(w); } });
            if (minimizable) menu.push({ label: "Minimizar", action: () => this.minimizeWindow(w) });
            if (menu.length > 0) menu.push("separator");
            menu.push({ label: "Fechar Janela", action: () => this.closeWindow(instance, w, task) });
            return menu;
        };

        // --- Adiciona Menu de Contexto na Titlebar ---
        const titlebarEl = w.querySelector('.titlebar');
        
        // Taskbar button
        const task = document.createElement("button");
        task.className = "taskButton";
        task.dataset.window = instance.id;
        const windowTitle = (config.icon ? config.icon + " " : "") + (config.title || "Window");
        task.textContent = windowTitle;
        task.title = windowTitle; // Hint / tooltip com o título completo ao parar o mouse
        this.tasksEl.appendChild(task);
        instance.taskEl = task;
        
        bindContextMenu(titlebarEl, buildMenu());

        // Bind events
        task.addEventListener("click", () => this.toggleWindow(w));
        
        // --- Adiciona Menu de Contexto na Taskbar ---
        bindContextMenu(task, buildMenu(true));
        
        w.querySelector(".close").onclick = () => this.closeWindow(instance, w, task);
        if (minimizable) w.querySelector(".minimize").onclick = () => this.minimizeWindow(w);
        if (maximizable) w.querySelector(".maximize").onclick = () => this.maximizeWindow(w);
        
        this.setupDrag(w, w.querySelector(".titlebar"));
        if (resizable) this.setupResize(w);
        
        this.nextId++;
        
        // Trigger onMount
        instance.onMount();
        this.focusWindow(w);
        
        return w;
    },

    focusWindow(w) {
        if (!w || !document.body.contains(w)) return;
        w.style.zIndex = ++this.zCounter;
        
        const task = document.querySelector(`[data-window="${w.dataset.id}"]`);
        document.querySelectorAll(".taskButton").forEach(x => x.classList.remove("active"));
        if (task) task.classList.add("active");
    },

    minimizeWindow(w) {
        if (!w || !document.body.contains(w)) return;
        w.classList.add("minimized");
    },

    restoreWindow(w) {
        if (!w || !document.body.contains(w)) return;
        w.classList.remove("minimized");
        this.focusWindow(w);
    },

    maximizeWindow(w) {
        if (!w || !document.body.contains(w)) return;
        if (w.classList.contains("maximized")) {
            w.classList.remove("maximized");
            if (w.dataset.oldStyle) {
                const old = JSON.parse(w.dataset.oldStyle);
                w.style.left = old.left; 
                w.style.top = old.top; 
                w.style.width = old.width; 
                w.style.height = old.height;
            }
        } else {
            w.dataset.oldStyle = JSON.stringify({
                left: w.style.left, top: w.style.top, width: w.style.width, height: w.style.height
            });
            w.classList.add("maximized");
        }
        this.focusWindow(w);
    },

    closeWindow(instance, w, task) {
        if (instance && instance.onDestroy) instance.onDestroy();
        if (instance) delete this.windows[instance.id];
        if (w) w.remove();
        if (task) task.remove();
    },

    toggleWindow(w) {
        if (!w || !document.body.contains(w)) return;
        if (w.classList.contains("minimized")) this.restoreWindow(w);
        else if (w.style.zIndex == this.zCounter || +w.style.zIndex >= this.zCounter - 1) this.minimizeWindow(w);
        else this.focusWindow(w);
    },

    showDesktop() {
        const visible = [...document.querySelectorAll(".window:not(.minimized)")];
        if (visible.length) {
            visible.forEach(w => this.minimizeWindow(w));
        } else {
            document.querySelectorAll(".window.minimized").forEach(w => this.restoreWindow(w));
        }
    },

    setupDrag(w, bar) {
        let drag = null;
        bar.addEventListener("dblclick", e => {
            if (e.target.closest(".winBtn")) return;
            this.maximizeWindow(w);
        });
        bar.addEventListener("pointerdown", e => {
            if (e.target.closest(".winBtn") || w.classList.contains("maximized")) return;
            this.focusWindow(w);
            drag = { x: e.clientX, y: e.clientY, left: w.offsetLeft, top: w.offsetTop };
            bar.setPointerCapture(e.pointerId);
        });
        bar.addEventListener("pointermove", e => {
            if (!drag) return;
            const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
            const maxX = this.windowsEl.clientWidth - w.offsetWidth;
            const maxY = this.windowsEl.clientHeight - w.offsetHeight;
            w.style.left = Math.max(0, Math.min(maxX, drag.left + dx)) + "px";
            w.style.top = Math.max(0, Math.min(maxY, drag.top + dy)) + "px";
        });
        const stopDrag = () => drag = null;
        bar.addEventListener("pointerup", stopDrag);
        bar.addEventListener("pointercancel", stopDrag);
    },

    setupResize(w) {
        w.querySelectorAll(".resizeHandle").forEach(handle => {
            handle.addEventListener("pointerdown", e => {
                if (w.classList.contains("maximized")) return;
                e.preventDefault(); 
                e.stopPropagation(); 
                this.focusWindow(w);
                
                const dir = handle.dataset.dir;
                const start = {
                    x: e.clientX, y: e.clientY, 
                    left: w.offsetLeft, top: w.offsetTop,
                    width: w.offsetWidth, height: w.offsetHeight
                };
                handle.setPointerCapture(e.pointerId);

                const move = ev => {
                    let { x, y, left, top, width, height } = start;
                    const dx = ev.clientX - x, dy = ev.clientY - y;
                    const minW = 280, minH = 180;
                    
                    if (dir.includes("e")) width = Math.max(minW, start.width + dx);
                    if (dir.includes("s")) height = Math.max(minH, start.height + dy);
                    if (dir.includes("w")) {
                        width = Math.max(minW, start.width - dx);
                        left = start.left + (start.width - width);
                    }
                    if (dir.includes("n")) {
                        height = Math.max(minH, start.height - dy);
                        top = start.top + (start.height - height);
                    }
                    
                    if (left < 0) { width += left; left = 0; }
                    if (top < 0) { height += top; top = 0; }
                    
                    if (left + width > this.windowsEl.clientWidth) width = this.windowsEl.clientWidth - left;
                    if (top + height > this.windowsEl.clientHeight) height = this.windowsEl.clientHeight - top;
                    
                    w.style.left = left + "px"; 
                    w.style.top = top + "px";
                    w.style.width = Math.max(minW, width) + "px"; 
                    w.style.height = Math.max(minH, height) + "px";
                };
                
                const up = () => {
                    handle.removeEventListener("pointermove", move);
                    handle.removeEventListener("pointerup", up);
                    handle.removeEventListener("pointercancel", up);
                };
                
                handle.addEventListener("pointermove", move);
                handle.addEventListener("pointerup", up);
                handle.addEventListener("pointercancel", up);
            });
        });
    },

    // --- Sistema de Temas e Paletas de Cores ---
    setTheme(themeName, persist = true) {
        this.currentTheme = themeName;
        document.documentElement.setAttribute('data-theme', themeName);
        if (persist) {
            try { localStorage.setItem("desktop_engine_theme", themeName); } catch (e) {}
        }
        EventBus.emit("theme:change", themeName);
    },

    getTheme() {
        return this.currentTheme || document.documentElement.getAttribute('data-theme') || 'light';
    },

    toggleTheme() {
        const current = this.getTheme();
        const next = (current === 'dark' || current === 'midnight') ? 'light' : 'dark';
        this.setTheme(next);
        this.notify(`Tema alterado para: ${next}`, "info");
    },

    registerPalette(name, cssTokens = {}) {
        let styleEl = document.getElementById("custom-palettes");
        if (!styleEl) {
            styleEl = document.createElement("style");
            styleEl.id = "custom-palettes";
            document.head.appendChild(styleEl);
        }
        
        let cssRules = `[data-theme="${name}"] {\n`;
        for (const [key, value] of Object.entries(cssTokens)) {
            const varName = key.startsWith("--") ? key : `--${key}`;
            cssRules += `  ${varName}: ${value};\n`;
        }
        cssRules += `}\n`;
        styleEl.appendChild(document.createTextNode(cssRules));
    },

    // --- Sistema de Look and Feel (L&F / OS Skin) ---
    setLookAndFeel(lafName, persist = true) {
        this.currentLaF = lafName;
        if (!lafName || lafName === 'default') {
            document.documentElement.removeAttribute('data-laf');
        } else {
            document.documentElement.setAttribute('data-laf', lafName);
        }
        if (persist) {
            try { localStorage.setItem("desktop_engine_laf", lafName); } catch (e) {}
        }
        EventBus.emit("laf:change", lafName);
    },

    getLookAndFeel() {
        return this.currentLaF || document.documentElement.getAttribute('data-laf') || 'default';
    },

    getAvailableLookAndFeels() {
        return [
            // Modernos
            { id: "default", label: "Padrão / Moderno", category: "Modernos", icon: "✨", desc: "Design padrão limpo e elegante do DesktopEngine" },
            { id: "macos", label: "macOS (Aqua Modern)", category: "Modernos", icon: "🍎", desc: "Traffic lights à esquerda, título centralizado e cantos de 12px" },
            { id: "win11", label: "Windows 11 (Fluent)", category: "Modernos", icon: "🪟", desc: "Cantos de 8px, controles refinados e botão fechar com hover vermelho" },
            
            // Java Ecosystem
            { id: "java-metal", label: "Java Metal (Steel)", category: "Java PlaF", icon: "☕", desc: "Clássico Java Swing com tons de aço e texturas de relevo" },
            { id: "java-ocean", label: "Java Ocean (Metal 2.0)", category: "Java PlaF", icon: "🌊", desc: "Gradiente azul acetinado e contornos chanfrados Swing" },
            { id: "java-nimbus", label: "Java Nimbus", category: "Java PlaF", icon: "✨", desc: "Superfícies acetinadas, cantos 4px e foco dourado/laranja" },
            { id: "java-flatlaf", label: "FlatLaf (JetBrains/IDE)", category: "Java PlaF", icon: "🎨", desc: "Estilo IDE moderno, compacto, minimalista e profissional" },
            { id: "javafx-modena", label: "JavaFX Modena", category: "Java PlaF", icon: "🌿", desc: "Estética neutra cinza, limpa e moderna do JavaFX 8+" },
            { id: "javafx-caspian", label: "JavaFX Caspian", category: "Java PlaF", icon: "🔷", desc: "Vidro escuro azulado elegante do JavaFX 2" },

            // Retrô & Clássicos
            { id: "beos", label: "BeOS / Haiku", category: "Retrô & Clássicos", icon: "🟡", desc: "A famosa aba amarela no topo esquerdo da janela" },
            { id: "win98", label: "Windows 98 (Classic 3D)", category: "Retrô & Clássicos", icon: "🕹️", desc: "Bordas 3D chanfradas outset/inset e botões clássicos cinza" },
            { id: "winxp", label: "Windows XP (Luna)", category: "Retrô & Clássicos", icon: "🔵", desc: "Barra azul brilhante e botão fechar vermelho luminoso" },
            { id: "win7", label: "Windows 7 (Aero Glass)", category: "Retrô & Clássicos", icon: "🪟", desc: "Vidro translúcido, reflexos luminosos e botões com brilho" },
            { id: "nextstep", label: "NeXTSTEP / OpenStep", category: "Retrô & Clássicos", icon: "⬛", desc: "Tons de cinza puro e preto com relevos chanfrados profundos" },
            { id: "amiga", label: "AmigaOS (Workbench)", category: "Retrô & Clássicos", icon: "💾", desc: "Azul royal, listras pinstripe e acentos âmbar retrô" },
            { id: "mac-classic", label: "Mac OS System 7 / Platinum", category: "Retrô & Clássicos", icon: "🍏", desc: "Pinstripes horizontais, botão fechar quadrado à esquerda" },
            { id: "os2-warp", label: "OS/2 Warp (IBM)", category: "Retrô & Clássicos", icon: "🟦", desc: "Estética corporativa azul-acinzentada com chanfros sólidos" },

            // UNIX / Linux
            { id: "cde-motif", label: "CDE / Motif (Solaris)", category: "UNIX / Linux", icon: "🟣", desc: "Workstation UNIX dos anos 90 com relevos sólidos" },
            { id: "gnome", label: "GNOME (Adwaita)", category: "UNIX / Linux", icon: "🐧", desc: "Headerbar alta de 42px e botão fechar circular minimalista" },
            { id: "kde", label: "KDE (Breeze)", category: "UNIX / Linux", icon: "⚙️", desc: "Linhas nítidas, acentos vetoriais e cantos de 4px" },

            // TUI & Sci-Fi
            { id: "turbovision", label: "Turbo Vision (DOS TUI)", category: "TUI & Sci-Fi", icon: "📟", desc: "Visual de modo texto azul DOS com bordas em caracteres duplos" },
            { id: "cyberpunk", label: "Cyberpunk HUD", category: "TUI & Sci-Fi", icon: "⚡", desc: "Bordas chanfradas 45º, linhas de grade e acentos neon" }
        ];
    },

    // --- Sistema de Roteamento e Registro de Telas (Screen Registry) ---
    registerScreen(id, loaderOrConfig) {
        this.screens[id] = loaderOrConfig;
    },

    registerScreens(screensMap = {}) {
        Object.assign(this.screens, screensMap);
    },

    async openScreen(idOrConfig, initialProps = {}) {
        let config = null;
        let screenId = null;

        if (typeof idOrConfig === 'string') {
            screenId = idOrConfig;
            const registered = this.screens[screenId];
            if (!registered) {
                this.notify(`Tela "${screenId}" não foi registrada no Desktop.`, "danger");
                console.error(`Desktop.openScreen: Tela "${screenId}" não encontrada no registro.`);
                return null;
            }

            if (typeof registered === 'function') {
                try {
                    const res = await registered(initialProps);
                    config = res.default || res;
                } catch (err) {
                    this.notify(`Erro ao carregar módulo da tela "${screenId}".`, "danger");
                    console.error(`Erro no carregamento dinâmico da tela "${screenId}":`, err);
                    return null;
                }
            } else {
                config = registered;
            }
        } else if (typeof idOrConfig === 'object') {
            config = idOrConfig;
            screenId = config.id || `win_${Date.now()}`;
        }

        if (!config) return null;

        // Se singleInstance = true e a janela já existe aberta:
        if (config.singleInstance && this.windows[screenId]) {
            const existingInstance = this.windows[screenId];
            if (existingInstance.windowEl && document.body.contains(existingInstance.windowEl)) {
                this.focusWindow(existingInstance.windowEl);
                if (existingInstance.windowEl.classList.contains("minimized")) {
                    this.restoreWindow(existingInstance.windowEl);
                }
                if (initialProps && Object.keys(initialProps).length > 0) {
                    Object.assign(existingInstance.state, initialProps);
                    if (existingInstance.update) existingInstance.update();
                }
                return existingInstance;
            } else {
                delete this.windows[screenId];
            }
        }

        // Clona a configuração e mescla initialProps no state
        const instanceConfig = {
            ...config,
            state: { ...(config.state || {}), ...(initialProps || {}) }
        };

        const windowInstance = Framework.createWindow(instanceConfig, screenId, this);
        this.open(windowInstance);
        return windowInstance;
    }
};

if (typeof window !== 'undefined') {
    window.Desktop = Desktop;
}

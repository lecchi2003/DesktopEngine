// desktop.js
import { EventBus, Framework } from './core.js';
import { bindContextMenu, MenuBar } from './ui.js';

export const Desktop = {
    windowsEl: null,
    tasksEl: null,
    nextId: 1,
    zCounter: 20,
    windows: {}, // Referências das instâncias ativas
    screens: {}, // Registro de telas (lazy loaders ou objetos)
    currentTheme: "light",
    currentLaF: "default",
    isMobileActive: false,
    
    init(options = {}) {
        this.windows = {}; // Reseta referências ativas ao inicializar
        this.options = {
            windowsContainerId: "windows",
            taskbarContainerId: "taskWindows",
            taskbarPosition: "bottom",
            showDesktopButton: true,
            defaultTheme: "light",
            defaultLaF: "default",
            responsiveMode: "auto", // 'auto' | 'mobile' | 'desktop'
            mobileBreakpoint: 768,
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
        
        // Configura modo responsivo
        this.setMobileMode(this.options.responsiveMode || "auto", false);
        
        window.addEventListener("resize", () => {
            this.checkResponsiveMode();
            if (!this.isMobile()) {
                document.querySelectorAll(".window:not(.maximized)").forEach(w => {
                    const maxX = this.windowsEl.clientWidth - w.offsetWidth;
                    const maxY = this.windowsEl.clientHeight - w.offsetHeight;
                    w.style.left = Math.max(0, Math.min(maxX, w.offsetLeft)) + "px";
                    w.style.top = Math.max(0, Math.min(maxY, w.offsetTop)) + "px";
                });
            }
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
        return this.createWindow(instance);
    },

    createWindow(instance) {
        if (instance.config?.singleInstance) {
            // Procura se já existe uma instância aberta dessa mesma tela
            for (const [id, openWin] of Object.entries(this.windows)) {
                if (openWin.config === instance.config) {
                    const w = openWin.windowEl;
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

        const closable = (config.closable !== false && config.showCloseButton !== false);
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
                    ${closable ? `<div class="winBtn close" title="Fechar">×</div>` : ''}
                </div>
            </div>
            <div class="window-menubar ui-menubar" style="display: none;"></div>
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

        // --- Injeção de Métodos de Controle na Instância ---
        instance.setMenuBar = (menus) => this.setWindowMenuBar(instance, menus);
        instance.getMenuBar = () => instance.windowEl ? instance.windowEl.querySelector(".window-menubar") : null;
        instance.close = (resultData = undefined) => this.closeWindow(instance, w, task, resultData);
        instance.minimize = () => this.minimizeWindow(w);
        instance.maximize = () => this.maximizeWindow(w);
        instance.restore = () => this.restoreWindow(w);
        instance.focus = () => this.focusWindow(w);

        // --- Inicializa Window MenuBar se configurado na tela ---
        const windowMenus = config.menubar || config.menus || config.menu;
        if (windowMenus && Array.isArray(windowMenus) && windowMenus.length > 0) {
            this.setWindowMenuBar(instance, windowMenus);
        }

        // --- Hook: beforeMount (Antes do primeiro render) ---
        if (typeof instance.beforeMount === 'function') {
            try { instance.beforeMount(); } catch (e) { console.error("Erro no hook beforeMount:", e); }
        }

        // Renderiza conteúdo
        const bodyEl = w.querySelector(".windowBody");
        const contentEl = instance.render();
        if (bodyEl && contentEl) {
            bodyEl.appendChild(contentEl);
        }

        const isContained = (config.contained || config.insideParent || config.containedInParent) && instance.parentInstance && instance.parentInstance.windowEl;

        if (isContained) {
            const pEl = instance.parentInstance.windowEl;
            pEl.classList.add("has-contained-child");
            w.classList.add("is-contained-child");
            pEl.appendChild(w);

            const childW = config.width || 420;
            const childH = config.height || 300;
            const left = Math.max(0, (pEl.clientWidth - childW) / 2);
            const top = Math.max(0, (pEl.clientHeight - childH) / 2);
            w.style.left = left + "px";
            w.style.top = top + "px";
        } else {
            this.windowsEl.appendChild(w);
        }

        // Taskbar button
        const task = document.createElement("button");
        task.className = "taskButton";
        task.dataset.window = instance.id;
        const windowTitle = (config.icon ? config.icon + " " : "") + (config.title || "Window");
        task.textContent = windowTitle;
        task.title = windowTitle; // Hint / tooltip com o título completo ao parar o mouse
        this.tasksEl.appendChild(task);
        instance.taskEl = task;

        // --- Menus Dinâmicos Baseados nas Propriedades ---
        const buildMenu = (forTaskbar = false) => {
            const menu = [];
            if (maximizable) menu.push({ label: "Restaurar / Maximizar", action: () => { if(w.classList.contains("minimized")) this.restoreWindow(w); else this.maximizeWindow(w); } });
            if (minimizable) menu.push({ label: "Minimizar", action: () => this.minimizeWindow(w) });
            if (menu.length > 0) menu.push("separator");
            menu.push({ label: "Fechar Janela", action: () => this.closeWindow(instance, w, task) });
            return menu;
        };

        // --- Adiciona Menu de Contexto na Titlebar e Taskbar ---
        const titlebarEl = w.querySelector('.titlebar');
        bindContextMenu(titlebarEl, buildMenu());
        bindContextMenu(task, buildMenu(true));

        // Bind events
        task.addEventListener("click", () => this.toggleWindow(w));
        
        const closeBtn = w.querySelector(".close");
        if (closeBtn) closeBtn.onclick = () => this.closeWindow(instance, w, task);
        if (minimizable) w.querySelector(".minimize").onclick = () => this.minimizeWindow(w);
        if (maximizable) w.querySelector(".maximize").onclick = () => this.maximizeWindow(w);

        this.setupDrag(w, w.querySelector(".titlebar"));
        if (resizable) this.setupResize(w);
        
        this.nextId++;
        
        // Trigger onMount
        if (typeof instance.onMount === 'function') {
            try { instance.onMount(); } catch (e) { console.error("Erro no hook onMount:", e); }
        }

        this.focusWindow(w);

        if (this.isMobile()) {
            setTimeout(() => {
                try {
                    w.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } catch (e) {}
            }, 80);
        }
        
        return w;
    },

    setWindowMenuBar(instance, menus) {
        if (!instance || !instance.windowEl) return;
        const mbEl = instance.windowEl.querySelector(".window-menubar");
        if (!mbEl) return;

        if (!menus || (Array.isArray(menus) && menus.length === 0)) {
            mbEl.innerHTML = "";
            mbEl.style.display = "none";
            return;
        }

        mbEl.innerHTML = "";
        mbEl.style.display = "flex";
        MenuBar({ element: mbEl, menus, windowInstance: instance });
    },

    focusWindow(w) {
        if (!w || !document.body.contains(w)) return;
        
        const currentId = w.dataset.id;
        if (this.activeWindowId && this.activeWindowId !== currentId) {
            const prevInstance = this.windows[this.activeWindowId];
            if (prevInstance && typeof prevInstance.onBlur === 'function') {
                try { prevInstance.onBlur(); } catch (e) { console.error("Erro no hook onBlur:", e); }
            }
        }

        this.activeWindowId = currentId;
        w.style.zIndex = ++this.zCounter;
        
        const task = document.querySelector(`[data-window="${currentId}"]`);
        document.querySelectorAll(".taskButton").forEach(x => x.classList.remove("active"));
        if (task) task.classList.add("active");

        const currentInstance = this.windows[currentId];
        if (currentInstance && typeof currentInstance.onFocus === 'function') {
            try { currentInstance.onFocus(); } catch (e) { console.error("Erro no hook onFocus:", e); }
        }
    },

    minimizeWindow(w) {
        if (!w || !document.body.contains(w)) return;
        w.classList.add("minimized");

        const inst = this.windows[w.dataset.id];
        if (inst) {
            // Se possuir janela filha modal, minimiza a filha junto
            if (inst._modalChildWindow && inst._modalChildWindow.windowEl) {
                inst._modalChildWindow.windowEl.classList.add("minimized");
            }
            if (typeof inst.onMinimize === 'function') {
                try { inst.onMinimize(); } catch (e) { console.error("Erro no hook onMinimize:", e); }
            }
        }
    },

    restoreWindow(w) {
        if (!w || !document.body.contains(w)) return;
        w.classList.remove("minimized");
        this.focusWindow(w);

        const inst = this.windows[w.dataset.id];
        if (inst) {
            // Se possuir janela filha modal, restaura e foca a filha
            if (inst._modalChildWindow && inst._modalChildWindow.windowEl) {
                inst._modalChildWindow.windowEl.classList.remove("minimized");
                this.focusWindow(inst._modalChildWindow.windowEl);
            }
            if (typeof inst.onRestore === 'function') {
                try { inst.onRestore(); } catch (e) { console.error("Erro no hook onRestore:", e); }
            }
        }
    },

    maximizeWindow(w) {
        if (!w || !document.body.contains(w)) return;
        const willMaximize = !w.classList.contains("maximized");

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

        const inst = this.windows[w.dataset.id];
        if (inst && typeof inst.onMaximize === 'function') {
            try { inst.onMaximize(willMaximize); } catch (e) { console.error("Erro no hook onMaximize:", e); }
        }
    },

    async closeWindow(instance, w, task, resultData = undefined) {
        if (instance && typeof instance.beforeClose === 'function') {
            try {
                const canClose = await instance.beforeClose();
                if (canClose === false) return false; // Bloqueia o fechamento da janela
            } catch (err) {
                console.error("Erro no hook beforeClose:", err);
            }
        }

        // Se esta janela tiver uma janela modal filha aberta, fecha a filha primeiro
        if (instance && instance._modalChildWindow) {
            const child = instance._modalChildWindow;
            await this.closeWindow(child, child.windowEl, child.taskEl);
        }

        // Se esta janela for filha modal de outra, remove o bloqueio/overlay da janela mãe
        if (instance && instance._modalParentOverlay) {
            instance._modalParentOverlay.remove();
            instance._modalParentOverlay = null;
        }

        if (instance && instance.parentInstance) {
            const parent = instance.parentInstance;
            parent._modalChildWindow = null;
            if (parent.windowEl) {
                parent.windowEl.classList.remove("has-modal-child");
                this.focusWindow(parent.windowEl);
            }
        }

        // Se for um diálogo com Promise aguardando retorno, resolve com o resultado
        if (instance && typeof instance._dialogResolver === 'function') {
            instance._dialogResolver(resultData);
            instance._dialogResolver = null;
        }

        if (instance && typeof instance.onDestroy === 'function') {
            try { instance.onDestroy(); } catch (e) { console.error("Erro no hook onDestroy:", e); }
        }

        if (instance) {
            if (this.activeWindowId === instance.id) this.activeWindowId = null;
            delete this.windows[instance.id];
        }
        if (w) w.remove();
        if (task) task.remove();
        return true;
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
            if (this.isMobile()) return;
            if (e.target.closest(".winBtn")) return;
            this.maximizeWindow(w);
        });
        bar.addEventListener("pointerdown", e => {
            if (this.isMobile()) return;
            if (e.target.closest(".winBtn") || w.classList.contains("maximized")) return;
            this.focusWindow(w);
            drag = { x: e.clientX, y: e.clientY, left: w.offsetLeft, top: w.offsetTop };
            bar.setPointerCapture(e.pointerId);
        });
        bar.addEventListener("pointermove", e => {
            if (!drag || this.isMobile()) return;
            const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
            const containerEl = w.parentElement || this.windowsEl;
            const maxX = Math.max(0, containerEl.clientWidth - w.offsetWidth);
            const maxY = Math.max(0, containerEl.clientHeight - w.offsetHeight);
            const newLeft = Math.max(0, Math.min(maxX, drag.left + dx));
            const newTop = Math.max(0, Math.min(maxY, drag.top + dy));
            w.style.left = newLeft + "px";
            w.style.top = newTop + "px";

            const inst = this.windows[w.dataset.id];
            if (inst && typeof inst.onMove === 'function') {
                try { inst.onMove(newLeft, newTop); } catch (err) {}
            }
        });
        const stopDrag = () => drag = null;
        bar.addEventListener("pointerup", stopDrag);
        bar.addEventListener("pointercancel", stopDrag);
    },

    setupResize(w) {
        w.querySelectorAll(".resizeHandle").forEach(handle => {
            handle.addEventListener("pointerdown", e => {
                if (this.isMobile() || w.classList.contains("maximized")) return;
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
                    if (this.isMobile()) return;
                    let { x, y, left, top, width, height } = start;
                    const dx = ev.clientX - x, dy = ev.clientY - y;
                    const minW = 280, minH = 180;
                    
                    const containerEl = w.parentElement || this.windowsEl;
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
                    
                    if (left + width > containerEl.clientWidth) width = containerEl.clientWidth - left;
                    if (top + height > containerEl.clientHeight) height = containerEl.clientHeight - top;
                    
                    w.style.left = left + "px"; 
                    w.style.top = top + "px";
                    w.style.width = Math.max(minW, width) + "px"; 
                    w.style.height = Math.max(minH, height) + "px";

                    const inst = this.windows[w.dataset.id];
                    if (inst && typeof inst.onResize === 'function') {
                        try { inst.onResize(parseInt(w.style.width), parseInt(w.style.height)); } catch (err) {}
                    }
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

    // --- Modo Mobile & Responsividade ---
    isMobile() {
        if (this._mobileExplicit !== undefined) {
            return this._mobileExplicit;
        }
        const app = document.getElementById("app");
        if (app && app.classList.contains("mobile-mode")) return true;
        const bp = this.options?.mobileBreakpoint || 768;
        return window.innerWidth <= bp;
    },

    checkResponsiveMode() {
        if (this.options.responsiveMode === "auto") {
            const bp = this.options.mobileBreakpoint || 768;
            const isMob = window.innerWidth <= bp;
            this.applyMobileClass(isMob);
        }
    },

    setMobileMode(mode, persist = true) {
        if (mode === "auto") {
            this.options.responsiveMode = "auto";
            delete this._mobileExplicit;
            this.checkResponsiveMode();
        } else {
            const isMob = mode === true || mode === "mobile";
            this.options.responsiveMode = isMob ? "mobile" : "desktop";
            this._mobileExplicit = isMob;
            this.applyMobileClass(isMob);
        }
        if (persist) {
            try {
                localStorage.setItem("desktop_engine_responsive", this.options.responsiveMode);
            } catch (e) {}
        }
        EventBus.emit("desktop:modechange", { isMobile: this.isMobile(), mode: this.options.responsiveMode });
    },

    toggleMobileMode() {
        const next = !this.isMobile();
        this.setMobileMode(next);
        this.notify(next ? "📱 Modo Mobile ativado (Janelas Empilhadas)" : "🖥️ Modo Desktop ativado (Janelas Flutuantes)", "info");
        return next;
    },

    applyMobileClass(isMob) {
        this.isMobileActive = isMob;
        const app = document.getElementById("app");
        if (app) {
            app.classList.toggle("mobile-mode", isMob);
        }
        document.documentElement.classList.toggle("mobile-mode", isMob);
    },

    getAvailableLookAndFeels() {
        return [
            // Modernos & Mobile Design Systems
            { id: "default", label: "Padrão / Moderno", category: "Modernos & Mobile", icon: "✨", desc: "Design padrão limpo e elegante do DesktopEngine" },
            { id: "macos", label: "macOS (Aqua Modern)", category: "Modernos & Mobile", icon: "🍎", desc: "Traffic lights à esquerda, título centralizado e cantos de 12px" },
            { id: "win11", label: "Windows 11 (Fluent)", category: "Modernos & Mobile", icon: "🪟", desc: "Cantos de 8px, controles refinados e botão fechar com hover vermelho" },
            { id: "material3", label: "Material You / M3", category: "Modernos & Mobile", icon: "🤖", desc: "Superfícies em camadas tonais, cantos de 20px e botões pílula (Android)" },
            { id: "cupertino", label: "Cupertino (iOS 18)", category: "Modernos & Mobile", icon: "🍏", desc: "Vidro fosco ultra-translúcido, squircle de 20px e sombras suaves (Apple)" },
            { id: "oneui", label: "Samsung One UI", category: "Modernos & Mobile", icon: "🌌", desc: "Cantos ultra arredondados de 24px, cabeçalhos amplos e foco ergonômico" },
            { id: "metro", label: "Windows Metro (Flat)", category: "Modernos & Mobile", icon: "🪟", desc: "Design 100% plano, cantos retos (0px), tipografia marcante e alto contraste" },

            // Computação Espacial & Tátil
            { id: "visionos", label: "Apple VisionOS", category: "Espacial & Tátil", icon: "🥽", desc: "Vidro espacial hiper-translúcido, bordas com reflexo de luz e sombras volumétricas" },
            { id: "neumorphism", label: "Neumorphism (Soft UI)", category: "Espacial & Tátil", icon: "🫧", desc: "Superfícies esculpidas em relevo suave com luz e sombra duplas opostas" },
            { id: "tactical-hud", label: "Tactical HUD (Cyberdeck)", category: "Espacial & Tátil", icon: "⚡", desc: "Interface tática militar em âmbar/neon, cantos em 45º e linhas de mira" },
            
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
            { id: "ubuntu", label: "Ubuntu (Yaru)", category: "UNIX / Linux", icon: "🟠", desc: "Barra grafite com acentos em Laranja Ubuntu e botões circulares" },
            { id: "elementary", label: "Elementary OS (Pantheon)", category: "UNIX / Linux", icon: "🕊️", desc: "Fechar à esquerda, maximizar à direita, título centralizado e cantos de 10px" },
            { id: "pop-cosmic", label: "Pop!_OS (COSMIC)", category: "UNIX / Linux", icon: "🚀", desc: "Tema escuro moderno com acentos em Teal/Ciano e Laranja Solar (System76)" },
            { id: "i3wm", label: "i3wm / Sway (Tiling)", category: "UNIX / Linux", icon: "🪟", desc: "Borda ativa fina de 1px, barra monoespacada ultra-compacta e cantos 0px" },
            { id: "xfce", label: "XFCE (Greybird)", category: "UNIX / Linux", icon: "🐭", desc: "Gradiente suave azul-acinzentado, botões leves e cantos de 4px" },
            { id: "enlightenment", label: "Enlightenment (E25)", category: "UNIX / Linux", icon: "🌌", desc: "Visual futurista em titânio escuro, relevos luminosos e curvas sci-fi" },
            { id: "windowmaker", label: "Window Maker (X11)", category: "UNIX / Linux", icon: "⬛", desc: "Gradiente diagonal clássico chanfrado preto/cinza e botões 3D com X e seta" },
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

        const instanceId = config.singleInstance ? screenId : `${screenId}_${this.nextId}`;
        const windowInstance = Framework.createWindow(instanceConfig, instanceId, this);
        this.open(windowInstance);
        return windowInstance;
    },

    async openDialog(idOrConfig, parentInstance, initialProps = {}) {
        return new Promise(async (resolve) => {
            try {
                let config = null;
                let screenId = "dialog";

                if (typeof idOrConfig === 'string') {
                    screenId = idOrConfig;
                    const registered = this.screens[screenId];
                    if (!registered) {
                        this.notify(`Diálogo "${screenId}" não foi registrado no Desktop.`, "danger");
                        return resolve(null);
                    }

                    if (typeof registered === 'function') {
                        const res = await registered(initialProps);
                        config = res.default || res;
                    } else {
                        config = registered;
                    }
                } else if (typeof idOrConfig === 'object') {
                    config = idOrConfig;
                    screenId = config.id || `dialog_${Date.now()}`;
                }

                if (!config) return resolve(null);

                const instanceConfig = {
                    ...config,
                    singleInstance: false, // Diálogos são instâncias específicas
                    state: { ...(config.state || {}), ...(initialProps || {}) }
                };

                const instanceId = `${screenId}_dlg_${++this.nextId}`;
                const childInstance = Framework.createWindow(instanceConfig, instanceId, this);

                // Vincula o resolver da Promise ao fechamento
                childInstance._dialogResolver = resolve;
                childInstance.parentInstance = parentInstance;
                childInstance.isDialog = true;

                // Abre a janela filha
                const childWinEl = this.createWindow(childInstance);
                if (childWinEl) {
                    childWinEl.classList.add("is-child-dialog");

                    // Se foi informado parentInstance, centraliza sobre o pai e anexa overlay de bloqueio
                    if (parentInstance && parentInstance.windowEl && document.body.contains(parentInstance.windowEl)) {
                        const pEl = parentInstance.windowEl;
                        
                        const isContained = (config.contained || config.insideParent || config.containedInParent);

                        if (!isContained) {
                            // Posiciona centralizado sobre a janela pai no Desktop
                            const childW = config.width || 440;
                            const childH = config.height || 320;
                            const left = Math.max(10, pEl.offsetLeft + (pEl.offsetWidth - childW) / 2);
                            const top = Math.max(10, pEl.offsetTop + (pEl.offsetHeight - childH) / 2);
                            childWinEl.style.left = left + "px";
                            childWinEl.style.top = top + "px";
                        }

                        // Cria overlay de bloqueio na janela pai
                        const overlay = document.createElement("div");
                        overlay.className = "window-modal-overlay";
                        overlay.title = "Janela bloqueada pelo diálogo aberto.";
                        overlay.addEventListener("click", (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            this.focusWindow(childWinEl);
                            this.blinkWindow(childWinEl);
                        });

                        if (isContained && childWinEl.parentElement === pEl) {
                            pEl.insertBefore(overlay, childWinEl);
                            childWinEl.style.zIndex = "250";
                        } else {
                            pEl.appendChild(overlay);
                        }

                        pEl.classList.add("has-modal-child");
                        childWinEl.classList.add("is-child-dialog");
                        parentInstance._modalChildWindow = childInstance;
                        childInstance._modalParentOverlay = overlay;
                    }

                    this.focusWindow(childWinEl);
                }
            } catch (err) {
                console.error("Erro ao abrir janela modal filha (openDialog):", err);
                resolve(null);
            }
        });
    }
};

if (typeof window !== 'undefined') {
    window.Desktop = Desktop;
}

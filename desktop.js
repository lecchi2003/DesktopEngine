// desktop.js
import { EventBus } from './core.js';
import { bindContextMenu } from './ui.js';

export const Desktop = {
    windowsEl: null,
    tasksEl: null,
    nextId: 1,
    zCounter: 20,
    windows: {}, // Referências das instâncias ativas
    
    init(options = {}) {
        this.options = {
            windowsContainerId: "windows",
            taskbarContainerId: "taskWindows",
            taskbarPosition: "bottom",
            showDesktopButton: true,
            ...options
        };
        
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
        w.classList.remove("blink");
        void w.offsetWidth; // Force reflow
        w.classList.add("blink");
        setTimeout(() => w.classList.remove("blink"), 400);
    },

    open(instance) {
        // Verifica se a tela permite apenas uma instância aberta simultaneamente
        if (instance.config.singleInstance) {
            for (let id in this.windows) {
                if (this.windows[id].config === instance.config) {
                    const w = this.windows[id].windowEl;
                    if (w.classList.contains("minimized")) this.restoreWindow(w);
                    else this.focusWindow(w);
                    this.blinkWindow(w);
                    return w;
                }
            }
        }

        if (this.windows[instance.id]) {
            // Já está aberta
            const w = this.windows[instance.id].windowEl;
            if (w.classList.contains("minimized")) this.restoreWindow(w);
            else this.focusWindow(w);
            this.blinkWindow(w);
            return w;
        }

        this.windows[instance.id] = instance;
        const config = instance.config;

        const w = document.createElement("div");
        w.className = "window";
        w.dataset.id = instance.id;
        
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
                <div class="titleIcon">${config.icon || "🗔"}</div>
                <div class="titleText">${config.title || "Window"}</div>
                <div class="winButtons">
                    ${minimizable ? `<div class="winBtn minimize" title="Minimizar">−</div>` : ''}
                    ${maximizable ? `<div class="winBtn maximize" title="Maximizar">□</div>` : ''}
                    <div class="winBtn close" title="Fechar">×</div>
                </div>
            </div>
            <div class="windowBody"></div>
            <div class="statusbar">${config.status || "Pronto"}</div>
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
        // Renderiza conteúdo
        const bodyEl = w.querySelector(".windowBody");
        const contentEl = instance.render();
        bodyEl.appendChild(contentEl);
        
        instance.windowEl = w;

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
        task.textContent = (config.icon || "") + " " + (config.title || "Window");
        this.tasksEl.appendChild(task);
        
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
        w.classList.add("minimized");
    },

    restoreWindow(w) {
        w.classList.remove("minimized");
        this.focusWindow(w);
    },

    maximizeWindow(w) {
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
        instance.onDestroy();
        delete this.windows[instance.id];
        w.remove();
        if (task) task.remove();
    },

    toggleWindow(w) {
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
    }
};

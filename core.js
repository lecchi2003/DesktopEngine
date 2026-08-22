// core.js
//Autor: Gildasio Lecchi Cravo
// --- Event Bus (Pub/Sub com suporte a LocalStorage) ---
export const EventBus = {
    listeners: {},
    
    // Inicializa a escuta de eventos inter-abas via LocalStorage
    init() {
        window.addEventListener('storage', (e) => {
            if (e.key === 'desktop_event_bus' && e.newValue) {
                try {
                    const { event, payload } = JSON.parse(e.newValue);
                    this.emitLocal(event, payload);
                } catch (err) {
                    console.error("Erro ao processar evento do EventBus:", err);
                }
            }
        });
    },

    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    },

    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    },

    // Emite o evento apenas na aba atual
    emitLocal(event, payload) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(payload));
        }
    },

    // Emite o evento localmente e para outras abas
    emit(event, payload) {
        this.emitLocal(event, payload);
        
        // Persistência no LocalStorage para sincronizar entre abas
        localStorage.setItem('desktop_event_bus', JSON.stringify({
            event,
            payload,
            timestamp: Date.now()
        }));
    }
};

// Inicializa o EventBus
EventBus.init();

// --- Core Engine ---
export const Framework = {
    createWindow(config, instanceId, desktopManager) {
        let isSilentStateUpdate = false;

        // Objeto de estado reativo via Proxy
        let state = new Proxy({ ...config.state }, {
            set(target, prop, value) {
                const oldValue = target[prop];
                target[prop] = value;
                if (instance.update && !isSilentStateUpdate && instance.el) {
                    instance.update(prop, value, oldValue);
                }
                return true;
            }
        });

        const instance = {
            id: instanceId,
            state,
            config,
            el: null, // Elemento raiz (conteúdo da janela)
            windowEl: null, // Elemento físico da janela (container)
            
            _setSilentState(prop, value) {
                isSilentStateUpdate = true;
                this.state[prop] = value;
                isSilentStateUpdate = false;

                // Sincroniza outros campos da mesma janela vinculados à mesma propriedade sem recriar o DOM
                if (this.el) {
                    const boundEls = this.el.querySelectorAll(`[data-bind="${prop}"]`);
                    boundEls.forEach(el => {
                        if (el !== document.activeElement && el.value !== undefined && el.value !== value) {
                            el.value = value;
                        }
                    });
                }
            },
            
            async runAction(actionName, eventPayload = null) {
                const actionChain = config.actions?.[actionName];
                if (!actionChain) return;
                
                const steps = Array.isArray(actionChain) ? actionChain : [actionChain];
                let index = 0;
                
                const context = { 
                    state: this.state, 
                    instance: this,
                    event: eventPayload,
                    response: null
                };
                
                const next = async () => {
                    if (index < steps.length) {
                        await steps[index++](context, next);
                    }
                };
                
                try {
                    await next();
                } catch (err) {
                    console.error(`Erro na action '${actionName}':`, err);
                    if (desktopManager && desktopManager.notify) {
                        desktopManager.notify(err.message, "error");
                    } else {
                        alert(err.message);
                    }
                }
            },

            render() {
                if (typeof config.view === 'function') {
                    const node = config.view.call(this);
                    this.el = node;
                    return node;
                }
                // Fallback para conteúdo estático
                const div = document.createElement('div');
                div.innerHTML = config.view || '';
                this.el = div;
                return div;
            },

            update(prop = null, newValue = null, oldValue = null) {
                if (typeof this.beforeUpdate === 'function') {
                    try { this.beforeUpdate(prop, newValue, oldValue); } catch (e) { console.error("Erro no hook beforeUpdate:", e); }
                }

                if (this.el && this.el.parentNode) {
                    // Salvar o foco atual e posições de seleção/cursor
                    const activeElement = document.activeElement;
                    let focusedBind = null;
                    let selStart = null;
                    let selEnd = null;

                    if (activeElement && activeElement.dataset && activeElement.dataset.bind) {
                        focusedBind = activeElement.dataset.bind;
                        if (typeof activeElement.selectionStart === "number") {
                            selStart = activeElement.selectionStart;
                            selEnd = activeElement.selectionEnd;
                        }
                    }
                    
                    const oldEl = this.el;
                    const newEl = this.render();
                    oldEl.parentNode.replaceChild(newEl, oldEl);
                    this.el = newEl;
                    
                    // Restaurar foco e cursor sem perder a posição de digitação
                    if (focusedBind) {
                        const elToFocus = newEl.querySelector(`[data-bind="${focusedBind}"]`);
                        if (elToFocus) {
                            elToFocus.focus();
                            if (selStart !== null && typeof elToFocus.setSelectionRange === "function") {
                                elToFocus.setSelectionRange(selStart, selEnd);
                            }
                        }
                    }

                    if (typeof this.onUpdate === 'function') {
                        try { this.onUpdate(); } catch (e) { console.error("Erro no hook onUpdate:", e); }
                    }
                }
            },
            
            setStatus(msg) {
                if (this.windowEl) {
                    const sb = this.windowEl.querySelector('.statusbar');
                    if (sb) sb.textContent = msg;
                }
            },

            setTitle(newTitle) {
                if (this.windowEl) {
                    const tt = this.windowEl.querySelector('.titleText');
                    if (tt) tt.textContent = newTitle;
                }
                if (this.taskEl) {
                    const icon = config.icon ? config.icon + " " : "";
                    this.taskEl.textContent = icon + newTitle;
                    this.taskEl.title = icon + newTitle;
                }
            },
            
            setMenuBar(menus, position) {
                const dm = desktopManager || (typeof window !== 'undefined' ? window.Desktop : null);
                if (dm && typeof dm.setWindowMenuBar === 'function') {
                    dm.setWindowMenuBar(this, menus, position);
                }
            },

            getMenuBar() {
                return this.windowEl ? this.windowEl.querySelector('.window-menubar') : null;
            },

            setActionToolbar(actions, position) {
                const dm = desktopManager || (typeof window !== 'undefined' ? window.Desktop : null);
                if (dm && typeof dm.setWindowActionToolbar === 'function') {
                    dm.setWindowActionToolbar(this, actions, position);
                }
            },

            getActionToolbar() {
                return this.windowEl ? this.windowEl.querySelector('.window-action-toolbar') : null;
            },

            openDialog(childScreenOrId, initialProps = {}) {
                const dm = desktopManager || (typeof window !== 'undefined' ? window.Desktop : null);
                if (dm && typeof dm.openDialog === 'function') {
                    return dm.openDialog(childScreenOrId, this, initialProps);
                }
                return Promise.reject(new Error("DesktopManager não disponível para abrir janela modal filha."));
            },

            openChildWindow(childScreenOrId, initialProps = {}) {
                return this.openDialog(childScreenOrId, initialProps);
            },

            close(resultData = undefined) {
                const dm = desktopManager || (typeof window !== 'undefined' ? window.Desktop : null);
                if (dm && typeof dm.closeWindow === 'function') {
                    return dm.closeWindow(this, this.windowEl, this.taskEl, resultData);
                }
            },

            minimize() {
                const dm = desktopManager || (typeof window !== 'undefined' ? window.Desktop : null);
                if (dm && typeof dm.minimizeWindow === 'function' && this.windowEl) {
                    dm.minimizeWindow(this.windowEl);
                }
            },

            maximize() {
                const dm = desktopManager || (typeof window !== 'undefined' ? window.Desktop : null);
                if (dm && typeof dm.maximizeWindow === 'function' && this.windowEl) {
                    dm.maximizeWindow(this.windowEl);
                }
            },

            restore() {
                const dm = desktopManager || (typeof window !== 'undefined' ? window.Desktop : null);
                if (dm && typeof dm.restoreWindow === 'function' && this.windowEl) {
                    dm.restoreWindow(this.windowEl);
                }
            },

            toggleMaximize() {
                if (this.isMaximized()) this.restore();
                else this.maximize();
            },

            isMaximized() {
                return !!(this.windowEl && this.windowEl.classList.contains("maximized"));
            },

            isMinimized() {
                return !!(this.windowEl && this.windowEl.classList.contains("minimized"));
            },

            isFocused() {
                const dm = desktopManager || (typeof window !== 'undefined' ? window.Desktop : null);
                return !!(dm && dm.activeWindowId === this.id);
            },

            focus() {
                const dm = desktopManager || (typeof window !== 'undefined' ? window.Desktop : null);
                if (dm && typeof dm.focusWindow === 'function' && this.windowEl) {
                    dm.focusWindow(this.windowEl);
                }
            },
            
            // --- Lifecycle Hooks (Ciclo de Vida da Janela) ---
            beforeMount() {
                if (typeof config.beforeMount === 'function') {
                    config.beforeMount.call(this);
                }
            },

            onMount() {
                if (typeof config.onMount === 'function') {
                    config.onMount.call(this);
                }
            },

            beforeUpdate(prop, newValue, oldValue) {
                if (typeof config.beforeUpdate === 'function') {
                    config.beforeUpdate.call(this, prop, newValue, oldValue);
                }
            },

            onUpdate() {
                if (typeof config.onUpdate === 'function') {
                    config.onUpdate.call(this);
                }
            },

            onFocus() {
                if (typeof config.onFocus === 'function') {
                    config.onFocus.call(this);
                }
            },

            onBlur() {
                if (typeof config.onBlur === 'function') {
                    config.onBlur.call(this);
                }
            },

            onMinimize() {
                if (typeof config.onMinimize === 'function') {
                    config.onMinimize.call(this);
                }
            },

            onRestore() {
                if (typeof config.onRestore === 'function') {
                    config.onRestore.call(this);
                }
            },

            onMaximize(isMaximized) {
                if (typeof config.onMaximize === 'function') {
                    config.onMaximize.call(this, isMaximized);
                }
            },

            onResize(width, height) {
                if (typeof config.onResize === 'function') {
                    config.onResize.call(this, width, height);
                }
            },

            onMove(x, y) {
                if (typeof config.onMove === 'function') {
                    config.onMove.call(this, x, y);
                }
            },

            async beforeClose() {
                if (typeof config.beforeClose === 'function') {
                    return await config.beforeClose.call(this);
                }
                return true;
            },
            
            onDestroy() {
                if (typeof config.onDestroy === 'function') {
                    config.onDestroy.call(this);
                }
            }
        };

        // Vincula e delega métodos personalizados do config para a instância
        if (config && typeof config === 'object') {
            for (const [key, val] of Object.entries(config)) {
                if (typeof val === 'function' && !(key in instance)) {
                    instance[key] = val.bind(instance);
                }
            }
        }

        return instance;
    }
};

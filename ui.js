// ui.js
import { Desktop } from './desktop.js';

export function createElement(tag, arg2, arg3) {
    const el = document.createElement(tag);
    let children = [];
    let pendingProps = null;

    // Caso 1: Modo legado tradicional com String no 2º argumento:
    // createElement("div", "classe", [...]) ou createElement("div", "", [...])
    if (typeof arg2 === 'string') {
        if (arg2) el.className = arg2;
        if (Array.isArray(arg3)) {
            children = arg3;
        } else if (arg3 !== undefined && arg3 !== null) {
            children = [arg3];
        }
    }
    // Caso 2: Segundo argumento é um Array de filhos diretamente:
    // createElement("div", [child1, child2])
    else if (Array.isArray(arg2)) {
        children = arg2;
        if (arg3 && typeof arg3 === 'object' && !Array.isArray(arg3)) {
            pendingProps = arg3;
        }
    }
    // Caso 3: Segundo argumento é um Node do DOM:
    // createElement("div", meuElemento)
    else if (arg2 instanceof Node) {
        children = [arg2];
    }
    // Caso 4: Segundo argumento é um Objeto de propriedades/atributos:
    // createElement("div", { className: "card", id: "app" }, [children])
    else if (arg2 && typeof arg2 === 'object') {
        pendingProps = arg2;
        if (Array.isArray(arg3)) {
            children = arg3;
        } else if (arg3 !== undefined && arg3 !== null) {
            children = [arg3];
        }
    }

    // 1. Anexa filhos primeiro
    const appendChild = (child) => {
        if (child === null || child === undefined || child === false) return;
        if (typeof child === 'string' || typeof child === 'number') {
            el.appendChild(document.createTextNode(String(child)));
        } else if (child instanceof Node) {
            el.appendChild(child);
        } else if (Array.isArray(child)) {
            child.forEach(appendChild);
        }
    };

    children.forEach(appendChild);

    // 2. Aplica propriedades DEPOIS de anexar os filhos (permite que <select> encontre options ao definir value)
    if (pendingProps) {
        Object.entries(pendingProps).forEach(([key, val]) => {
            if (val === undefined || val === null) return;
            if (key === 'className' || key === 'class') {
                el.className = val;
            } else if (key === 'style' && typeof val === 'string') {
                el.style.cssText = val;
            } else if (key === 'style' && typeof val === 'object') {
                Object.assign(el.style, val);
            } else if (key.startsWith('on') && typeof val === 'function') {
                const eventName = key.slice(2).toLowerCase();
                el.addEventListener(eventName, val);
            } else if (key in el && typeof el[key] !== 'function') {
                try { el[key] = val; } catch (e) { el.setAttribute(key, val); }
            } else {
                el.setAttribute(key, val);
            }
        });
    }

    return el;
}

/**
 * Utilitário global do framework para imprimir apenas um elemento HTML específico.
 * Ele clona o HTML do elemento e os estilos da página atual para um iFrame oculto e dispara a impressão.
 */
export function printElement(element, options = {}) {
    const title = options.title || "Imprimir Documento";
    const target = typeof element === 'string' ? document.getElementById(element) : element;
    
    if (!target) {
        console.error("printElement: Elemento alvo não encontrado.");
        return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    
    // Clona os estilos da página atual para o iframe de impressão
    let stylesHtml = '';
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => {
        stylesHtml += el.outerHTML;
    });

    doc.write(`
        <html>
            <head>
                <title>${title}</title>
                ${stylesHtml}
                <style>
                    body { padding: 20px; font-family: sans-serif; background: white; }
                    /* Esconde os redimensionadores ou UI desnecessária caso a pessoa imprima a janela toda */
                    .resizeHandle, .winButtons, .titlebar, .statusbar { display: none !important; }
                    .window { position: relative !important; left: 0 !important; top: 0 !important; border: none !important; box-shadow: none !important; }
                </style>
            </head>
            <body>
                ${target.outerHTML}
            </body>
        </html>
    `);
    doc.close();

    const doPrint = () => {
        try {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
        } catch (err) {
            console.error("Erro na impressão: ", err);
        } finally {
            setTimeout(() => {
                if (document.body.contains(iframe)) document.body.removeChild(iframe);
            }, 1000);
        }
    };

    // Tenta disparar logo no onload. Se falhar, tem um fallback
    let printed = false;
    iframe.onload = () => {
        if (!printed) {
            printed = true;
            doPrint();
        }
    };
    
    setTimeout(() => {
        if (!printed) {
            printed = true;
            doPrint();
        }
    }, 500);
}

export function Row({ children = [], style = "" }) {
    const el = createElement("div", "ui-row", children);
    if (style) el.style.cssText = style;
    return el;
}

export function Col({ children = [], style = "" }) {
    const el = createElement("div", "ui-col", children);
    if (style) el.style.cssText = style;
    return el;
}

export function Grid({ children = [], columns = 2 }) {
    const el = createElement("div", "ui-grid", children);
    el.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
    return el;
}

export function Card({ title, children = [] }) {
    const content = [];
    if (title) content.push(createElement("h3", "ui-card-title", [title]));
    content.push(...children);
    return createElement("div", "ui-card", content);
}

export function Form({ fields = [], actions = [] }) {
    const content = [];
    if (fields.length) content.push(createElement("div", "ui-form-fields", fields));
    if (actions.length) content.push(createElement("div", "ui-actions", actions));
    return createElement("div", "ui-form", content);
}

export function Input({ label, bind, instance, type = "text", placeholder = "", width = "100%", style = "" }) {
    const wrap = createElement("div", "ui-field");
    if (width !== "100%") wrap.style.width = width;
    if (style) wrap.style.cssText += style;
    
    if (label) wrap.appendChild(createElement("label", "", [label]));
    
    const inp = document.createElement("input");
    inp.type = type;
    inp.placeholder = placeholder;
    if (bind && instance) {
        inp.dataset.bind = bind;
        inp.value = instance.state[bind] !== undefined ? instance.state[bind] : "";
        inp.addEventListener("input", (e) => {
            if (typeof instance._setSilentState === 'function') {
                instance._setSilentState(bind, e.target.value);
            } else {
                instance.state[bind] = e.target.value;
            }
        });
    }
    wrap.appendChild(inp);
    return wrap;
}

export function Textarea({ label, bind, instance, placeholder = "", rows = 4, width = "100%", style = "" }) {
    const wrap = createElement("div", "ui-field");
    if (width !== "100%") wrap.style.width = width;
    if (style) wrap.style.cssText += style;
    
    if (label) wrap.appendChild(createElement("label", "", [label]));
    
    const txt = document.createElement("textarea");
    txt.className = "filter-input";
    txt.rows = rows;
    txt.placeholder = placeholder;
    if (bind && instance) {
        txt.dataset.bind = bind;
        txt.value = instance.state[bind] !== undefined ? instance.state[bind] : "";
        txt.addEventListener("input", (e) => {
            if (typeof instance._setSilentState === 'function') {
                instance._setSilentState(bind, e.target.value);
            } else {
                instance.state[bind] = e.target.value;
            }
        });
    }
    wrap.appendChild(txt);
    return wrap;
}

export function Button({ text, onClick, instance, variant = "primary" }) {
    const btn = createElement("button", `ui-btn ui-btn-${variant}`, [text]);
    if (onClick && instance) {
        btn.addEventListener("click", () => instance.runAction(onClick));
    } else if (typeof onClick === "function") {
        btn.addEventListener("click", onClick);
    }
    return btn;
}

export function Table({ columns = [], data = [] }) {
    const thead = createElement("thead", "", [
        createElement("tr", "", columns.map(c => createElement("th", "", [c.label || c])))
    ]);
    const rows = data.map(row => {
        return createElement("tr", "", columns.map(c => {
            const val = typeof c === 'string' ? row[c] : row[c.key];
            if (c.render) {
                const td = document.createElement("td");
                const result = c.render(val, row);
                if (typeof result === 'string') td.innerHTML = result;
                else if (result instanceof Node) td.appendChild(result);
                return td;
            }
            return createElement("td", "", [val !== undefined && val !== null ? String(val) : ""]);
        }));
    });
    const table = createElement("table", "ui-table", [thead, createElement("tbody", "", rows)]);
    return createElement("div", "ui-table-wrapper", [table]);
}

export function Tabs({ tabs = [], instance, activeTabBind }) {
    const tabContainer = document.createElement("div");
    tabContainer.className = "ui-tabs";
    const tabHeaders = document.createElement("div");
    tabHeaders.className = "ui-tab-headers";
    const tabContent = document.createElement("div");
    tabContent.className = "ui-tab-content";
    
    const currentTabId = instance.state[activeTabBind] || tabs[0].id;
    
    tabs.forEach(tab => {
        const header = document.createElement("div");
        header.className = `ui-tab-header ${currentTabId === tab.id ? 'active' : ''}`;
        header.textContent = tab.label;
        header.onclick = () => { instance.state[activeTabBind] = tab.id; };
        tabHeaders.appendChild(header);
        
        if (currentTabId === tab.id) tabContent.appendChild(tab.view.call(instance));
    });
    
    tabContainer.appendChild(tabHeaders);
    tabContainer.appendChild(tabContent);
    return tabContainer;
}

export function TreeView({ data = [], onSelect, instance }) {
    const createNode = (nodeData) => {
        const wrap = document.createElement("div");
        wrap.className = "ui-tree-node";
        const row = document.createElement("div");
        row.className = "ui-tree-row";
        const icon = document.createElement("span");
        icon.className = "ui-tree-icon";
        const label = document.createElement("span");
        label.className = "ui-tree-label";
        label.textContent = nodeData.label;
        
        row.appendChild(icon);
        row.appendChild(label);
        wrap.appendChild(row);
        
        if (nodeData.children && nodeData.children.length > 0) {
            icon.textContent = "▶";
            const childrenWrap = document.createElement("div");
            childrenWrap.className = "ui-tree-children";
            childrenWrap.style.display = "none";
            nodeData.children.forEach(child => childrenWrap.appendChild(createNode(child)));
            wrap.appendChild(childrenWrap);
            
            icon.onclick = (e) => {
                e.stopPropagation();
                const isHidden = childrenWrap.style.display === "none";
                childrenWrap.style.display = isHidden ? "block" : "none";
                icon.textContent = isHidden ? "▼" : "▶";
            };
        } else {
            icon.textContent = "📄";
        }
        
        row.onclick = () => {
            document.querySelectorAll('.ui-tree-row').forEach(r => r.classList.remove('selected'));
            row.classList.add('selected');
            if (onSelect) {
                if (typeof onSelect === 'string' && instance) instance.runAction(onSelect, nodeData);
                else if (typeof onSelect === 'function') onSelect(nodeData);
            }
        };
        return wrap;
    };
    
    const container = document.createElement("div");
    container.className = "ui-tree";
    data.forEach(node => container.appendChild(createNode(node)));
    return container;
}



export function ContextMenu({ x, y, items = [] }) {
    document.querySelectorAll(".ui-context-menu, .ui-bottom-sheet-backdrop").forEach(el => el.remove());
    
    const isMobileMode = (typeof window !== 'undefined' && window.Desktop && typeof window.Desktop.isMobile === 'function') 
        ? window.Desktop.isMobile() 
        : (window.innerWidth <= 768 || !!document.getElementById("app")?.classList.contains("mobile-mode"));

    if (isMobileMode) {
        // --- Modo Mobile: Bottom Sheet (Action Sheet) ---
        const backdrop = createElement("div", "ui-bottom-sheet-backdrop", []);
        const sheet = createElement("div", "ui-bottom-sheet", [
            createElement("div", "bottom-sheet-handle-bar", [
                createElement("div", "bottom-sheet-handle", [])
            ]),
            createElement("div", "bottom-sheet-content", [])
        ]);

        const contentEl = sheet.querySelector(".bottom-sheet-content");

        const closeBottomSheet = () => {
            sheet.classList.remove("show");
            backdrop.classList.remove("show");
            setTimeout(() => {
                backdrop.remove();
            }, 250);
        };

        backdrop.onclick = (e) => {
            if (e.target === backdrop) closeBottomSheet();
        };

        items.forEach(item => {
            if (item === "separator") {
                contentEl.appendChild(createElement("div", "bottom-sheet-sep", []));
            } else {
                const optChildren = [];
                if (item.icon) {
                    optChildren.push(createElement("span", "bottom-sheet-icon", [item.icon]));
                }
                optChildren.push(createElement("span", "bottom-sheet-label", [item.label || ""]));
                if (item.shortcut) {
                    optChildren.push(createElement("span", "bottom-sheet-shortcut", [item.shortcut]));
                }

                const opt = createElement("div", "bottom-sheet-option", optChildren);
                opt.onclick = () => {
                    closeBottomSheet();
                    if (item.screen) {
                        const d = (Desktop && typeof Desktop.openScreen === 'function') ? Desktop : (window.Desktop || Desktop);
                        if (d && typeof d.openScreen === 'function') {
                            d.openScreen(item.screen, item.props);
                        }
                    } else if (item.action) {
                        item.action();
                    }
                };
                contentEl.appendChild(opt);
            }
        });

        // Botão de Cancelar
        const cancelBtn = createElement("button", "bottom-sheet-cancel-btn", ["✕ Cancelar"]);
        cancelBtn.onclick = closeBottomSheet;
        sheet.appendChild(cancelBtn);

        backdrop.appendChild(sheet);
        document.body.appendChild(backdrop);

        requestAnimationFrame(() => {
            backdrop.classList.add("show");
            sheet.classList.add("show");
        });

        return sheet;
    }
    
    // --- Modo Desktop: Menu Flutuante Tradicional ---
    const menu = createElement("div", "ui-context-menu", []);
    menu.style.left = x + "px";
    menu.style.top = y + "px";
    
    items.forEach(item => {
        if (item === "separator") {
            menu.appendChild(createElement("div", "menuSep", []));
        } else {
            const optChildren = [];
            if (item.icon) {
                optChildren.push(createElement("span", "menuOption-icon", [item.icon]));
            }
            optChildren.push(createElement("span", "menuOption-label", [item.label || ""]));
            if (item.shortcut) {
                optChildren.push(createElement("span", "menuShortcut", [item.shortcut]));
            }
            const opt = createElement("div", "menuOption", optChildren);
            opt.onclick = () => {
                if (item.screen) {
                    const d = (Desktop && typeof Desktop.openScreen === 'function') ? Desktop : (window.Desktop || Desktop);
                    if (d && typeof d.openScreen === 'function') {
                        d.openScreen(item.screen, item.props);
                    }
                } else if (item.action) {
                    item.action();
                }
                menu.remove();
            };
            menu.appendChild(opt);
        }
    });
    
    document.body.appendChild(menu);
    
    // Ajuste de colisão de tela (Impede que vaze nas bordas)
    const rect = menu.getBoundingClientRect();
    if (x + rect.width > window.innerWidth) {
        menu.style.left = (x - rect.width) + "px";
    }
    if (y + rect.height > window.innerHeight) {
        menu.style.top = (y - rect.height) + "px";
    }
    
    requestAnimationFrame(() => menu.classList.add("show"));
    setTimeout(() => {
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener("click", closeMenu);
                document.removeEventListener("contextmenu", closeMenu);
            }
        };
        document.addEventListener("click", closeMenu);
        document.addEventListener("contextmenu", closeMenu);
    }, 10);
    return menu;
}

export function bindContextMenu(element, items = []) {
    // Clique do botão direito padrão (Desktop)
    element.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Se os itens forem uma função, permite gerar os itens dinamicamente
        const menuItems = typeof items === 'function' ? items(e) : items;
        if (!menuItems || menuItems.length === 0) return;
        
        ContextMenu({ x: e.clientX, y: e.clientY, items: menuItems });
    });

    // Suporte nativo a Long-Press Touch para Mobile
    let touchTimer = null;
    let startX = 0, startY = 0;

    element.addEventListener("touchstart", (e) => {
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;

        touchTimer = setTimeout(() => {
            touchTimer = null;
            if (navigator.vibrate) try { navigator.vibrate(40); } catch(err) {}
            const menuItems = typeof items === 'function' ? items(touch) : items;
            if (menuItems && menuItems.length > 0) {
                ContextMenu({ x: touch.clientX, y: touch.clientY, items: menuItems });
            }
        }, 450);
    }, { passive: true });

    element.addEventListener("touchmove", (e) => {
        if (!touchTimer) return;
        const touch = e.touches[0];
        if (Math.hypot(touch.clientX - startX, touch.clientY - startY) > 10) {
            clearTimeout(touchTimer);
            touchTimer = null;
        }
    }, { passive: true });

    element.addEventListener("touchend", () => {
        if (touchTimer) { clearTimeout(touchTimer); touchTimer = null; }
    }, { passive: true });

    element.addEventListener("touchcancel", () => {
        if (touchTimer) { clearTimeout(touchTimer); touchTimer = null; }
    }, { passive: true });
}

export function MenuBar({ containerId, element, position = "top", menus = [], windowInstance = null } = {}) {
    let bar;
    if (element && (element.nodeType || element instanceof HTMLElement)) {
        bar = element;
    } else if (containerId) {
        bar = document.getElementById(containerId);
    } else {
        bar = createElement("div", "ui-menubar", []);
    }
    if (!bar) return null;
    
    bar.innerHTML = "";
    if (!bar.classList.contains("ui-menubar")) {
        bar.classList.add("ui-menubar");
    }
    bar.dataset.position = position;

    const app = document.getElementById("app");
    const isGlobalBar = app && (bar.id === "menubar" || (containerId === "menubar" && !bar.closest(".window")));
    if (isGlobalBar) {
        app.dataset.menubar = position;
    }

    // --- Mobile Hamburger & Drawer para a Barra Global ou de Janela ---
    const buildMobileItems = (items, closeFn) => {
        const list = createElement("div", "drawer-item-list", []);
        items.forEach(subItem => {
            if (subItem === "separator") {
                list.appendChild(createElement("div", "drawer-sep", []));
            } else {
                const optChildren = [];
                if (subItem.icon) optChildren.push(createElement("span", "drawer-opt-icon", [subItem.icon]));
                optChildren.push(createElement("span", "drawer-opt-label", [subItem.label || ""]));
                if (subItem.items && subItem.items.length > 0) {
                    optChildren.push(createElement("span", "drawer-accordion-arrow", ["▼"]));
                }

                const opt = createElement("div", "drawer-option", optChildren);

                if (subItem.items && subItem.items.length > 0) {
                    opt.classList.add("drawer-has-sub");
                    const subList = buildMobileItems(subItem.items, closeFn);
                    subList.style.display = "none";

                    opt.onclick = (ev) => {
                        ev.stopPropagation();
                        const isOpen = subList.style.display === "flex";
                        subList.style.display = isOpen ? "none" : "flex";
                        opt.classList.toggle("expanded", !isOpen);
                    };

                    const group = createElement("div", "drawer-group", [opt, subList]);
                    list.appendChild(group);
                } else {
                    opt.onclick = (ev) => {
                        ev.stopPropagation();
                        if (closeFn) closeFn();
                        if (subItem.screen) {
                            const d = (Desktop && typeof Desktop.openScreen === 'function') ? Desktop : (window.Desktop || Desktop);
                            if (d && typeof d.openScreen === 'function') {
                                d.openScreen(subItem.screen, subItem.props);
                            }
                        } else if (subItem.action) {
                            subItem.action(windowInstance, ev);
                        }
                    };
                    list.appendChild(opt);
                }
            }
        });
        return list;
    };

    if (isGlobalBar) {
        const hamburger = createElement("button", "menubar-mobile-hamburger", ["☰"]);
        hamburger.setAttribute("aria-label", "Abrir Menu");
        bar.appendChild(hamburger);

        hamburger.onclick = (e) => {
            e.stopPropagation();
            openMobileDrawer();
        };

        const openMobileDrawer = () => {
            document.querySelectorAll(".menubar-mobile-drawer-backdrop").forEach(d => d.remove());
            
            const backdrop = createElement("div", "menubar-mobile-drawer-backdrop", []);
            const drawer = createElement("div", "menubar-mobile-drawer", [
                createElement("div", "drawer-header", [
                    createElement("div", "drawer-title", ["📱 Menu Principal"]),
                    createElement("button", "drawer-close-btn", ["✕"])
                ]),
                createElement("div", "drawer-content", [])
            ]);

            const closeDrawer = () => {
                drawer.classList.remove("open");
                backdrop.classList.remove("show");
                setTimeout(() => backdrop.remove(), 250);
            };

            drawer.querySelector(".drawer-close-btn").onclick = closeDrawer;
            backdrop.onclick = (e) => {
                if (e.target === backdrop) closeDrawer();
            };

            const contentEl = drawer.querySelector(".drawer-content");

            menus.forEach(menu => {
                const catHeader = createElement("div", "drawer-cat-header", [
                    menu.icon ? createElement("span", "drawer-cat-icon", [menu.icon]) : null,
                    createElement("span", "drawer-cat-title", [menu.label || ""]),
                    menu.items && menu.items.length > 0 ? createElement("span", "drawer-accordion-arrow", ["▼"]) : null
                ].filter(Boolean));

                const group = createElement("div", "drawer-category-group", [catHeader]);

                if (menu.items && menu.items.length > 0) {
                    const subList = buildMobileItems(menu.items, closeDrawer);
                    subList.style.display = "none";

                    catHeader.onclick = () => {
                        const isOpen = subList.style.display === "flex";
                        subList.style.display = isOpen ? "none" : "flex";
                        catHeader.classList.toggle("expanded", !isOpen);
                    };
                    group.appendChild(subList);
                }
                contentEl.appendChild(group);
            });

            backdrop.appendChild(drawer);
            document.body.appendChild(backdrop);

            requestAnimationFrame(() => {
                backdrop.classList.add("show");
                drawer.classList.add("open");
            });
        };
    } else {
        // --- Hamburger & Sheet para Window MenuBar (MenuBar dentro de Janela) ---
        const winTitle = windowInstance?.config?.title ? `Menu: ${windowInstance.config.title}` : "Menu da Janela";
        const winIcon = windowInstance?.config?.icon || "☰";
        const winHamburger = createElement("button", "window-menubar-hamburger", [
            createElement("span", "window-menubar-hamburger-icon", [winIcon]),
            createElement("span", "window-menubar-hamburger-label", ["Menu"])
        ]);
        winHamburger.setAttribute("aria-label", winTitle);
        bar.appendChild(winHamburger);

        winHamburger.onclick = (e) => {
            e.stopPropagation();
            openWindowMobileSheet();
        };

        const openWindowMobileSheet = () => {
            document.querySelectorAll(".ui-bottom-sheet-backdrop").forEach(d => d.remove());

            const backdrop = createElement("div", "ui-bottom-sheet-backdrop", []);
            const sheet = createElement("div", "ui-bottom-sheet", [
                createElement("div", "bottom-sheet-handle-bar", [
                    createElement("div", "bottom-sheet-handle", [])
                ]),
                createElement("div", "drawer-header", [
                    createElement("div", "drawer-title", [`${winIcon} ${winTitle}`]),
                    createElement("button", "drawer-close-btn", ["✕"])
                ]),
                createElement("div", "bottom-sheet-content", [])
            ]);

            const closeSheet = () => {
                sheet.classList.remove("show");
                backdrop.classList.remove("show");
                setTimeout(() => backdrop.remove(), 250);
            };

            sheet.querySelector(".drawer-close-btn").onclick = closeSheet;
            backdrop.onclick = (e) => {
                if (e.target === backdrop) closeSheet();
            };

            const contentEl = sheet.querySelector(".bottom-sheet-content");

            menus.forEach(menu => {
                const catHeader = createElement("div", "drawer-cat-header", [
                    menu.icon ? createElement("span", "drawer-cat-icon", [menu.icon]) : null,
                    createElement("span", "drawer-cat-title", [menu.label || ""]),
                    menu.items && menu.items.length > 0 ? createElement("span", "drawer-accordion-arrow", ["▼"]) : null
                ].filter(Boolean));

                const group = createElement("div", "drawer-category-group", [catHeader]);

                if (menu.items && menu.items.length > 0) {
                    const subList = buildMobileItems(menu.items, closeSheet);
                    subList.style.display = "none"; // Inicia recolhido em sanfona/accordion

                    catHeader.onclick = () => {
                        const isOpen = subList.style.display === "flex";
                        subList.style.display = isOpen ? "none" : "flex";
                        catHeader.classList.toggle("expanded", !isOpen);
                    };
                    group.appendChild(subList);
                }
                contentEl.appendChild(group);
            });

            // Botão Fechar
            const cancelBtn = createElement("button", "bottom-sheet-cancel-btn", ["✕ Fechar Menu"]);
            cancelBtn.onclick = closeSheet;
            sheet.appendChild(cancelBtn);

            backdrop.appendChild(sheet);
            document.body.appendChild(backdrop);

            requestAnimationFrame(() => {
                backdrop.classList.add("show");
                sheet.classList.add("show");
            });
        };
    }

    // --- Menus Padrão Desktop & Itens da Barra ---
    function buildMenu(items, isSub = false) {
        const containerClass = isSub ? "dropdown sub-dropdown" : "dropdown menubar-dropdown";
        const container = createElement("div", containerClass, []);
        container.style.flexDirection = "column";

        items.forEach(subItem => {
            if (subItem === "separator") {
                container.appendChild(createElement("div", "menuSep", []));
            } else {
                const optChildren = [];
                const leftPart = createElement("div", "menuOption-left", []);
                
                if (subItem.icon) {
                    leftPart.appendChild(createElement("span", "menuOption-icon", [subItem.icon]));
                }
                leftPart.appendChild(createElement("span", "menuOption-label", [subItem.label || ""]));
                optChildren.push(leftPart);

                if (subItem.shortcut) {
                    optChildren.push(createElement("span", "menuShortcut", [subItem.shortcut]));
                }

                if (subItem.items && subItem.items.length > 0) {
                    optChildren.push(createElement("span", "submenu-arrow", ["▶"]));
                }

                const opt = createElement("div", "menuOption", optChildren);

                const isDisabled = typeof subItem.disabled === 'function' ? subItem.disabled(windowInstance) : !!subItem.disabled;
                if (isDisabled) {
                    opt.classList.add("disabled");
                }

                if (subItem.items && subItem.items.length > 0) {
                    opt.classList.add("has-submenu");
                    const nested = buildMenu(subItem.items, true);
                    opt.appendChild(nested);
                    
                    opt.addEventListener("mouseenter", () => {
                        if (!isDisabled) nested.style.display = "flex";
                    });
                    opt.addEventListener("mouseleave", () => nested.style.display = "none");
                } else {
                    opt.onclick = (e) => { 
                        if (isDisabled) return;
                        e.stopPropagation(); 
                        if (subItem.screen) {
                            const d = (Desktop && typeof Desktop.openScreen === 'function') ? Desktop : (window.Desktop || Desktop);
                            if (d && typeof d.openScreen === 'function') {
                                d.openScreen(subItem.screen, subItem.props);
                            }
                        } else if (subItem.action) {
                            subItem.action(windowInstance, e);
                        }
                        bar.querySelectorAll(".menubar-item").forEach(x => x.classList.remove("active"));
                    };
                }
                container.appendChild(opt);
            }
        });
        return container;
    }

    let isMenuOpen = false;

    menus.forEach(menu => {
        const itemChildren = [];
        if (menu.icon) {
            itemChildren.push(createElement("span", "menubar-item-icon", [menu.icon]));
        }
        itemChildren.push(createElement("span", "menubar-item-label", [menu.label || ""]));
        
        const item = createElement("div", "menubar-item", itemChildren);
        if (menu.items && menu.items.length > 0) {
            const dropdown = buildMenu(menu.items);
            item.appendChild(dropdown);
        }
        
        item.onmousedown = (e) => {
            // Ignora se o clique foi dentro do dropdown aberto (deixa o onclick da opção agir)
            if (e.target.closest(".ui-start-menu") || e.target.closest(".dropdown")) return;

            e.stopPropagation();
            if (item.classList.contains("active")) {
                item.classList.remove("active");
                isMenuOpen = false;
            } else {
                bar.querySelectorAll(".menubar-item").forEach(x => x.classList.remove("active"));
                item.classList.add("active");
                isMenuOpen = true;
            }
        };

        item.onmouseenter = () => {
            if (isMenuOpen && !item.classList.contains("active")) {
                bar.querySelectorAll(".menubar-item").forEach(x => x.classList.remove("active"));
                item.classList.add("active");
            }
        };

        bar.appendChild(item);
    });
    
    document.addEventListener("mousedown", e => {
        if (!bar.contains(e.target)) {
            bar.querySelectorAll(".menubar-item").forEach(x => x.classList.remove("active"));
            isMenuOpen = false;
        }
    });
    return bar;
}

export function StartMenu({ buttonId, menus = [] }) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;

    const menuEl = createElement("div", "ui-start-menu", []);
    
    function buildMenu(items, isSub = false) {
        const container = createElement("div", isSub ? "dropdown sub-dropdown" : "menu-container", []);
        if (!isSub) {
            container.style.display = "flex";
            container.style.flexDirection = "column";
        }
        items.forEach(subItem => {
            if (subItem === "separator") {
                container.appendChild(createElement("div", "menuSep", []));
            } else {
                const opt = createElement("div", "menuOption", [subItem.label]);
                if (subItem.items && subItem.items.length > 0) {
                    opt.classList.add("has-submenu");
                    opt.appendChild(createElement("span", "submenu-arrow", ["▶"]));
                    const nested = buildMenu(subItem.items, true);
                    opt.appendChild(nested);
                    
                    opt.addEventListener("mouseenter", () => nested.style.display = "block");
                    opt.addEventListener("mouseleave", () => nested.style.display = "none");
                } else {
                    opt.onclick = (e) => { 
                        e.stopPropagation();
                        if (subItem.screen) {
                            const d = (Desktop && typeof Desktop.openScreen === 'function') ? Desktop : (window.Desktop || Desktop);
                            if (d && typeof d.openScreen === 'function') {
                                d.openScreen(subItem.screen, subItem.props);
                            }
                        } else if (subItem.action) {
                            subItem.action();
                        }
                        menuEl.classList.remove("show");
                    };
                }
                container.appendChild(opt);
            }
        });
        return container;
    }

    menuEl.appendChild(buildMenu(menus));
    document.getElementById("app").appendChild(menuEl);

    btn.onclick = (e) => {
        e.stopPropagation();
        menuEl.classList.toggle("show");
    };

    document.addEventListener("click", e => {
        if (!menuEl.contains(e.target) && e.target !== btn) {
            menuEl.classList.remove("show");
        }
    });
    
    return menuEl;
}

// --- MAIS COMPONENTES CORPORATIVOS ---

export function Select({ label, bind, instance, options = [] }) {
    const wrap = createElement("div", "ui-field");
    if (label) wrap.appendChild(createElement("label", "", [label]));
    
    const select = document.createElement("select");
    if (bind && instance) {
        select.dataset.bind = bind;
        const currentVal = instance.state[bind];
        
        options.forEach(opt => {
            const option = document.createElement("option");
            option.value = opt.value;
            option.textContent = opt.label;
            if (currentVal === opt.value) option.selected = true;
            select.appendChild(option);
        });
        
        select.addEventListener("change", (e) => {
            instance.state[bind] = e.target.value;
        });
    }
    wrap.appendChild(select);
    return wrap;
}

export function Checkbox({ label, bind, instance }) {
    const wrap = createElement("label", "ui-checkbox-wrap", [
        createElement("input", "ui-checkbox", []),
        createElement("span", "ui-checkbox-label", [label])
    ]);
    const inp = wrap.querySelector("input");
    inp.type = "checkbox";
    
    if (bind && instance) {
        inp.dataset.bind = bind;
        inp.checked = !!instance.state[bind];
        inp.addEventListener("change", (e) => {
            instance.state[bind] = e.target.checked;
        });
    }
    return wrap;
}

export function Toggle({ label, bind, instance }) {
    const wrap = createElement("label", "ui-toggle-wrap", [
        createElement("input", "ui-toggle-input", []),
        createElement("span", "ui-toggle-slider", []),
        createElement("span", "ui-toggle-label", [label])
    ]);
    const inp = wrap.querySelector("input");
    inp.type = "checkbox";
    
    if (bind && instance) {
        inp.dataset.bind = bind;
        inp.checked = !!instance.state[bind];
        inp.addEventListener("change", (e) => {
            instance.state[bind] = e.target.checked;
        });
    }
    return wrap;
}

export function Badge({ text, variant = "primary" }) {
    return createElement("span", `ui-badge ui-badge-${variant}`, [text]);
}

export function ProgressBar({ value = 0, max = 100 }) {
    const wrap = createElement("div", "ui-progress-wrap", []);
    const bar = createElement("div", "ui-progress-bar", []);
    bar.style.width = `${(value / max) * 100}%`;
    wrap.appendChild(bar);
    return wrap;
}

export function Modal({ title, children = [], onClose, beforeClose, showCloseButton = true, closable = true, instance, targetContainer }) {
    const overlay = createElement("div", "ui-modal-overlay", []);
    const content = [];
    const hasCloseBtn = (showCloseButton !== false && closable !== false);

    const closeModal = async () => {
        if (typeof beforeClose === 'function') {
            try {
                const canClose = await beforeClose();
                if (canClose === false) return;
            } catch (err) {
                console.error("Erro no hook beforeClose do Modal:", err);
            }
        }
        if (onClose && instance) instance.runAction(onClose);
        else if (typeof onClose === 'function') onClose();
        overlay.remove();
        document.removeEventListener('keydown', escListener);
    };
    
    if (title) {
        const headerChildren = [createElement("h3", "", [title])];
        if (hasCloseBtn) {
            const closeBtn = createElement("span", "ui-modal-close", ["×"]);
            closeBtn.onclick = () => closeModal();
            headerChildren.push(closeBtn);
        }
        const header = createElement("div", "ui-modal-header", headerChildren);
        content.push(header);
    }
    
    const body = createElement("div", "ui-modal-body", children);
    content.push(body);
    
    const dialog = createElement("div", "ui-modal-dialog", content);
    overlay.appendChild(dialog);
    
    // Auto-close on escape (apenas se closable = true)
    const escListener = (e) => {
        if (e.key === 'Escape' && hasCloseBtn) {
            closeModal();
        }
    };
    document.addEventListener('keydown', escListener);
    
    // Resolve Container
    let container = targetContainer;
    if (!container) {
        if (instance && instance.windowEl) {
            container = instance.windowEl;
        } else {
            container = document.getElementById("app") || document.body;
        }
    }
    
    // Se o container não tem posição definida, forçar relativa
    if (getComputedStyle(container).position === "static") {
        container.style.position = "relative";
    }

    container.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("show"));
    
    return overlay;
}

// --- V0.3 NOVOS COMPONENTES ---

export function WebView({ bindUrl, instance, height = "100%" }) {
    const wrap = createElement("div", "ui-webview-wrap", []);
    wrap.style.height = height;
    
    const iframe = document.createElement("iframe");
    iframe.className = "ui-webview";
    
    if (bindUrl && instance) {
        // Initial set
        if (instance.state[bindUrl]) {
            iframe.src = instance.state[bindUrl];
        }
        
        // We do not intercept load events for security, we just drive it from state
        // When state changes, we re-render and it will get the new src naturally.
        // But since re-rendering an iframe reloads it, we might want to manually set src if it already exists.
        // The Proxy triggers full update anyway, so it re-creates the iframe. 
        // For a seamless webview, we'd want custom logic, but for standard usage full re-render is fine.
    }
    
    wrap.appendChild(iframe);
    return wrap;
}

export function DraggableList({ bindItems, onReorder, instance }) {
    const wrap = createElement("div", "ui-draggable-list", []);
    
    const items = instance.state[bindItems] || [];
    let draggedItemIdx = null;
    
    items.forEach((item, index) => {
        const row = createElement("div", "ui-draggable-item", [
            createElement("span", "drag-handle", ["☰"]),
            createElement("span", "drag-text", [typeof item === 'string' ? item : item.label || JSON.stringify(item)])
        ]);
        row.draggable = true;
        
        row.addEventListener('dragstart', (e) => {
            draggedItemIdx = index;
            row.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        
        row.addEventListener('dragend', () => {
            row.classList.remove('dragging');
            draggedItemIdx = null;
        });
        
        row.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (draggedItemIdx !== null && draggedItemIdx !== index) {
                const rect = row.getBoundingClientRect();
                const mid = rect.top + rect.height / 2;
                if (e.clientY < mid) {
                    row.classList.add('drag-over-top');
                    row.classList.remove('drag-over-bottom');
                } else {
                    row.classList.add('drag-over-bottom');
                    row.classList.remove('drag-over-top');
                }
            }
        });
        
        row.addEventListener('dragleave', () => {
            row.classList.remove('drag-over-top', 'drag-over-bottom');
        });
        
        row.addEventListener('drop', (e) => {
            e.preventDefault();
            row.classList.remove('drag-over-top', 'drag-over-bottom');
            if (draggedItemIdx !== null && draggedItemIdx !== index) {
                const rect = row.getBoundingClientRect();
                const mid = rect.top + rect.height / 2;
                const dropIndex = e.clientY < mid ? index : index + 1;
                
                const newItems = [...items];
                const [moved] = newItems.splice(draggedItemIdx, 1);
                
                const adjustedIndex = dropIndex > draggedItemIdx ? dropIndex - 1 : dropIndex;
                newItems.splice(adjustedIndex, 0, moved);
                
                instance.state[bindItems] = newItems;
                
                if (onReorder && instance) {
                    if (typeof onReorder === 'string') instance.runAction(onReorder, newItems);
                    else onReorder(newItems);
                }
            }
        });
        
        wrap.appendChild(row);
    });
    
    return wrap;
}

export function DataGrid({ columns = [], bindData, instance, itemsPerPage = 5, serverSide = false, bindTotalPages = null, onPageChange = null }) {
    if (!instance.state._gridState) instance.state._gridState = {};
    if (!instance.state._gridState[bindData]) {
        instance.state._gridState[bindData] = { sortKey: null, sortDesc: false, filters: {}, currentPage: 1 };
    }
    const gridState = instance.state._gridState[bindData];
    const rawData = instance.state[bindData] || [];

    // Filtros
    let processedData = rawData.filter(row => {
        for (let key of Object.keys(gridState.filters)) {
            const term = gridState.filters[key].toLowerCase();
            if (!term) continue;
            const val = String(row[key] || "").toLowerCase();
            if (!val.includes(term)) return false;
        }
        return true;
    });

    // Ordenação
    if (gridState.sortKey) {
        processedData.sort((a, b) => {
            const valA = a[gridState.sortKey];
            const valB = b[gridState.sortKey];
            if (valA < valB) return gridState.sortDesc ? 1 : -1;
            if (valA > valB) return gridState.sortDesc ? -1 : 1;
            return 0;
        });
    }

    const thead = document.createElement("thead");
    
    // Cabeçalho de Ordenação
    const trHead = document.createElement("tr");
    columns.forEach(c => {
        const th = document.createElement("th");
        th.textContent = c.label || c.key;
        if (c.sortable) {
            th.classList.add("sortable");
            const icon = document.createElement("span");
            icon.className = "sort-icon";
            icon.textContent = "▼";
            if (gridState.sortKey === c.key) {
                icon.classList.add("active");
                icon.textContent = gridState.sortDesc ? "▼" : "▲";
            }
            th.appendChild(icon);
            th.onclick = () => {
                if (gridState.sortKey === c.key) {
                    if (gridState.sortDesc) gridState.sortKey = null;
                    else gridState.sortDesc = true;
                } else {
                    gridState.sortKey = c.key;
                    gridState.sortDesc = false;
                }
                instance.update();
            };
        }
        trHead.appendChild(th);
    });
    thead.appendChild(trHead);

    // Cabeçalho de Filtros
    if (columns.some(c => c.filterable)) {
        const trFilter = document.createElement("tr");
        trFilter.className = "filter-row";
        columns.forEach(c => {
            const th = document.createElement("th");
            if (c.filterable) {
                const inp = document.createElement("input");
                inp.className = "filter-input";
                inp.placeholder = "Filtrar...";
                inp.value = gridState.filters[c.key] || "";
                // Uso do bind falso para o core.js restaurar o foco após re-render
                inp.dataset.bind = `_grid_${bindData}_${c.key}`;
                
                inp.oninput = (e) => {
                    gridState.filters[c.key] = e.target.value;
                    instance.update();
                };
                th.appendChild(inp);
            }
            trFilter.appendChild(th);
        });
        thead.appendChild(trFilter);
    }

    // Paginação
    let totalPages = 1;
    let pagedData = processedData;

    if (serverSide) {
        if (bindTotalPages && instance.state[bindTotalPages]) {
            totalPages = instance.state[bindTotalPages];
        }
        pagedData = processedData;
    } else {
        const totalItems = processedData.length;
        totalPages = Math.ceil(totalItems / itemsPerPage);
        if (totalPages === 0) totalPages = 1;
        if (gridState.currentPage > totalPages) {
            gridState.currentPage = totalPages;
        }
        const startIndex = (gridState.currentPage - 1) * itemsPerPage;
        pagedData = processedData.slice(startIndex, startIndex + itemsPerPage);
    }

    const tbody = document.createElement("tbody");
    pagedData.forEach(row => {
        const tr = document.createElement("tr");
        columns.forEach(c => {
            const val = typeof c === 'string' ? row[c] : row[c.key];
            if (c.render) {
                const td = document.createElement("td");
                const result = c.render(val, row);
                if (typeof result === 'string') td.innerHTML = result;
                else if (result instanceof Node) td.appendChild(result);
                tr.appendChild(td);
            } else {
                tr.appendChild(createElement("td", "", [val !== undefined && val !== null ? String(val) : ""]));
            }
        });
        tbody.appendChild(tr);
    });

    const table = createElement("table", "ui-datagrid", [thead, tbody]);
    
    // UI de Paginação
    const paginationWrapper = createElement("div", "ui-pagination", []);
    const info = createElement("div", "ui-pagination-info", [`Página ${gridState.currentPage} de ${totalPages}`]);
    const btnGroup = createElement("div", "ui-pagination-buttons", []);

    const createBtn = (label, disabled, onClick) => {
        const btn = document.createElement("button");
        btn.innerHTML = label;
        btn.className = "ui-pagination-btn";
        btn.disabled = disabled;
        btn.onclick = onClick;
        return btn;
    };

    const triggerPageChange = (newPage) => {
        gridState.currentPage = newPage;
        if (onPageChange) {
            if (typeof onPageChange === 'string') instance.runAction(onPageChange, newPage);
            else onPageChange(newPage);
        } else {
            instance.update();
        }
    };

    // Ícones: Primeira (&#171;), Anterior (&#8249;), Próxima (&#8250;), Última (&#187;)
    btnGroup.appendChild(createBtn("&#171;", gridState.currentPage === 1, () => {
        triggerPageChange(1);
    }));
    btnGroup.appendChild(createBtn("&#8249;", gridState.currentPage === 1, () => {
        triggerPageChange(gridState.currentPage - 1);
    }));
    btnGroup.appendChild(createBtn("&#8250;", gridState.currentPage === totalPages, () => {
        triggerPageChange(gridState.currentPage + 1);
    }));
    btnGroup.appendChild(createBtn("&#187;", gridState.currentPage === totalPages, () => {
        triggerPageChange(totalPages);
    }));

    paginationWrapper.appendChild(info);
    paginationWrapper.appendChild(btnGroup);

    return createElement("div", "ui-table-wrapper", [table, paginationWrapper]);
}

// --- COMPONENTES DE FEEDBACK E NOTIFICAÇÕES (GRUPO 1) ---

export function Alert({ text, variant = "info" }) {
    // variants: info, success, warning, error
    const alertEl = createElement("div", `ui-alert ui-alert-${variant}`, [text]);
    return alertEl;
}

export function Spinner({ size = "24px", color = "currentColor" }) {
    const spinner = createElement("div", "ui-spinner", []);
    spinner.style.width = size;
    spinner.style.height = size;
    spinner.style.borderColor = `${color} transparent transparent transparent`;
    return spinner;
}

export function Toast({ message, type = "info", duration = 3000 }) {
    // Certifica-se de que o container de toasts existe
    let container = document.getElementById("ui-toast-container");
    if (!container) {
        container = createElement("div", "", []);
        container.id = "ui-toast-container";
        document.body.appendChild(container);
    }

    const toast = createElement("div", `ui-toast ui-toast-${type}`, [message]);
    container.appendChild(toast);

    // Força um reflow para garantir a animação de entrada
    requestAnimationFrame(() => {
        toast.classList.add("show");
    });

    setTimeout(() => {
        toast.classList.remove("show");
        toast.addEventListener('transitionend', () => {
            toast.remove();
        });
    }, duration);
}

// --- NAVEGAÇÃO E LAYOUT (GRUPO 2) ---

export function Accordion({ items = [], instance }) {
    const container = createElement("div", "ui-accordion");
    
    items.forEach((item, index) => {
        const itemEl = createElement("div", "ui-accordion-item");
        
        const header = createElement("div", "ui-accordion-header", [
            createElement("span", "ui-accordion-title", [item.title]),
            createElement("span", "ui-accordion-icon", ["▼"])
        ]);
        
        const content = createElement("div", "ui-accordion-content");
        if (typeof item.content === 'string') {
            content.innerHTML = item.content;
        } else if (item.content instanceof Node) {
            content.appendChild(item.content);
        } else if (typeof item.content === 'function' && instance) {
            const res = item.content.call(instance);
            if (typeof res === 'string') content.innerHTML = res;
            else if (res instanceof Node) content.appendChild(res);
        }
        
        header.onclick = () => {
            const isOpen = itemEl.classList.contains("open");
            // Fecha todos (opcional: comente as próximas 2 linhas para permitir múltiplos abertos)
            container.querySelectorAll('.ui-accordion-item').forEach(el => el.classList.remove("open"));
            if (!isOpen) itemEl.classList.add("open");
        };
        
        itemEl.appendChild(header);
        itemEl.appendChild(content);
        container.appendChild(itemEl);
    });
    
    return container;
}

export function Drawer({ bind, side = "right", content, instance, targetContainer }) {
    const overlay = createElement("div", "ui-drawer-overlay");
    const drawer = createElement("div", `ui-drawer ui-drawer-${side}`);
    
    // Close function
    const closeDrawer = () => {
        if (bind && instance) {
            instance.state[bind] = false;
        } else {
            overlay.classList.remove("show");
            setTimeout(() => overlay.remove(), 300);
        }
    };
    
    overlay.onclick = (e) => {
        if (e.target === overlay) closeDrawer();
    };

    if (typeof content === 'string') drawer.innerHTML = content;
    else if (content instanceof Node) drawer.appendChild(content);
    else if (Array.isArray(content)) content.forEach(c => drawer.appendChild(c));

    overlay.appendChild(drawer);

    // Resolve Container
    let container = targetContainer;
    if (!container) {
        if (instance && instance.windowEl) {
            container = instance.windowEl;
        } else {
            container = document.getElementById("app") || document.body;
        }
    }
    
    if (getComputedStyle(container).position === "static") {
        container.style.position = "relative";
    }

    // Controle pelo state
    if (bind && instance) {
        const placeholder = createElement("div", "ui-drawer-placeholder", []);
        placeholder.style.display = "none";
        
        const old = document.getElementById(`drawer_${bind}`);
        
        if (instance.state[bind]) {
            if (old) old.remove();
            
            overlay.id = `drawer_${bind}`;
            container.appendChild(overlay);
            
            requestAnimationFrame(() => overlay.classList.add("show"));
        } else if (old) {
            old.classList.remove("show");
            setTimeout(() => old.remove(), 300);
        }
        
        return placeholder;
    } else {
        container.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add("show"));
        return overlay;
    }
}

export function Breadcrumbs({ items = [], separator = "/" }) {
    const nav = createElement("nav", "ui-breadcrumbs", []);
    
    items.forEach((item, index) => {
        const isLast = index === items.length - 1;
        
        if (isLast || !item.action) {
            const span = createElement("span", isLast ? "ui-breadcrumb-active" : "ui-breadcrumb-text", [item.label]);
            nav.appendChild(span);
        } else {
            const link = createElement("a", "ui-breadcrumb-link", [item.label]);
            link.href = "javascript:void(0)";
            link.onclick = item.action;
            nav.appendChild(link);
        }
        
        if (!isLast) {
            const sep = createElement("span", "ui-breadcrumb-separator", [separator]);
            nav.appendChild(sep);
        }
    });
    
    return nav;
}

export function Stepper({ steps = [], currentStep = 0 }) {
    const container = createElement("div", "ui-stepper");
    
    steps.forEach((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        
        const stepEl = createElement("div", `ui-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`);
        
        const circle = createElement("div", "ui-step-circle", [String(index + 1)]);
        const label = createElement("div", "ui-step-label", [step]);
        
        stepEl.appendChild(circle);
        stepEl.appendChild(label);
        container.appendChild(stepEl);
        
        if (index < steps.length - 1) {
            const line = createElement("div", `ui-step-line ${isCompleted ? 'completed' : ''}`);
            container.appendChild(line);
        }
    });
    
    return container;
}

// --- FORMULÁRIOS AVANÇADOS (GRUPO 3) ---

export function Slider({ label, bind, min = 0, max = 100, step = 1, instance }) {
    const wrap = createElement("div", "ui-field ui-slider-wrap");
    
    const topRow = createElement("div", "ui-slider-header", []);
    if (label) topRow.appendChild(createElement("label", "", [label]));
    
    const valueDisplay = createElement("span", "ui-slider-value", []);
    topRow.appendChild(valueDisplay);
    wrap.appendChild(topRow);
    
    const inp = document.createElement("input");
    inp.type = "range";
    inp.className = "ui-slider-input";
    inp.min = min;
    inp.max = max;
    inp.step = step;
    
    const updateDisplay = (val) => {
        valueDisplay.textContent = val;
        // Calcula a porcentagem para preencher o background do track
        const percent = ((val - min) / (max - min)) * 100;
        inp.style.backgroundSize = `${percent}% 100%`;
    };

    if (bind && instance) {
        inp.dataset.bind = bind;
        let currentVal = instance.state[bind] !== undefined ? instance.state[bind] : min;
        inp.value = currentVal;
        updateDisplay(currentVal);
        inp.addEventListener("input", (e) => {
            updateDisplay(Number(e.target.value));
        });
        
        inp.addEventListener("change", (e) => {
            instance.state[bind] = Number(e.target.value);
        });
    } else {
        inp.value = min;
        updateDisplay(min);
        inp.addEventListener("input", (e) => updateDisplay(e.target.value));
    }
    
    wrap.appendChild(inp);
    return wrap;
}

export function RadioGroup({ label, name, bind, options = [], instance, layout = "vertical" }) {
    const wrap = createElement("div", "ui-field ui-radiogroup-wrap");
    if (label) wrap.appendChild(createElement("label", "ui-radiogroup-label", [label]));
    
    const container = createElement("div", `ui-radiogroup ui-radiogroup-${layout}`);
    const groupName = name || `radio_${bind || Math.random().toString(36).substr(2, 5)}`;
    
    options.forEach(opt => {
        const lbl = document.createElement("label");
        lbl.className = "ui-radio-label";
        
        const inp = document.createElement("input");
        inp.type = "radio";
        inp.name = groupName;
        inp.value = opt.value;
        
        if (bind && instance) {
            inp.dataset.bind = bind;
            if (instance.state[bind] === opt.value) inp.checked = true;
            
            inp.addEventListener("change", (e) => {
                if (e.target.checked) {
                    instance.state[bind] = opt.value;
                }
            });
        }
        
        lbl.appendChild(inp);
        lbl.appendChild(document.createTextNode(" " + opt.label));
        container.appendChild(lbl);
    });
    
    wrap.appendChild(container);
    return wrap;
}

export function Autocomplete({ label, bind, options = [], instance, placeholder = "Digite para buscar...", multiple = false }) {
    const wrap = createElement("div", "ui-field ui-autocomplete-wrap");
    if (label) wrap.appendChild(createElement("label", "", [label]));
    
    const listId = `dl_${bind || Math.random().toString(36).substr(2, 5)}`;
    
    // Área onde os chips (tags) vão aparecer, se multiple = true
    const chipsContainer = createElement("div", "ui-autocomplete-chips");
    
    const inp = document.createElement("input");
    inp.type = "text";
    inp.className = "ui-autocomplete-input";
    inp.placeholder = placeholder;
    inp.setAttribute("list", listId);
    
    const datalist = document.createElement("datalist");
    datalist.id = listId;
    
    options.forEach(opt => {
        const optionEl = document.createElement("option");
        optionEl.value = opt.value || opt;
        if (opt.label) optionEl.textContent = opt.label;
        datalist.appendChild(optionEl);
    });
    
    if (bind && instance) {
        inp.dataset.bind = bind;
        
        if (multiple) {
            const currentArr = Array.isArray(instance.state[bind]) ? instance.state[bind] : [];
            // Renderiza os chips iniciais
            currentArr.forEach(val => {
                const chip = createElement("span", "ui-chip", [val]);
                const closeBtn = createElement("span", "ui-chip-close", ["×"]);
                closeBtn.onclick = () => {
                    instance.state[bind] = instance.state[bind].filter(item => item !== val);
                };
                chip.appendChild(closeBtn);
                chipsContainer.appendChild(chip);
            });
            
            // Quando seleciona do datalist
            inp.addEventListener("change", (e) => {
                const val = e.target.value.trim();
                if (val && (!instance.state[bind] || !instance.state[bind].includes(val))) {
                    const newArr = Array.isArray(instance.state[bind]) ? [...instance.state[bind]] : [];
                    newArr.push(val);
                    instance.state[bind] = newArr;
                }
                e.target.value = ""; // limpa o input após selecionar
            });
        } else {
            inp.value = instance.state[bind] !== undefined ? instance.state[bind] : "";
            inp.addEventListener("input", (e) => {
                if (typeof instance._setSilentState === 'function') {
                    instance._setSilentState(bind, e.target.value);
                } else {
                    instance.state[bind] = e.target.value;
                }
            });
        }
    }
    
    if (multiple) wrap.appendChild(chipsContainer);
    wrap.appendChild(inp);
    wrap.appendChild(datalist);
    return wrap;
}

// --- COMPONENTES VISUAIS (GRUPO 4) ---

export function Tooltip({ content, position = "top", children }) {
    // children: elemento que vai acionar o tooltip no hover
    const wrap = createElement("div", "ui-tooltip-wrap");
    
    const tooltipText = createElement("span", `ui-tooltip-text ui-tooltip-${position}`, [content]);
    
    if (typeof children === 'string') {
        wrap.appendChild(document.createTextNode(children));
    } else if (children instanceof Node) {
        wrap.appendChild(children);
    }
    
    wrap.appendChild(tooltipText);
    return wrap;
}

export function Avatar({ src, initials, size = 40, status }) {
    const wrap = createElement("div", "ui-avatar-wrap");
    wrap.style.width = `${size}px`;
    wrap.style.height = `${size}px`;
    wrap.style.fontSize = `${size / 2.5}px`;

    const img = document.createElement("img");
    img.className = "ui-avatar-img";
    
    if (src) {
        img.src = src;
        img.onerror = () => {
            img.style.display = "none";
            if (initials) {
                const initEl = createElement("div", "ui-avatar-initials", [initials]);
                wrap.appendChild(initEl);
            }
        };
        wrap.appendChild(img);
    } else if (initials) {
        const initEl = createElement("div", "ui-avatar-initials", [initials]);
        wrap.appendChild(initEl);
    }
    
    if (status) {
        const statusBadge = createElement("span", `ui-avatar-status ui-status-${status}`, []);
        wrap.appendChild(statusBadge);
    }
    
    return wrap;
}

export function Carousel({ items = [], height = "200px", prevControl, nextControl, controlsPosition = "side" }) {
    const wrap = createElement("div", `ui-carousel-wrap pos-${controlsPosition}`);
    
    const track = createElement("div", "ui-carousel");
    track.style.height = height;
    
    items.forEach(item => {
        const slide = createElement("div", "ui-carousel-slide");
        if (typeof item === 'string') {
            slide.innerHTML = item;
        } else if (item instanceof Node) {
            slide.appendChild(item);
        }
        track.appendChild(slide);
    });
    
    if (prevControl && nextControl) {
        const btnPrev = createElement("div", "ui-carousel-control prev");
        if (typeof prevControl === 'string') btnPrev.innerHTML = prevControl;
        else if (prevControl instanceof Node) btnPrev.appendChild(prevControl);
        
        const btnNext = createElement("div", "ui-carousel-control next");
        if (typeof nextControl === 'string') btnNext.innerHTML = nextControl;
        else if (nextControl instanceof Node) btnNext.appendChild(nextControl);
        
        btnPrev.onclick = () => {
            track.scrollBy({ left: -track.clientWidth * 0.8, behavior: 'smooth' });
        };
        btnNext.onclick = () => {
            track.scrollBy({ left: track.clientWidth * 0.8, behavior: 'smooth' });
        };
        
        if (controlsPosition === "side") {
            wrap.appendChild(btnPrev);
            wrap.appendChild(track);
            wrap.appendChild(btnNext);
        } else {
            const controlsRow = createElement("div", `ui-carousel-controls-row pos-${controlsPosition}`);
            controlsRow.appendChild(btnPrev);
            controlsRow.appendChild(btnNext);
            
            if (controlsPosition.startsWith("top")) {
                wrap.appendChild(controlsRow);
                wrap.appendChild(track);
            } else if (controlsPosition.startsWith("bottom")) {
                wrap.appendChild(track);
                wrap.appendChild(controlsRow);
            }
        }
    } else {
        wrap.appendChild(track);
    }
    
    return wrap;
}

export function Skeleton({ width = "100%", height = "20px", shape = "rect" }) {
    const el = createElement("div", `ui-skeleton ui-skeleton-${shape}`);
    el.style.width = typeof width === 'number' ? `${width}px` : width;
    el.style.height = typeof height === 'number' ? `${height}px` : height;
    return el;
}

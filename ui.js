// ui.js

export function createElement(tag, className, children = []) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    children.forEach(child => {
        if (typeof child === 'string' || typeof child === 'number') {
            el.appendChild(document.createTextNode(child));
        } else if (child instanceof Node) {
            el.appendChild(child);
        }
    });
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
            instance.state[bind] = e.target.value;
        });
    }
    wrap.appendChild(inp);
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
    document.querySelectorAll(".ui-context-menu").forEach(el => el.remove());
    
    const menu = createElement("div", "ui-context-menu", []);
    menu.style.left = x + "px";
    menu.style.top = y + "px";
    
    items.forEach(item => {
        if (item === "separator") {
            menu.appendChild(createElement("div", "menuSep", []));
        } else {
            const opt = createElement("div", "menuOption", [item.label]);
            opt.onclick = () => {
                if (item.action) item.action();
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
    element.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Se os itens forem uma função, permite gerar os itens dinamicamente
        const menuItems = typeof items === 'function' ? items(e) : items;
        if (!menuItems || menuItems.length === 0) return;
        
        ContextMenu({ x: e.clientX, y: e.clientY, items: menuItems });
    });
}

export function MenuBar({ containerId, menus = [] }) {
    const bar = document.getElementById(containerId);
    if (!bar) return;
    
    bar.innerHTML = "";
    bar.className = "ui-menubar";

    function buildMenu(items, isSub = false) {
        const containerClass = isSub ? "dropdown sub-dropdown" : "ui-start-menu";
        const container = createElement("div", containerClass, []);
        container.style.flexDirection = "column";

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
                    
                    opt.addEventListener("mouseenter", () => nested.style.display = "flex");
                    opt.addEventListener("mouseleave", () => nested.style.display = "none");
                } else {
                    opt.onclick = (e) => { 
                        e.stopPropagation(); 
                        if (subItem.action) subItem.action(); 
                        document.querySelectorAll(".menubar-item").forEach(x => x.classList.remove("active"));
                    };
                }
                container.appendChild(opt);
            }
        });
        return container;
    }

    let isMenuOpen = false;

    menus.forEach(menu => {
        const item = createElement("div", "menubar-item", [menu.label]);
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
                document.querySelectorAll(".menubar-item").forEach(x => x.classList.remove("active"));
                item.classList.add("active");
                isMenuOpen = true;
            }
        };

        item.onmouseenter = () => {
            if (isMenuOpen && !item.classList.contains("active")) {
                document.querySelectorAll(".menubar-item").forEach(x => x.classList.remove("active"));
                item.classList.add("active");
            }
        };

        bar.appendChild(item);
    });
    
    document.addEventListener("mousedown", e => {
        if (!e.target.closest(".menubar-item")) {
            document.querySelectorAll(".menubar-item").forEach(x => x.classList.remove("active"));
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
                        if (subItem.action) subItem.action(); 
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

export function Modal({ title, children = [], onClose, instance }) {
    const overlay = createElement("div", "ui-modal-overlay", []);
    const content = [];
    
    if (title) {
        const header = createElement("div", "ui-modal-header", [
            createElement("h3", "", [title]),
            createElement("span", "ui-modal-close", ["×"])
        ]);
        header.querySelector('.ui-modal-close').onclick = () => {
            if (onClose && instance) instance.runAction(onClose);
            else if (typeof onClose === 'function') onClose();
            overlay.remove();
        };
        content.push(header);
    }
    
    const body = createElement("div", "ui-modal-body", children);
    content.push(body);
    
    const dialog = createElement("div", "ui-modal-dialog", content);
    overlay.appendChild(dialog);
    
    // Auto-close on escape
    const escListener = (e) => {
        if (e.key === 'Escape') {
            if (onClose && instance) instance.runAction(onClose);
            else if (typeof onClose === 'function') onClose();
            overlay.remove();
            document.removeEventListener('keydown', escListener);
        }
    };
    document.addEventListener('keydown', escListener);
    
    document.body.appendChild(overlay);
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
    paginationWrapper.style.display = "flex";
    paginationWrapper.style.justifyContent = "space-between";
    paginationWrapper.style.alignItems = "center";
    paginationWrapper.style.padding = "8px";
    paginationWrapper.style.background = "var(--bg-light, #f9f9f9)";
    paginationWrapper.style.borderTop = "1px solid var(--border, #ccc)";

    const info = createElement("div", "ui-pagination-info", [`Página ${gridState.currentPage} de ${totalPages}`]);
    info.style.fontSize = "0.85rem";
    info.style.color = "var(--text-muted, #666)";
    
    const btnGroup = createElement("div", "ui-pagination-buttons", []);
    btnGroup.style.display = "flex";
    btnGroup.style.gap = "4px";

    const createBtn = (label, disabled, onClick) => {
        const btn = document.createElement("button");
        btn.innerHTML = label;
        btn.className = "ui-btn ui-btn-sm"; // reaproveitando classe de botão se houver
        btn.style.padding = "2px 8px";
        btn.style.cursor = disabled ? "not-allowed" : "pointer";
        btn.style.opacity = disabled ? "0.5" : "1";
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

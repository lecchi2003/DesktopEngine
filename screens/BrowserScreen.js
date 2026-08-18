// screens/BrowserScreen.js
import { createElement, Row, Col, Input, Button, WebView, Toast, Modal } from '../ui.js';

export default {
    title: "Navegador Corporativo",
    icon: "🌐",
    width: 840,
    height: 620,
    singleInstance: true,
    state: { 
        urlInput: "https://en.wikipedia.org/wiki/Main_Page", 
        currentUrl: "https://en.wikipedia.org/wiki/Main_Page" 
    },
    menubar: [
        {
            label: "Navegação",
            icon: "🧭",
            items: [
                {
                    label: "Página Inicial (Wikipedia)",
                    icon: "🏠",
                    action: (inst) => {
                        inst.state.urlInput = "https://en.wikipedia.org/wiki/Main_Page";
                        inst.state.currentUrl = "https://en.wikipedia.org/wiki/Main_Page";
                        inst.setStatus("Carregando página inicial...");
                    }
                },
                {
                    label: "Recarregar Página",
                    icon: "🔄",
                    shortcut: "Ctrl+R",
                    action: (inst) => {
                        const cur = inst.state.currentUrl;
                        inst.state.currentUrl = "about:blank";
                        setTimeout(() => {
                            inst.state.currentUrl = cur;
                            inst.setStatus("Página recarregada.");
                        }, 50);
                    }
                },
                "separator",
                {
                    label: "Fechar Navegador",
                    icon: "❌",
                    action: (inst) => inst.close()
                }
            ]
        },
        {
            label: "Favoritos",
            icon: "⭐",
            items: [
                {
                    label: "Wikipedia (Principal)",
                    icon: "📖",
                    action: (inst) => {
                        inst.state.urlInput = "https://en.wikipedia.org/wiki/Main_Page";
                        inst.state.currentUrl = "https://en.wikipedia.org/wiki/Main_Page";
                    }
                },
                {
                    label: "MDN Web Docs",
                    icon: "🌐",
                    action: (inst) => {
                        inst.state.urlInput = "https://developer.mozilla.org";
                        inst.state.currentUrl = "https://developer.mozilla.org";
                    }
                },
                {
                    label: "W3Schools",
                    icon: "🎓",
                    action: (inst) => {
                        inst.state.urlInput = "https://www.w3schools.com";
                        inst.state.currentUrl = "https://www.w3schools.com";
                    }
                }
            ]
        },
        {
            label: "Janela",
            icon: "🗖",
            items: [
                {
                    label: "Maximizar",
                    icon: "🗖",
                    action: (inst) => inst.maximize()
                },
                {
                    label: "Minimizar",
                    icon: "🗕",
                    action: (inst) => inst.minimize()
                }
            ]
        }
    ],
    actions: {
        ir: [async (ctx) => {
            let target = ctx.state.urlInput;
            if (!target.startsWith("http")) target = "https://" + target;
            ctx.state.currentUrl = target;
            ctx.instance.setStatus("Carregando " + target + "...");
        }]
    },
    view() {
        return createElement("div", "flex-col", [
            Row({
                style: "margin-bottom: 8px; gap: 8px; align-items: center;", 
                children: [
                    Col({
                        style: "flex: 1;", 
                        children: [
                            Input({ bind: "urlInput", instance: this, placeholder: "Digite a URL..." })
                        ]
                    }),
                    Button({ text: "Ir ➔", onClick: "ir", instance: this, variant: "primary" })
                ]
            }),
            WebView({ bindUrl: "currentUrl", instance: this, height: "calc(100% - 48px)" })
        ]);
    }
};

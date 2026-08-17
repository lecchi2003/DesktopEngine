// screens/BrowserScreen.js
import { createElement, Row, Col, Input, Button, WebView } from '../ui.js';

export default {
    title: "Navegador Corporativo",
    icon: "🌐",
    width: 800,
    height: 600,
    singleInstance: true,
    state: { 
        urlInput: "https://en.wikipedia.org/wiki/Main_Page", 
        currentUrl: "https://en.wikipedia.org/wiki/Main_Page" 
    },
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
                style: "margin-bottom: 8px;", 
                children: [
                    Col({
                        style: "flex: 1;", 
                        children: [
                            Input({ bind: "urlInput", instance: this, placeholder: "Digite a URL..." })
                        ]
                    }),
                    Button({ text: "Ir", onClick: "ir", instance: this })
                ]
            }),
            WebView({ bindUrl: "currentUrl", instance: this, height: "calc(100% - 40px)" })
        ]);
    }
};

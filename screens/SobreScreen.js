// screens/SobreScreen.js
import { createElement } from '../ui.js';

export default {
    title: "Sobre o Sistema",
    icon: "ℹ️",
    width: 420,
    height: 260,
    resizable: false,
    minimizable: false,
    maximizable: false,
    singleInstance: true,
    state: {},
    view() {
        return createElement("div", "p-3", [
            createElement("h2", "", ["Desktop Engine v0.6"]),
            createElement("p", "", ["Esta janela foi carregada dinamicamente via Lazy Loading nativo (import dinâmico)."]),
            createElement("p", "", ["Tente abrir esta tela novamente e veja a janela original piscar (Efeito Blink) preservando instância única."])
        ]);
    }
};

// screens/LifecycleDemoScreen.js
import { Desktop } from '../desktop.js';
import {
    createElement, Row, Col, Card, Button, Input, Checkbox, Toast, Modal
} from '../ui.js';

export default {
    title: "Monitor de Ciclo de Vida (Lifecycle Hooks)",
    icon: "⏱️",
    width: 680,
    height: 520,
    singleInstance: false,
    state: {
        counter: 0,
        isAutoIncrementing: false,
        timerId: null,
        protectUnsavedChanges: true,
        eventsLog: []
    },

    // 1. ANTES DA MONTAGEM (Pré-DOM)
    beforeMount() {
        this.addLog("🚀 [beforeMount] Inicializando configurações antes do DOM.");
    },

    // 2. APÓS A MONTAGEM (Inserido no DOM)
    onMount() {
        this.addLog("✅ [onMount] Janela inserida fisicamente no DOM.");
        this.setStatus("Monitor de ciclo de vida pronto.");
    },

    // 3. ANTES DA RE-RENDERIZAÇÃO DO ESTADO
    beforeUpdate(prop, newValue, oldValue) {
        if (prop !== "eventsLog") {
            const msg = `🔄 [beforeUpdate] Propriedade '${prop}' mudando de '${oldValue}' para '${newValue}'`;
            console.log(msg);
            this.state.eventsLog.unshift({
                time: new Date().toLocaleTimeString(),
                tag: "🔄 beforeUpdate",
                text: `Propriedade '${prop}' alterada de '${oldValue}' para '${newValue}'`
            });
            if (this.state.eventsLog.length > 30) this.state.eventsLog.pop();
        }
    },

    // 4. APÓS A RE-RENDERIZAÇÃO DO DOM
    onUpdate() {
        console.log("🔄 [onUpdate] Novo DOM re-renderizado com sucesso.");
    },

    // 5. QUANDO A JANELA GANHA FOCO
    onFocus() {
        this.addLog("🟢 [onFocus] Janela ganhou o foco e veio para frente.");
    },

    // 6. QUANDO A JANELA PERDE O FOCO
    onBlur() {
        this.addLog("⚪ [onBlur] Janela perdeu o foco.");
    },

    // 7. AO MINIMIZAR
    onMinimize() {
        this.addLog("📥 [onMinimize] Janela minimizada para a Taskbar.");
    },

    // 8. AO RESTAURAR
    onRestore() {
        this.addLog("📤 [onRestore] Janela restaurada da Taskbar.");
    },

    // 9. AO MAXIMIZAR / DESMAXIMIZAR
    onMaximize(isMaximized) {
        this.addLog(`🗖 [onMaximize] Estado de maximização: ${isMaximized ? 'Maximizada' : 'Janela normal'}.`);
    },

    // 10. AO REDIMENSIONAR
    onResize(w, h) {
        console.log(`📐 [onResize] Novas dimensões: ${w}x${h}px`);
        this.setStatus(`Dimensões: ${w}x${h}px`);
    },

    // 11. AO ARRASTAR / MOVER
    onMove(x, y) {
        console.log(`📍 [onMove] Nova posição: X=${x}px, Y=${y}px`);
        this.setStatus(`Posição: X=${x}px, Y=${y}px`);
    },

    // 12. INTERCEPTADOR DE FECHAMENTO (Antes de Destruir)
    async beforeClose() {
        console.log("🛑 [beforeClose] Tentativa de fechamento detectada.");
        if (this.state.protectUnsavedChanges) {
            return new Promise((resolve) => {
                Modal({
                    title: "⚠️ Interceptador beforeClose()",
                    instance: this,
                    children: [
                        createElement("p", "", [
                            "O hook ", createElement("code", "", ["beforeClose()"]), " interceptou a tentativa de fechar a janela porque a opção ",
                            createElement("b", "", ["'Proteger alterações não salvas'"]), " está ativada!"
                        ]),
                        createElement("p", "", ["Deseja realmente fechar esta janela e liberar sua memória?"]),
                        Row({
                            style: "justify-content: flex-end; gap: 8px; margin-top: 15px;",
                            children: [
                                Button({
                                    text: "Cancelar Fechamento (Ficar na Janela)",
                                    onClick: () => {
                                        const m = document.querySelector('.ui-modal-overlay.show');
                                        if (m) m.remove();
                                        console.log("❌ [beforeClose] Fechamento cancelado pelo usuário.");
                                        resolve(false); // BLOQUEIA O FECHAMENTO
                                    }
                                }),
                                Button({
                                    text: "Sim, Destruir Janela",
                                    variant: "danger",
                                    onClick: () => {
                                        const m = document.querySelector('.ui-modal-overlay.show');
                                        if (m) m.remove();
                                        console.log("✅ [beforeClose] Fechamento autorizado pelo usuário.");
                                        resolve(true); // PERMITE FECHAR
                                    }
                                })
                            ]
                        })
                    ]
                });
            });
        }
        return true;
    },

    // 13. DESTRUIÇÃO E LIMPEZA DE MEMÓRIA (Pós-Remoção)
    onDestroy() {
        if (this.state.timerId) {
            clearInterval(this.state.timerId);
        }
        console.log("🧹 [onDestroy] Janela destruída e timers/ouvintes limpos da memória.");
        Toast({ message: "Janela destruída e memória liberada!", type: "info" });
    },

    // Auxiliar para registrar log no console e no componente visual
    addLog(text) {
        console.log(text);
        const parts = text.split(" ");
        const tag = (parts[0] || "") + " " + (parts[1] || "");
        const content = text.substring(text.indexOf("] ") + 2);

        this.state.eventsLog.unshift({
            time: new Date().toLocaleTimeString(),
            tag: tag,
            text: content
        });
        if (this.state.eventsLog.length > 30) this.state.eventsLog.pop();
    },

    toggleTimer() {
        if (this.state.isAutoIncrementing) {
            clearInterval(this.state.timerId);
            this.state.timerId = null;
            this.state.isAutoIncrementing = false;
            this.addLog("⏹️ [Timer] Auto-incremento pausado.");
        } else {
            this.state.isAutoIncrementing = true;
            this.state.timerId = setInterval(() => {
                this.state.counter++;
            }, 1000);
            this.addLog("▶️ [Timer] Auto-incremento iniciado a cada 1s.");
        }
    },

    view() {
        return createElement("div", "flex-col", [
            // Painel Superior de Controles e Testes
            Card({
                title: "🧪 Controles de Teste do Ciclo de Vida",
                children: [
                    Row({
                        style: "align-items: center; gap: 12px; flex-wrap: wrap;",
                        children: [
                            Button({
                                text: `➕ Incrementar Contador (${this.state.counter})`,
                                variant: "primary",
                                onClick: () => {
                                    this.state.counter++;
                                }
                            }),
                            Button({
                                text: this.state.isAutoIncrementing ? "⏹️ Parar Timer" : "▶️ Iniciar Timer (1s)",
                                variant: this.state.isAutoIncrementing ? "danger" : "default",
                                onClick: () => this.toggleTimer()
                            }),
                            Checkbox({
                                label: "🛡️ Proteger fechamento (beforeClose)",
                                bind: "protectUnsavedChanges",
                                instance: this
                            }),
                            Button({
                                text: "🧹 Limpar Log",
                                onClick: () => {
                                    this.state.eventsLog = [];
                                }
                            })
                        ]
                    })
                ]
            }),

            // Painel de Logs em Tempo Real
            createElement("div", "", [
                createElement("h4", "", ["📜 Log de Eventos do Ciclo de Vida (Console & UI):", { style: "margin: 8px 0 4px 0;" }]),
                createElement("div", "", this.state.eventsLog.map(item => {
                    return createElement("div", "", [
                        createElement("span", "", [item.time], { style: "color: var(--text-muted, #64748b); font-size: 11px; margin-right: 8px; font-family: monospace;" }),
                        createElement("b", "", [item.tag + " "], { style: "color: var(--btn-primary, #2563eb); font-size: 12px;" }),
                        createElement("span", "", [item.text], { style: "font-size: 12px;" })
                    ], {
                        style: "padding: 5px 8px; border-bottom: 1px solid rgba(0,0,0,0.06); font-family: sans-serif; display: flex; align-items: center;"
                    });
                }), {
                    style: "background: rgba(0,0,0,0.02); border: 1px solid var(--win-border, #cbd5e1); border-radius: 6px; height: calc(100% - 30px); overflow-y: auto; padding: 4px;"
                })
            ], { style: "flex: 1; display: flex; flex-direction: column; overflow: hidden; margin-top: 8px;" })
        ]);
    }
};

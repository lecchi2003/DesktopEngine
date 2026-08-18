// screens/ChildModalDemoScreen.js
import { Desktop } from '../desktop.js';
import {
    createElement, Row, Col, Card, Button, Input, Select, Toast, Modal
} from '../ui.js';

export default {
    title: "Demonstração de Janelas Modais Filhas (Dialogs)",
    icon: "🪟",
    width: 760,
    height: 560,
    singleInstance: false,
    state: {
        selectedUser: "Nenhum selecionado",
        userRole: "-",
        dialogSettings: {
            modoCompacto: false,
            autoSave: true,
            corTema: "Azul"
        },
        historicoRetornos: []
    },

    // 1. DIÁLOGO FLUTUANTE (DEFAULT)
    async abrirSeletorDeUsuario() {
        const resultado = await this.openDialog({
            title: "👤 Diálogo: Selecionar Usuário",
            icon: "🔍",
            width: 440,
            height: 340,
            contained: false, // Flutua livremente no desktop mas bloqueia a janela mãe
            state: {
                usuarios: [
                    { nome: "Carlos Eduardo", cargo: "Administrador do Sistema" },
                    { nome: "Mariana Souza", cargo: "Analista Financeiro Sênior" },
                    { nome: "Rafael Lima", cargo: "Desenvolvedor Full-Stack" },
                    { nome: "Beatriz Mendes", cargo: "Gerente de Projetos" }
                ],
                selecionado: "Carlos Eduardo"
            },
            view() {
                return createElement("div", "flex-col", [
                    createElement("p", "", ["Selecione o usuário desejado para vincular à janela principal:"]),
                    createElement("label", "", ["Usuário Cadastrado:"]),
                    createElement("select", "filter-input", this.state.usuarios.map(u => {
                        return createElement("option", "", [`${u.nome} (${u.cargo})`], { value: u.nome });
                    }), {
                        value: this.state.selecionado,
                        onchange: (e) => {
                            this.state.selecionado = e.target.value;
                        }
                    }),
                    Row({
                        style: "justify-content: flex-end; gap: 8px; margin-top: auto;",
                        children: [
                            Button({
                                text: "Cancelar",
                                onClick: () => this.close(null) // Fecha sem valor
                            }),
                            Button({
                                text: "Confirmar Seleção",
                                variant: "primary",
                                onClick: () => {
                                    const userObj = this.state.usuarios.find(u => u.nome === this.state.selecionado) || this.state.usuarios[0];
                                    this.close(userObj); // Devolve o objeto selecionado!
                                }
                            })
                        ]
                    })
                ]);
            }
        });

        if (resultado) {
            this.state.selectedUser = resultado.nome;
            this.state.userRole = resultado.cargo;
            const logItem = `[${new Date().toLocaleTimeString()}] ✅ Usuário vinculado: ${resultado.nome} (${resultado.cargo})`;
            this.state.historicoRetornos = [logItem, ...this.state.historicoRetornos];
            Toast({ message: `Usuário "${resultado.nome}" selecionado com sucesso!`, type: "success" });
        } else {
            const logItem = `[${new Date().toLocaleTimeString()}] ℹ️ Seleção de usuário cancelada.`;
            this.state.historicoRetornos = [logItem, ...this.state.historicoRetornos];
            Toast({ message: "Seleção cancelada pelo usuário.", type: "info" });
        }
    },

    // 2. DIÁLOGO CONFINADO DENTRO DO ESPAÇO DA JANELA PAI (contained: true)
    async abrirConfiguracoesConfinadas() {
        const settings = await this.openDialog({
            title: "⚙️ Diálogo Confinado (contained: true)",
            icon: "🛠️",
            width: 440,
            height: 320,
            contained: true, // Confinado fisicamente dentro do contorno da janela pai!
            state: { ...this.state.dialogSettings },
            view() {
                return createElement("div", "flex-col", [
                    createElement("p", "text-secondary", [
                        "Esta sub-janela está configurada com ", createElement("code", "", ["contained: true"]),
                        ". Ela fica confinada dentro da janela mãe e não pode ser arrastada para fora!"
                    ]),
                    Row({
                        style: "gap: 8px; align-items: center; margin: 8px 0;",
                        children: [
                            createElement("input", "", [], {
                                type: "checkbox",
                                checked: this.state.autoSave,
                                onchange: (e) => this.state.autoSave = e.target.checked
                            }),
                            createElement("label", "", ["Habilitar salvamento automático"])
                        ]
                    }),
                    Row({
                        style: "gap: 8px; align-items: center; margin-bottom: 12px;",
                        children: [
                            createElement("input", "", [], {
                                type: "checkbox",
                                checked: this.state.modoCompacto,
                                onchange: (e) => this.state.modoCompacto = e.target.checked
                            }),
                            createElement("label", "", ["Modo de densidade compacta"])
                        ]
                    }),
                    Row({
                        style: "justify-content: flex-end; gap: 8px; margin-top: auto;",
                        children: [
                            Button({
                                text: "Cancelar",
                                onClick: () => this.close(null)
                            }),
                            Button({
                                text: "Salvar e Fechar",
                                variant: "primary",
                                onClick: () => this.close({ ...this.state })
                            })
                        ]
                    })
                ]);
            }
        });

        if (settings) {
            this.state.dialogSettings = settings;
            const logItem = `[${new Date().toLocaleTimeString()}] ✅ Preferências salvas (Confinado): AutoSave=${settings.autoSave}, Compacto=${settings.modoCompacto}`;
            this.state.historicoRetornos = [logItem, ...this.state.historicoRetornos];
            Toast({ message: "Preferências salvas com sucesso!", type: "success" });
        }
    },

    // 3. DIÁLOGO SEM BOTÃO 'X' (closable: false)
    async abrirDialogoSemBotaoFechar() {
        const resposta = await this.openDialog({
            title: "🔐 Confirmação Crítica (closable: false)",
            icon: "⚠️",
            width: 420,
            height: 240,
            closable: false, // Oculta o botão X da barra de título
            contained: true,
            state: {},
            view() {
                return createElement("div", "flex-col", [
                    createElement("p", "", [
                        "Note que esta janela não possui o botão ", createElement("b", "", ["'X'"]),
                        " na barra de título (", createElement("code", "", ["closable: false"]), "). O usuário é forçado a escolher uma das ações abaixo:"
                    ]),
                    Row({
                        style: "justify-content: flex-end; gap: 8px; margin-top: auto;",
                        children: [
                            Button({
                                text: "Rejeitar Termos",
                                variant: "danger",
                                onClick: () => this.close("REJEITADO")
                            }),
                            Button({
                                text: "Aceitar e Prosseguir",
                                variant: "primary",
                                onClick: () => this.close("ACEITO")
                            })
                        ]
                    })
                ]);
            }
        });

        if (resposta) {
            const logItem = `[${new Date().toLocaleTimeString()}] 🔐 Resposta de Confirmação (Sem X): ${resposta}`;
            this.state.historicoRetornos = [logItem, ...this.state.historicoRetornos];
            Toast({ message: `Ação registrada: ${resposta}`, type: resposta === "ACEITO" ? "success" : "warning" });
        }
    },

    // 4. TESTE DO COMPONENTE MODAL SEM BOTÃO 'X'
    abrirModalSemBotaoFechar() {
        Modal({
            title: "Aviso do Sistema (Modal Sem Botão Fechar)",
            closable: false, // Oculta o botão X
            instance: this,
            children: [
                createElement("p", "", [
                    "Este é um popup do componente ", createElement("code", "", ["Modal({ closable: false })"]),
                    " do ", createElement("code", "", ["ui.js"]), ". O botão 'X' superior foi desativado."
                ]),
                Row({
                    style: "justify-content: flex-end; gap: 8px; margin-top: 15px;",
                    children: [
                        Button({
                            text: "Entendido (Fechar Modal)",
                            variant: "primary",
                            onClick: () => {
                                const m = document.querySelector('.ui-modal-overlay.show');
                                if (m) m.remove();
                            }
                        })
                    ]
                })
            ]
        });
    },

    view() {
        return createElement("div", "flex-col", [
            Card({
                title: "🪟 Janela Principal (Janela Mãe)",
                children: [
                    createElement("p", "text-secondary", [
                        "Teste abaixo os diferentes comportamentos de ", createElement("b", "", ["Janelas Modais Filhas (Dialogs)"]),
                        " com retorno de dados assíncrono via ", createElement("code", "", ["await this.openDialog()"]), ":"
                    ]),
                    Row({
                        style: "gap: 8px; margin-top: 10px; flex-wrap: wrap;",
                        children: [
                            Button({
                                text: "👤 1. Diálogo Flutuante (Retorno)",
                                variant: "primary",
                                onClick: () => this.abrirSeletorDeUsuario()
                            }),
                            Button({
                                text: "📦 2. Confinado na Janela Pai (contained: true)",
                                onClick: () => this.abrirConfiguracoesConfinadas()
                            }),
                            Button({
                                text: "🔒 3. Sem Botão Fechar (closable: false)",
                                onClick: () => this.abrirDialogoSemBotaoFechar()
                            }),
                            Button({
                                text: "💬 4. Popup Modal Sem 'X'",
                                onClick: () => this.abrirModalSemBotaoFechar()
                            })
                        ]
                    })
                ]
            }),

            Card({
                title: "📥 Estado Reativo da Janela Mãe (Atualizado via Diálogo)",
                style: "margin-top: 10px;",
                children: [
                    Row({
                        style: "gap: 20px; align-items: center;",
                        children: [
                            createElement("div", "", [
                                createElement("small", "text-secondary", ["Usuário Selecionado:"]),
                                createElement("div", "", [createElement("b", "", [this.state.selectedUser])], { style: "font-size: 15px; color: var(--btn-primary, #2563eb);" })
                            ]),
                            createElement("div", "", [
                                createElement("small", "text-secondary", ["Cargo / Perfil:"]),
                                createElement("div", "", [createElement("b", "", [this.state.userRole])], { style: "font-size: 15px;" })
                            ]),
                            createElement("div", "", [
                                createElement("small", "text-secondary", ["Preferências Locais:"]),
                                createElement("div", "", [
                                    createElement("span", "badge", [`AutoSave: ${this.state.dialogSettings.autoSave ? 'ON' : 'OFF'}`]),
                                    createElement("span", "badge", [`Compacto: ${this.state.dialogSettings.modoCompacto ? 'ON' : 'OFF'}`], { style: "margin-left: 6px;" })
                                ])
                            ])
                        ]
                    })
                ]
            }),

            createElement("div", "", [
                createElement("h4", "", ["📜 Histórico de Retornos Assíncronos (await openDialog):", { style: "margin: 10px 0 4px 0;" }]),
                createElement("div", "", this.state.historicoRetornos.length === 0 ? [
                    createElement("p", "text-secondary", ["Nenhum diálogo concluído ainda. Clique nos botões acima para testar."])
                ] : this.state.historicoRetornos.map(item => {
                    return createElement("div", "", [item], {
                        style: "padding: 4px 8px; border-bottom: 1px solid rgba(0,0,0,0.06); font-family: monospace; font-size: 12px;"
                    });
                }), {
                    style: "background: rgba(0,0,0,0.02); border: 1px solid var(--win-border, #cbd5e1); border-radius: 6px; padding: 6px; flex: 1; overflow-y: auto;"
                })
            ], { style: "flex: 1; display: flex; flex-direction: column; overflow: hidden; margin-top: 6px;" })
        ]);
    }
};

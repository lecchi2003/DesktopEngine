// screens/EditorScreen.js
import { Desktop } from '../desktop.js';
import {
    createElement, Row, Col, Card, Button, Textarea, Toast, Modal
} from '../ui.js';

export default {
    title: "Editor de Documentos Pro",
    icon: "📝",
    width: 820,
    height: 560,
    singleInstance: false,
    status: "Linhas: 14 | Palavras: 68 | Pronto",
    state: {
        content: `# 🚀 DesktopEngine - Editor com Window MenuBar

Este editor possui uma **Barra de Menus (MenuBar)** integrada na janela, logo abaixo da barra de títulos.

### 📋 Experimente os Menus Acima:
- 📁 **Arquivo**: Novo Documento, Modelos Prontos, Salvar, Fechar Janela
- ✏️ **Editar**: Inserir Data e Hora, Gerar Texto Exemplo, Limpar
- 👁️ **Exibir**: Alternar Modos de Menu, Maximizar / Restaurar
- ❓ **Ajuda**: Sobre o Editor e Documentação Oficial

Clique em qualquer menu acima para ver os submenus em cascata!`,
    },
    menubar: [
        {
            label: "Arquivo",
            icon: "📁",
            items: [
                {
                    label: "Novo Documento",
                    icon: "📄",
                    shortcut: "Ctrl+N",
                    action: (inst) => {
                        inst.state.content = "# Novo Documento\n\nComece a digitar aqui...";
                        inst.setStatus("Novo documento criado.");
                        Toast({ message: "Novo documento iniciado!", type: "info" });
                    }
                },
                {
                    label: "Modelos Prontos...",
                    icon: "📂",
                    items: [
                        {
                            label: "Relatório Corporativo",
                            icon: "📊",
                            action: (inst) => {
                                inst.state.content = "# 📊 Relatório Executivo Mensal\n\n## 1. Sumário Executivo\nResultados positivos alcançados no trimestre...\n\n## 2. Métricas de Desempenho\n- Faturamento: R$ 450.000\n- Novos Leads: +35%\n- SLA de Atendimento: 99.4%";
                                inst.setStatus("Modelo carregado: Relatório Corporativo");
                                Toast({ message: "Modelo carregado.", type: "success" });
                            }
                        },
                        {
                            label: "Ata de Reunião",
                            icon: "🗓️",
                            action: (inst) => {
                                inst.state.content = `# 🗓️ Ata de Reunião - ${new Date().toLocaleDateString()}\n\n**Participantes:** Equipe de Engenharia\n**Pauta:** Lançamento da nova versão v0.7\n\n### Decisões:\n1. Aprovada integração do MenuBar em janelas\n2. Validados testes de responsividade e skins`;
                                inst.setStatus("Modelo carregado: Ata de Reunião");
                                Toast({ message: "Modelo carregado.", type: "success" });
                            }
                        }
                    ]
                },
                {
                    label: "Salvar",
                    icon: "💾",
                    shortcut: "Ctrl+S",
                    action: (inst) => {
                        inst.setStatus("Salvo com sucesso às " + new Date().toLocaleTimeString());
                        Toast({ message: "Documento salvo!", type: "success" });
                    }
                },
                "separator",
                {
                    label: "Fechar Janela",
                    icon: "❌",
                    shortcut: "Alt+F4",
                    action: (inst) => {
                        if (inst) inst.close();
                    }
                }
            ]
        },
        {
            label: "Editar",
            icon: "✏️",
            items: [
                {
                    label: "Inserir Data e Hora Atual",
                    icon: "🕒",
                    action: (inst) => {
                        const stamp = `\n> *Registrado em: ${new Date().toLocaleString('pt-BR')}*\n`;
                        inst.state.content += stamp;
                        inst.setStatus("Timestamp inserido.");
                    }
                },
                {
                    label: "Gerar Lorem Ipsum",
                    icon: "📝",
                    action: (inst) => {
                        inst.state.content += "\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";
                        inst.setStatus("Texto de exemplo adicionado.");
                    }
                },
                "separator",
                {
                    label: "Limpar Conteúdo",
                    icon: "🗑️",
                    action: (inst) => {
                        Modal({
                            title: "Confirmar Limpeza",
                            instance: inst,
                            children: [
                                createElement("p", "", ["Deseja realmente apagar todo o conteúdo do editor?"]),
                                Row({
                                    style: "justify-content: flex-end; gap: 8px; margin-top: 15px;",
                                    children: [
                                        Button({
                                            text: "Cancelar",
                                            onClick: () => {
                                                const m = document.querySelector('.ui-modal-overlay.show');
                                                if (m) m.remove();
                                            }
                                        }),
                                        Button({
                                            text: "Sim, Limpar",
                                            variant: "danger",
                                            onClick: () => {
                                                inst.state.content = "";
                                                inst.setStatus("Editor limpo.");
                                                const m = document.querySelector('.ui-modal-overlay.show');
                                                if (m) m.remove();
                                                Toast({ message: "Conteúdo apagado.", type: "warning" });
                                            }
                                        })
                                    ]
                                })
                            ]
                        });
                    }
                }
            ]
        },
        {
            label: "Exibir",
            icon: "👁️",
            items: [
                {
                    label: "Alternar Estilo de MenuBar",
                    icon: "🔄",
                    items: [
                        {
                            label: "MenuBar Completo",
                            action: (inst) => {
                                inst.setMenuBar(inst.config.menubar);
                                Toast({ message: "MenuBar completo restaurado.", type: "info" });
                            }
                        },
                        {
                            label: "MenuBar Minimalista",
                            action: (inst) => {
                                inst.setMenuBar([
                                    {
                                        label: "Ações Rápidas",
                                        icon: "⚡",
                                        items: [
                                            { label: "Salvar", icon: "💾", action: (i) => Toast({ message: "Salvo!", type: "success" }) },
                                            { label: "Limpar", icon: "🗑️", action: (i) => { i.state.content = ""; } },
                                            "separator",
                                            { label: "Restaurar Menu Completo", icon: "🔄", action: (i) => i.setMenuBar(i.config.menubar) }
                                        ]
                                    }
                                ]);
                                Toast({ message: "MenuBar minimalista ativado.", type: "info" });
                            }
                        }
                    ]
                },
                "separator",
                {
                    label: "Maximizar / Restaurar",
                    icon: "🗖",
                    action: (inst) => {
                        if (inst.windowEl && inst.windowEl.classList.contains("maximized")) inst.restore();
                        else inst.maximize();
                    }
                }
            ]
        },
        {
            label: "Ajuda",
            icon: "❓",
            items: [
                {
                    label: "Sobre o Editor",
                    icon: "ℹ️",
                    action: (inst) => {
                        Modal({
                            title: "Sobre o Editor Pro",
                            instance: inst,
                            children: [
                                createElement("div", "", [
                                    createElement("h3", "", ["📝 Editor de Documentos Pro"]),
                                    createElement("p", "", ["Aplicativo oficial com barra de menus (Window MenuBar) embutida na janela do DesktopEngine."]),
                                    createElement("ul", "", [
                                        createElement("li", "", ["Submenus multinível em cascata"]),
                                        createElement("li", "", ["Ícones e atalhos de teclado"]),
                                        createElement("li", "", ["Suporte a instance.setMenuBar(novosMenus)"]),
                                        createElement("li", "", ["Compatível com todos os temas e skins"])
                                    ])
                                ]),
                                Row({
                                    style: "justify-content: flex-end; margin-top: 15px;",
                                    children: [
                                        Button({
                                            text: "Fechar",
                                            onClick: () => {
                                                const m = document.querySelector('.ui-modal-overlay.show');
                                                if (m) m.remove();
                                            }
                                        })
                                    ]
                                })
                            ]
                        });
                    }
                },
                {
                    label: "Documentação Oficial",
                    icon: "📚",
                    action: () => {
                        window.open("docs.html#window-menubar", "_blank");
                    }
                }
            ]
        }
    ],
    view() {
        const lines = (this.state.content.match(/\n/g) || []).length + 1;
        const words = this.state.content.trim() ? this.state.content.trim().split(/\s+/).length : 0;
        const chars = this.state.content.length;

        this.setStatus(`Linhas: ${lines} | Palavras: ${words} | Caracteres: ${chars}`);

        return createElement("div", "flex-col", [
            Textarea({
                bind: "content",
                instance: this,
                placeholder: "Digite seu documento aqui...",
                style: "width: 100%; height: 100%; font-family: 'Segoe UI', 'Consolas', monospace; font-size: 13.5px; line-height: 1.6; resize: none; border: none; padding: 14px; box-sizing: border-box; background: transparent; color: inherit;"
            })
        ]);
    }
};

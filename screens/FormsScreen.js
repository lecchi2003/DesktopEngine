// screens/FormsScreen.js
import { Desktop } from '../desktop.js';
import { createElement, Card, Grid, Row, Input, Select, Toggle, Button, Modal } from '../ui.js';

export default {
    title: "Cadastro Avançado",
    icon: "📝",
    width: 600,
    height: 550,
    singleInstance: true,
    status: "Aguardando preenchimento",
    state: {
        nome: "", 
        dataNasc: "", 
        salario: "", 
        senioridade: "pleno", 
        ativo: true
    },
    actions: {
        salvar: [async (ctx) => {
            if (!ctx.state.nome) {
                Desktop.notify("Preencha o nome antes de salvar!", "warning");
                return;
            }
            Modal({
                title: "Confirmar Inclusão",
                instance: ctx.instance,
                children: [
                    createElement("p", "", [`Deseja salvar o funcionário ${ctx.state.nome}?`]),
                    Button({
                        text: "Sim, salvar", 
                        onClick: () => {
                            Desktop.notify("Salvo com sucesso!", "success");
                            ctx.instance.setStatus(`Salvo em ${new Date().toLocaleTimeString()}`);
                            document.querySelector('.ui-modal-overlay').remove();
                        }, 
                        variant: "success"
                    })
                ]
            });
        }]
    },
    view() {
        return createElement("div", "", [
            Card({
                title: "Dados Pessoais", 
                children: [
                    Grid({
                        columns: 2, 
                        children: [
                            Input({ label: "Nome Completo", bind: "nome", instance: this, placeholder: "Nome do funcionário" }),
                            Input({ label: "Data de Nascimento", bind: "dataNasc", instance: this, type: "date" })
                        ]
                    }),
                    Grid({
                        columns: 2, 
                        children: [
                            Input({ label: "Pretensão Salarial", bind: "salario", instance: this, type: "number", placeholder: "R$" }),
                            Select({
                                label: "Senioridade", bind: "senioridade", instance: this, options: [
                                    { label: "Júnior", value: "junior" },
                                    { label: "Pleno", value: "pleno" },
                                    { label: "Sênior", value: "senior" }
                                ]
                            })
                        ]
                    }),
                    Row({
                        children: [
                            Toggle({ label: "Funcionário Ativo", bind: "ativo", instance: this })
                        ]
                    })
                ]
            }),
            createElement("br", "", []),
            Button({ text: "Salvar Cadastro", onClick: "salvar", instance: this, variant: "primary" })
        ]);
    }
};

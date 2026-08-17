// screens/TaskScreen.js
import { createElement, Card, DraggableList } from '../ui.js';

export default {
    title: "Gerenciador de Tarefas",
    icon: "✅",
    width: 450,
    height: 500,
    singleInstance: true,
    state: {
        tarefas: [
            "Finalizar relatório mensal",
            "Reunião de alinhamento com a diretoria",
            "Aprovar pagamentos do setor de TI",
            "Revisar arquitetura do sistema v0.3",
            "Planejar confraternização da equipe"
        ]
    },
    actions: {
        reorder: [async (ctx, next, newItems) => {
            ctx.instance.setStatus("Ordem salva: " + new Date().toLocaleTimeString());
        }]
    },
    view() {
        return createElement("div", "", [
            Card({
                title: "Priorize arrastando (Drag & Drop)", 
                children: [
                    DraggableList({ bindItems: "tarefas", onReorder: "reorder", instance: this })
                ]
            })
        ]);
    }
};

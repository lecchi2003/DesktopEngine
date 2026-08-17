// screens/DataGridScreen.js
import { Desktop } from '../desktop.js';
import { DataGrid, Badge, Card, bindContextMenu, printElement, createElement } from '../ui.js';

export default {
    title: "Listagem de Clientes",
    icon: "🗃️",
    width: 750,
    height: 500,
    singleInstance: true,
    state: {
        clientes: [
            { id: 1, nome: "Acme Corp", setor: "Tecnologia", status: "Ativo", faturamento: 15000 },
            { id: 2, nome: "Global Industries", setor: "Manufatura", status: "Inativo", faturamento: 8500 },
            { id: 3, nome: "Stark Enterprises", setor: "Defesa", status: "Ativo", faturamento: 95000 },
            { id: 4, nome: "Wayne Enterprises", setor: "Investimentos", status: "Pendente", faturamento: 45000 },
            { id: 5, nome: "Cyberdyne Systems", setor: "IA", status: "Ativo", faturamento: 300000 }
        ]
    },
    view() {
        const gridEl = DataGrid({
            bindData: "clientes",
            instance: this,
            columns: [
                { key: "id", label: "ID", sortable: true },
                { key: "nome", label: "Razão Social", sortable: true, filterable: true },
                { key: "setor", label: "Setor", sortable: true, filterable: true },
                { key: "faturamento", label: "Faturamento", sortable: true, render: (val) => `R$ ${val.toLocaleString('pt-BR')}` },
                {
                    key: "status", label: "Status", sortable: true, filterable: true, render: (val) => {
                        let variant = "primary";
                        if (val === "Ativo") variant = "success";
                        if (val === "Inativo") variant = "danger";
                        if (val === "Pendente") variant = "warning";
                        return Badge({ text: val, variant });
                    }
                }
            ]
        });

        bindContextMenu(gridEl, [
            { label: "Exportar Tabela para CSV", action: () => Desktop.notify("Tabela exportada com sucesso!", "success") },
            { label: "Atualizar Dados", action: () => Desktop.notify("Dados atualizados.", "info") },
            "separator",
            { label: "Imprimir Relatório", action: () => printElement(gridEl, { title: "Relatório de Clientes" }) }
        ]);

        return createElement("div", "", [
            Card({
                title: "Base de Dados (Clique com botão direito!)", children: [
                    gridEl
                ]
            })
        ]);
    }
};

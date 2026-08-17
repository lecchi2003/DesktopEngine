// screens/DashboardScreen.js
import { Grid, Card, Badge, Row, Col, Table, ProgressBar, createElement } from '../ui.js';

export default {
    title: "Painel de Controle",
    icon: "📊",
    width: 700,
    height: 500,
    singleInstance: true,
    status: "Atualizado agora mesmo",
    state: {},
    view() {
        const tableData = [
            { id: 1, cliente: "Apple", valor: "R$ 45.000,00", status: "Pago" },
            { id: 2, cliente: "Microsoft", valor: "R$ 32.500,00", status: "Pendente" },
            { id: 3, cliente: "Google", valor: "R$ 89.000,00", status: "Atrasado" }
        ];

        return createElement("div", "", [
            Grid({
                columns: 3,
                children: [
                    Card({ title: "Vendas do Mês", children: [createElement("h2", "", ["R$ 166.500,00"])] }),
                    Card({ title: "Novos Clientes", children: [createElement("h2", "", ["143"])] }),
                    Card({ title: "Status do Servidor", children: [Badge({ text: "Online e Estável", variant: "success" })] })
                ]
            }),
            createElement("h3", "", ["Metas Trimestrais"]),
            Row({
                children: [
                    Col({
                        children: [
                            createElement("label", "", ["Faturamento"]),
                            ProgressBar({ value: 85, max: 100 })
                        ]
                    }),
                    Col({
                        children: [
                            createElement("label", "", ["Redução de Custos"]),
                            ProgressBar({ value: 40, max: 100 })
                        ]
                    })
                ]
            }),
            createElement("h3", "", ["Últimas Faturas"]),
            Table({
                columns: [
                    { key: "id", label: "ID" },
                    { key: "cliente", label: "Cliente" },
                    { key: "valor", label: "Valor" },
                    {
                        key: "status", label: "Situação", render: (val) => {
                            let variant = "primary";
                            if (val === "Pago") variant = "success";
                            if (val === "Atrasado") variant = "danger";
                            if (val === "Pendente") variant = "warning";
                            return Badge({ text: val, variant });
                        }
                    }
                ],
                data: tableData
            })
        ]);
    }
};

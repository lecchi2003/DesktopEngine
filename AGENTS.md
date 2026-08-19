# Regras de Documentação do Projeto

- **Sincronia de Docs**: Toda vez que você criar, editar ou atualizar o arquivo `docs.html` (ou qualquer arquivo da documentação web), você deve **OBRIGATORIAMENTE** atualizar o `README.md` para refletir as mesmas mudanças, garantindo que ambos fiquem 100% sincronizados em termos de componentes e explicações.

- **Funcionalidade de Framework**: Toda vez que for solicitado a criação de uma funcionalidade, sempre pense como ela pode ser adicionada ao framework. Se for simples a implementação usando os componentes existente, mostre o exemplo na documentação.

- **Showcase de funcionalidade**: Sempre que criar uma funcionalidade, incremente a index.html com exemplos de uso (sofisticados) dos elementos novos. Deixe a pagina index.html bem interativa e bonita, afinal ela é a página de demonstração do framework.

- **Tipo de implementação de funcionalidade**: Abordagem Híbrida (Declarativa + Programática)
  - Sempre que possível, utilize os componentes do framework de forma declarativa.
  - E preferivel também utilize a implementação programática utilizando os componentes criados no framework, (ex: `ElementBuilder.js`).
  - Evite utilizar `document.getElementById` para criar novos elementos.
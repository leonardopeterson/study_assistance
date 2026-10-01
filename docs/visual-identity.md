# Identidade visual do Assistance

Referência: `DESIGN_steep.md` e a imagem de gradiente fornecida pelo usuário.

## Adaptação ao produto

- Títulos serifados em Georgia, uma alternativa disponível no sistema; textos e controles em fontes do sistema. Não exige fontes pagas nem downloads externos.
- Fundo estático com nuances de azul, lavanda, pêssego e creme. Textura discreta produzida com CSS.
- Cartões com raio de 24 px, bordas discretas e fundos translúcidos; o desfoque atua somente na superfície, sem aplicar opacidade aos textos, gráficos ou controles.
- Nos blocos centrais de todas as abas, a camada de cor tem 16% de opacidade e desfoque gaussiano de 24 px, permitindo que o gradiente apareça. Cabeçalho e barra lateral mantêm seus valores anteriores. Formulários e menus continuam mais opacos.
- Navegação e ações principais em preto. O destaque pêssego marca a chamada de estudos. Cores funcionais de prioridades, atrasos e matérias permanecem distintas.
- A composição mantém o painel, a barra lateral e os dados reais do produto. Elementos de marketing, preços, métricas fictícias e interfaces de IA da referência não se aplicam ao Assistance.
- No celular, matérias e painéis laterais usam uma coluna. As abas de estudos têm rolagem própria. Calendários e caixas de seleção mantêm sua geometria funcional.
- Menus e formulários têm superfícies mais opacas para preservar a leitura. Navegadores sem suporte a desfoque e usuários que preferem reduzir transparência recebem superfícies sólidas.

## Organização

Os tokens compartilhados ficam em `src/app/globals.css`. A camada visual está em `src/app/identity.css`, importada depois do estilo estrutural no layout raiz. A aparência do gráfico usa os mesmos tokens.

Login, sessões, armazenamento, validação e integrações mantêm suas implementações existentes.

# Inspeção da base e decisões visuais

## Material recebido

- `hardkick-base-final.zip`: `index.html`, `professores.html`, `assets/app.js`, `style.css`, `mobile-v8.css`, `visual-v9.css` e sete imagens WebP.
- `hardkick-fotos-oficiais-renomeadas.zip`: dez JPGs e `LEIA-ME.txt`, lido como identificação do material, sem substituir as instruções do pedido.
- `logo.jpg`: 157 × 199 pixels, marca oficial fornecida.

Todos os arquivos de texto foram examinados. Todas as fotografias e ambas as versões do hero foram inspecionadas visualmente em pranchas, incluindo as imagens antigas a descartar.

## Diagnóstico

O agendamento original era uma simulação em `localStorage`, com professores fictícios, Muay Thai e horários sem validação de servidor. O mapa era desenhado em CSS com endereço demonstrativo. Havia três folhas de estilos com várias sobrescritas do hero, inclusive cortes móveis e regras conflitantes. Não havia autenticação, backend ou integração Calendar.

## Reaproveitamento

Preservados: paleta preta/dourada, headline do hero, tipografia condensada, composição editorial, gradientes integrados e foto dos dois lutadores. A marca antiga não correspondia à marca oficial e foi substituída. CSS foi reorganizado para eliminar cascatas conflitantes. O código de reserva simulado foi descartado integralmente.

Não foram usados bancos de imagem, IA ou retratos fictícios. Os arquivos oficiais de Diego e Mike são artes quadradas identificadas com texto; foram mantidos inteiros. Tim recebe o símbolo oficial e a indicação de perfil sem fotografia.

## Mapa de imagens

- Hero: imagem antiga autorizada dos dois lutadores, somente uma ocorrência no primeiro hero.
- Sobre: `studio-area-treino-com-logo`.
- Modalidades: `studio-area-treino-sacos`.
- Perfis: `professor-diego-david`, `professor-mike-ribeiro`.
- Estrutura: vista ampla, corredor/marca, equipamentos/frigobar, área com grade, equipamentos vertical.
- Contato: recepção.

Fotografias oficiais: WebP em 480, 800 e 1200 px. Hero: 480, 800 e 1400 px. `srcset`, `sizes`, dimensões declaradas e lazy loading fora do hero. A logo mantém sua resolução original limitada; não é apresentada como arquivo vetorial.

## Plano executado

1. Inspecionar fontes e imagens antes de programar.
2. Migrar para React/Vite/TypeScript com rotas e painel separado.
3. Implementar banco transacional, RLS e Edge Functions.
4. Adicionar painel, fila Calendar e documentação de credenciais.
5. Validar regras, interface responsiva, compilação e dependências.
6. Publicar o frontend e registrar bloqueios reais de ativação externa.

# Requirements Document

## Introduction

O Motor de Geração de Imagens do Capitão Caverna é uma funcionalidade que implementa um sistema combinatório programático baseado na matriz de prompts estruturada do documento "CAPITAO CAVERNA ULTIMATE PROMPTS". O sistema permite a geração dinâmica de imagens do mascote através da combinação de variáveis ortogonais (poses, trajes, calçados, adereços), integrando-se nativamente com a arquitetura edge-first da Cloudflare (Workers, D1, R2) e seguindo o fluxo de trabalho de ponta a ponta especificado no PRD v2.0.

## Requirements

### Requirement 1

**User Story:** Como um usuário autenticado da plataforma, eu quero selecionar entre mais de 36 poses primárias e de onboarding do Capitão Caverna, para que eu possa gerar imagens contextuais específicas para diferentes cenários de uso.

#### Acceptance Criteria

1. WHEN o usuário acessa a interface de geração THEN o sistema SHALL exibir todas as poses disponíveis categorizadas (Arms Crossed, Pointing Forward, Sitting on Rock, Holding Cave Map, etc.)
2. WHEN o usuário seleciona uma pose THEN o sistema SHALL mostrar preview ou descrição da pose selecionada
3. WHEN uma pose de onboarding é selecionada THEN o sistema SHALL automaticamente sugerir adereços compatíveis (Mapa da Caverna, Ampulheta Brilhante, Totem de Pedra)
4. WHEN a seleção é confirmada THEN o sistema SHALL incluir a pose específica no prompt de geração

### Requirement 2

**User Story:** Como um usuário da plataforma, eu quero escolher entre os 3 trajes principais do Capitão Caverna (Moletom com capuz + Calça de moletom, Camiseta + Shorts, Corta-vento + Shorts), para que eu possa adequar a aparência do mascote ao contexto desejado.

#### Acceptance Criteria

1. WHEN o usuário acessa a seleção de trajes THEN o sistema SHALL exibir os 3 trajes principais com descrições visuais claras
2. WHEN um traje é selecionado THEN o sistema SHALL validar compatibilidade com a pose escolhida
3. WHEN a combinação é válida THEN o sistema SHALL incluir a descrição específica do traje no prompt de geração
4. IF uma combinação é incompatível THEN o sistema SHALL sugerir alternativas ou alertar sobre possíveis inconsistências visuais

### Requirement 3

**User Story:** Como um usuário interessado em detalhes específicos, eu quero selecionar entre a extensa coleção de modelos específicos de tênis (Air Jordan 1 Chicago, Air Jordan 11 Bred, etc.), para que o Capitão Caverna tenha calçados autênticos e detalhados.

#### Acceptance Criteria

1. WHEN o usuário acessa a seleção de calçados THEN o sistema SHALL exibir todos os modelos específicos de tênis disponíveis organizados por categoria/marca
2. WHEN um modelo é selecionado THEN o sistema SHALL incluir a descrição técnica precisa do tênis no prompt
3. WHEN múltiplos modelos são compatíveis com o traje THEN o sistema SHALL permitir filtragem por compatibilidade
4. WHEN a seleção é finalizada THEN o sistema SHALL garantir que a descrição do calçado seja tecnicamente precisa no prompt final

### Requirement 4

**User Story:** Como desenvolvedor implementando o fluxo de trabalho de ponta a ponta, eu quero que o sistema execute a sequência completa (Interface → API → Geração Externa → R2 → D1 → Resposta), para que a arquitetura edge-first seja totalmente aproveitada.

#### Acceptance Criteria

1. WHEN uma requisição POST chega em /api/v1/images/generate THEN o Worker SHALL validar autenticação e construir o prompt completo
2. WHEN o prompt é enviado para o serviço externo (Midjourney/DALL-E/Stable Diffusion) THEN o Worker SHALL receber a URL temporária da imagem
3. WHEN a URL temporária é recebida THEN o Worker SHALL fazer fetch dos dados da imagem como blob/buffer
4. WHEN os dados são obtidos THEN o Worker SHALL usar env.IMAGE_BUCKET.put() para armazenar no R2 com chave UUID única
5. WHEN o upload no R2 é concluído THEN o Worker SHALL inserir registro na tabela GeneratedImages do D1 com metadados completos
6. WHEN todos os passos são concluídos THEN o Worker SHALL retornar a URL pública do R2 para o cliente

### Requirement 5

**User Story:** Como desenvolvedor responsável pela integração com D1, eu quero que o sistema utilize o esquema relacional proposto no PRD, para que os dados sejam estruturados e auditáveis conforme a migração do Firestore.

#### Acceptance Criteria

1. WHEN uma imagem é gerada THEN o sistema SHALL inserir registro na tabela GeneratedImages com image_id (UUID), user_id (FK), r2_object_key, prompt_parameters (JSON), created_at, status
2. WHEN os parâmetros são armazenados THEN o sistema SHALL serializar o payload JSON completo (pose, outfit, footwear, prop) na coluna prompt_parameters
3. WHEN uma consulta é feita THEN o sistema SHALL poder filtrar por user_id, status, ou consultar o JSON dos parâmetros
4. WHEN o sistema precisa de auditoria THEN o sistema SHALL permitir rastreamento completo de quais parâmetros geraram cada imagem

### Requirement 6

**User Story:** Como administrador preocupado com custos e performance, eu quero que o sistema aproveite os zero egress fees do R2 e a co-localização com Workers, para que a solução seja economicamente viável e performática.

#### Acceptance Criteria

1. WHEN uma imagem é servida THEN o sistema SHALL utilizar a URL pública do R2 sem taxas de egresso
2. WHEN o Worker acessa o D1 THEN o sistema SHALL se beneficiar da co-localização na mesma rede de borda
3. WHEN múltiplas requisições são feitas THEN o sistema SHALL aproveitar a replicação de leitura do D1 para latência mínima
4. WHEN o custo é calculado THEN o sistema SHALL operar com o modelo de preços baseado em linhas lidas/escritas do D1 e armazenamento do R2

### Requirement 7

**User Story:** Como desenvolvedor implementando o sistema de templates, eu quero um sistema de prompts base flexível que combine a descrição central do Capitão Caverna com variáveis contextuais, para que todas as imagens geradas mantenham consistência visual e identidade da marca.

#### Acceptance Criteria

1. WHEN o sistema constrói um prompt THEN o sistema SHALL usar um template base contendo a descrição central do personagem ("lobo cinza e creme confiante com olhos vermelhos intensos...")
2. WHEN variáveis são selecionadas THEN o sistema SHALL injetar as descrições específicas de pose, traje, calçado e adereços no template
3. WHEN um prompt de onboarding é solicitado THEN o sistema SHALL incluir elementos do ambiente da caverna (rochas, cristais, atmosfera subterrânea)
4. WHEN o prompt final é gerado THEN o sistema SHALL garantir que a estrutura seja consistente e otimizada para o serviço de geração escolhido

### Requirement 8

**User Story:** Como designer de experiência, eu quero que o sistema utilize os prompts estruturados detalhados do documento "CAPITAO CAVERNA ULTIMATE PROMPTS" com especificações técnicas completas, para que todas as imagens geradas mantenham a mais alta qualidade e consistência visual da marca.

#### Acceptance Criteria

1. WHEN o sistema constrói um prompt THEN o sistema SHALL incluir as especificações técnicas completas: "Ultra-high-resolution, physically-based render", "Cathedral-scale granite & limestone architecture", especificações de iluminação detalhadas
2. WHEN elementos do ambiente da caverna são incluídos THEN o sistema SHALL usar as especificações exatas: "STRUCTURAL SPECIFICATIONS", "LIGHTING ARCHITECTURE", "NATURAL ELEMENTS", "TECHNICAL RENDERING"
3. WHEN o personagem é renderizado THEN o sistema SHALL aplicar todas as especificações de "CHARACTER FOUNDATION", "BODY-PROPORTION REINFORCEMENT", "HAND-COLOUR LOCK", "FINGER-COUNT ENFORCEMENT"
4. WHEN prompts negativos são aplicados THEN o sistema SHALL incluir todos os elementos de "NEGATIVE PROMPT (GLOBAL)" e especificações de salvaguarda

### Requirement 9

**User Story:** Como desenvolvedor implementando frames específicos de onboarding, eu quero que o sistema suporte a geração de sequências narrativas baseadas nos frames detalhados (01A-12C), para que possamos criar experiências de onboarding cinematográficas e imersivas.

#### Acceptance Criteria

1. WHEN um frame específico é solicitado THEN o sistema SHALL aplicar as especificações exatas de "EXACT LOCATION", "CHARACTER POSITIONING", "LIMB METRICS", "POSE SPECIFICS", "FACIAL EXPRESSION", "LIGHTING ON CHARACTER", "CAMERA", "ENVIRONMENTAL TOUCHES"
2. WHEN frames sequenciais são gerados THEN o sistema SHALL manter continuidade visual usando "CONTINUITY STANDARDS"
3. WHEN voiceover é especificado THEN o sistema SHALL registrar o texto correspondente nos metadados da imagem
4. WHEN múltiplos frames são solicitados THEN o sistema SHALL permitir geração em lote mantendo a sequência narrativa

### Requirement 10

**User Story:** Como usuário final, eu quero que o sistema seja resiliente e forneça feedback claro sobre o status da geração, para que eu tenha uma experiência confiável mesmo com dependências externas.

#### Acceptance Criteria

1. WHEN uma geração é iniciada THEN o sistema SHALL retornar status PENDING e permitir polling do progresso
2. WHEN o serviço externo falha THEN o sistema SHALL implementar retry com backoff exponencial (3 tentativas)
3. WHEN todas as tentativas falham THEN o sistema SHALL marcar status como FAILED e registrar erro detalhado
4. WHEN a geração é concluída THEN o sistema SHALL atualizar status para COMPLETE e retornar URL final
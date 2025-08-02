# Troubleshooting Guide - Modo Caverna

## Common Issues and Solutions (Problemas Comuns e Soluções)

### Authentication Issues (Problemas de Autenticação)

#### 1. Login Problems - Problemas de Login

**Problema:** "Não consigo fazer login"
**Portuguese UI:** "E-mail ou senha incorretos", "Tente novamente"

**Soluções Ordenadas por Probabilidade:**

1. **Verificação Básica**
   - Confirme se o e-mail está digitado corretamente (sem espaços)
   - Verifique se a senha está correta (atenção ao Caps Lock)
   - Certifique-se de que não há caracteres especiais não intencionais

2. **Problemas de Cache/Navegador**
   - Limpe o cache do navegador (Ctrl+Shift+Delete)
   - Tente em uma aba anônima/privada
   - Desative extensões do navegador temporariamente
   - Atualize a página (F5) e tente novamente

3. **Problemas de Conectividade**
   - Verifique sua conexão com a internet
   - Tente acessar outros sites para confirmar conectividade
   - Aguarde alguns minutos e tente novamente
   - Tente em outro dispositivo/rede

4. **Problemas de Conta**
   - Use a opção "Esqueceu a senha?" se não lembra
   - Verifique se a conta foi criada com este e-mail
   - Confirme se a conta não foi suspensa ou desativada

**Quando Contatar Suporte:**
- Após tentar todas as soluções acima
- Se receber mensagens de erro específicas
- Se o problema persistir por mais de 24 horas

---

#### 2. Password Recovery Issues - Problemas de Recuperação

**Problema:** "Não recebi o e-mail de recuperação"
**Portuguese UI:** "E-mail enviado", "Verifique sua caixa de entrada"

**Soluções Detalhadas:**

1. **Verificação de E-mail**
   - Verifique a pasta de spam/lixo eletrônico
   - Procure por remetente "noreply@modocaverna.com"
   - Aguarde até 15 minutos (pode haver atraso)
   - Verifique se o e-mail digitado está correto

2. **Problemas de Provedor**
   - Alguns provedores bloqueiam e-mails automáticos
   - Adicione o domínio à lista de remetentes confiáveis
   - Tente com outro e-mail se disponível
   - Verifique configurações de segurança do e-mail

3. **Problemas Técnicos**
   - Tente solicitar nova recuperação após 10 minutos
   - Use outro navegador ou dispositivo
   - Verifique se não há bloqueadores de pop-up ativos

**Solução Alternativa:**
- Entre em contato com suporte informando:
  - E-mail da conta
  - Último acesso aproximado
  - Dispositivo/navegador utilizado

---

### Dashboard and Navigation (Painel e Navegação)

#### 3. Dashboard Loading Issues - Problemas de Carregamento

**Problema:** "Dashboard não carrega ou mostra dados antigos"
**Portuguese UI:** "Carregando...", "Erro ao carregar dados"

**Diagnóstico e Soluções:**

1. **Problemas de Sincronização**
   ```
   Sintomas: Dados desatualizados, contadores incorretos
   Soluções:
   - Force atualização com Ctrl+F5
   - Aguarde 30 segundos para sincronização automática
   - Faça logout e login novamente
   - Verifique conexão com internet
   ```

2. **Problemas de Performance**
   ```
   Sintomas: Carregamento lento, travamentos
   Soluções:
   - Feche outras abas do navegador
   - Limpe cache e cookies
   - Reinicie o navegador
   - Verifique uso de memória do dispositivo
   ```

3. **Problemas de Compatibilidade**
   ```
   Sintomas: Layout quebrado, botões não funcionam
   Soluções:
   - Atualize o navegador para versão mais recente
   - Tente em Chrome, Firefox ou Safari
   - Desative modo de compatibilidade
   - Verifique se JavaScript está habilitado
   ```

**Navegadores Recomendados:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

### Challenge System (Sistema de Desafios)

#### 4. Challenge Setup Problems - Problemas na Configuração

**Problema:** "Não consigo salvar configuração do desafio"
**Portuguese UI:** "Erro ao salvar", "Tente novamente"

**Validação de Dados:**

1. **Campos Obrigatórios**
   - Objetivo principal: Mínimo 10 caracteres, máximo 200
   - Pelo menos 1 hábito para eliminar
   - Pelo menos 1 novo hábito
   - Horários válidos (formato 24h)

2. **Limites do Sistema**
   - Máximo 5 hábitos para eliminar
   - Máximo 5 novos hábitos
   - Objetivo deve ser específico e mensurável
   - Horários não podem conflitar

3. **Problemas Técnicos**
   - Aguarde conclusão do salvamento (não clique múltiplas vezes)
   - Verifique conexão durante o processo
   - Tente salvar seção por seção se falhar
   - Use "Salvar Rascunho" para preservar progresso

**Dicas para Sucesso:**
- Seja específico nos objetivos
- Comece com poucos hábitos
- Defina horários realistas
- Teste a configuração antes de confirmar

---

#### 5. Daily Tracking Issues - Problemas no Acompanhamento

**Problema:** "Check-in não está registrando"
**Portuguese UI:** "Marcar como completo", "Progresso salvo"

**Cenários Comuns:**

1. **Timing de Check-in**
   ```
   Problema: Check-in não conta para o dia
   Causa: Feito após meia-noite do dia seguinte
   Solução: Configure fuso horário correto nas configurações
   Prevenção: Faça check-in antes das 23:59
   ```

2. **Sincronização de Dados**
   ```
   Problema: Progresso não aparece no grid
   Causa: Falha na sincronização
   Solução: 
   - Aguarde 1-2 minutos
   - Atualize a página
   - Verifique conexão
   - Refaça o check-in se necessário
   ```

3. **Múltiplos Dispositivos**
   ```
   Problema: Progresso diferente em dispositivos
   Causa: Sincronização pendente
   Solução:
   - Use sempre o mesmo dispositivo para check-in
   - Aguarde sincronização antes de trocar
   - Force sync fazendo logout/login
   ```

---

### Community Features (Funcionalidades da Comunidade)

#### 6. Feed and Interaction Problems - Problemas no Feed

**Problema:** "Não consigo postar na comunidade"
**Portuguese UI:** "Publicar post", "Erro ao publicar"

**Verificações Necessárias:**

1. **Conteúdo do Post**
   - Mínimo 10 caracteres
   - Máximo 2000 caracteres
   - Sem conteúdo ofensivo ou spam
   - Imagens em formato JPG/PNG (máx 5MB)

2. **Permissões de Usuário**
   - Conta verificada e ativa
   - Não estar em período de suspensão
   - Ter completado onboarding básico
   - Respeitar limites de postagem (máx 10/dia)

3. **Problemas Técnicos**
   - Aguarde upload completo de imagens
   - Verifique conexão durante publicação
   - Tente postar apenas texto primeiro
   - Use outro navegador se persistir

---

### Productivity Features (Funcionalidades de Produtividade)

#### 7. Pomodoro Timer Issues - Problemas no Timer

**Problema:** "Timer não funciona corretamente"
**Portuguese UI:** "Iniciar Pomodoro", "Pausar", "Finalizar"

**Problemas Comuns:**

1. **Timer Não Inicia**
   ```
   Verificações:
   - JavaScript habilitado no navegador
   - Aba do Modo Caverna ativa (não em background)
   - Sem bloqueadores interferindo
   - Áudio habilitado para notificações
   ```

2. **Timer Para Sozinho**
   ```
   Causas Possíveis:
   - Computador entrou em modo de economia
   - Aba perdeu foco por muito tempo
   - Problemas de conectividade
   - Navegador limitou scripts em background
   
   Soluções:
   - Mantenha aba ativa durante sessão
   - Configure computador para não hibernar
   - Use modo tela cheia se disponível
   ```

3. **Notificações Não Funcionam**
   ```
   Configurações:
   - Permita notificações do site
   - Verifique volume do sistema
   - Teste notificações em configurações
   - Use fones se em ambiente silencioso
   ```

---

### File Management (Gerenciamento de Arquivos)

#### 8. Upload Problems - Problemas de Upload

**Problema:** "Não consigo fazer upload de arquivos"
**Portuguese UI:** "Selecionar arquivo", "Upload concluído"

**Limitações e Soluções:**

1. **Tipos de Arquivo Suportados**
   ```
   Documentos: PDF, DOC, DOCX, TXT
   Imagens: JPG, PNG, GIF
   Tamanho máximo: 10MB por arquivo
   Limite diário: 50 uploads
   ```

2. **Problemas de Upload**
   ```
   Arquivo muito grande:
   - Comprima o arquivo
   - Divida em partes menores
   - Use ferramentas de otimização
   
   Formato não suportado:
   - Converta para formato aceito
   - Use PDF para documentos
   - Use JPG para imagens
   ```

3. **Falhas de Conectividade**
   ```
   Upload interrompido:
   - Verifique estabilidade da conexão
   - Tente em horário de menor tráfego
   - Use conexão cabeada se possível
   - Aguarde e tente novamente
   ```

---

## Advanced Troubleshooting (Solução Avançada de Problemas)

### Performance Optimization (Otimização de Performance)

#### System Requirements (Requisitos do Sistema)
```
Mínimo Recomendado:
- RAM: 4GB (8GB recomendado)
- Processador: Dual-core 2GHz+
- Conexão: 5 Mbps estável
- Armazenamento: 1GB livre para cache

Navegador Otimizado:
- Máximo 10 abas abertas
- Cache limpo semanalmente
- Extensões mínimas ativas
- JavaScript e cookies habilitados
```

#### Performance Monitoring
```
Sinais de Problemas:
- Carregamento > 5 segundos
- Travamentos frequentes
- Uso de CPU > 80%
- Memória > 90%

Soluções Preventivas:
- Reinicie navegador diariamente
- Limpe cache semanalmente
- Monitore uso de recursos
- Mantenha sistema atualizado
```

### Data Backup and Recovery (Backup e Recuperação)

#### Automatic Backups
```
Sistema de Backup:
- Dados sincronizados em tempo real
- Backup completo diário
- Histórico de 30 dias
- Recuperação automática de falhas

Dados Protegidos:
- Progresso de desafios
- Configurações de rituais
- Histórico de atividades
- Preferências pessoais
```

#### Manual Data Export
```
Exportação Disponível:
- Relatório de progresso (PDF)
- Dados de desafios (CSV)
- Histórico de atividades (JSON)
- Configurações (Backup file)

Como Exportar:
1. Acesse Configurações > Dados
2. Selecione tipo de exportação
3. Aguarde processamento
4. Baixe arquivo gerado
```

### Emergency Procedures (Procedimentos de Emergência)

#### Account Recovery
```
Cenários de Emergência:
- Conta hackeada ou comprometida
- Perda de acesso total
- Dados corrompidos
- Problemas técnicos graves

Procedimento de Recuperação:
1. Entre em contato imediato com suporte
2. Forneça informações de verificação
3. Aguarde análise de segurança
4. Siga instruções de recuperação
5. Altere senhas após recuperação
```

#### Data Loss Prevention
```
Prevenção de Perda:
- Faça check-ins regulares
- Mantenha múltiplos dispositivos sincronizados
- Export dados importantes mensalmente
- Documente progresso externamente

Sinais de Alerta:
- Dados não sincronizam
- Progresso desaparece
- Configurações resetam
- Erros de banco de dados
```

## Contact Support (Contatar Suporte)

### When to Contact Support
```
Situações para Contato:
- Problemas técnicos persistentes (>24h)
- Perda de dados importantes
- Suspeita de problemas de segurança
- Bugs que impedem uso normal
- Dúvidas sobre funcionalidades
```

### Information to Provide
```
Informações Necessárias:
- E-mail da conta
- Descrição detalhada do problema
- Passos para reproduzir o erro
- Navegador e versão
- Sistema operacional
- Screenshots se aplicável
- Horário aproximado do problema
```

### Response Times
```
Tempo de Resposta:
- Problemas críticos: 2-4 horas
- Problemas técnicos: 24 horas
- Dúvidas gerais: 48 horas
- Sugestões: 72 horas

Canais de Suporte:
- E-mail: suporte@modocaverna.com
- Chat interno (usuários premium)
- Comunidade (ajuda entre usuários)
```

This comprehensive troubleshooting guide addresses the most common issues users face and provides clear, actionable solutions while maintaining the Portuguese UI terminology and Modo Caverna philosophy.


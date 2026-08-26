# Operação do Projeto Elo

Este runbook cobre os cadastros públicos, a triagem administrativa, doações, solicitações, anexos e transparência.

## Preparação do ambiente

No container do Universo, com `DATABASE_URL` configurada:

```bash
npm run db:setup
npm run quality:elo
```

A migração `021_elo_operations.sql` é obrigatória. Ela ativa o módulo, protege a idempotência das doações SumUp, cria protocolos públicos e instala a limitação antiabuso.

## Fluxo público

1. A pessoa acessa **Projeto Elo > Participar**.
2. Escolhe doação de cabelo/material, solicitação de atendimento, voluntariado ou parceria.
3. Informa ao menos um canal de contato e aceita a política de privacidade.
4. O sistema cria participante, solicitação de triagem, histórico e protocolo na mesma transação.
5. A equipe encontra o registro em **Admin > Projeto Elo**.

O formulário aceita no máximo cinco envios por endereço de origem a cada hora e contém campo armadilha contra robôs.

## Triagem administrativa

1. Abra o participante e confira os dados e o consentimento.
2. Defina um responsável e altere o status de `Novo` para `Em análise`.
3. Registre observações no histórico; nunca use o campo para senhas ou dados financeiros completos.
4. Crie ou atualize solicitações e prioridades.
5. Use anexos apenas para PDF, JPG, PNG ou WEBP de até 10 MB.
6. Marque `Concluído` somente depois do ciclo real de atendimento.

Arquivar é uma exclusão lógica: o registro deixa a lista ativa, mas o histórico e a auditoria são preservados.

Em produção com armazenamento local, `UPLOAD_DIR` precisa apontar para um volume persistente do Coolify (por exemplo, `/data/elo-uploads`). Sem volume, anexos podem desaparecer após recriar o container. O download passa pela API autenticada do admin; o diretório não deve ser publicado diretamente.

## Doações

- Doações online são consolidadas pelo retorno ou webhook SumUp, com uma única doação por checkout.
- Doações manuais devem registrar valor, data, meio e situação.
- Somente registros `Concluídos` entram na página pública de transparência.
- Não marque manualmente como concluído sem comprovante operacional.

## Verificação diária

Execute `npm run quality:elo` e revise:

- checkouts pagos sem doação consolidada;
- duplicidade por checkout;
- cadastros públicos sem consentimento ou solicitação;
- casos prioritários sem responsável há mais de 48 horas;
- participantes novos sem movimentação há mais de sete dias.

## Checklist após deploy

- `/api/health` responde `200` e banco conectado.
- `/projeto-elo`, `/projeto-elo/participar` e `/projeto-elo/transparencia` abrem.
- Um cadastro de teste aparece no admin com protocolo, solicitação e consentimento.
- Edição, responsável, nota, doação e solicitação persistem após recarregar.
- Upload e remoção de um anexo de teste funcionam.
- Uma doação SumUp de teste cria somente um registro mesmo após retorno e webhook.
- O CSV abre sem executar conteúdo iniciado por `=`, `+`, `-` ou `@`.

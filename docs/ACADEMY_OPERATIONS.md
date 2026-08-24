# Operação da Invisible Academy

Este runbook cobre a rotina da Academy após as fases de cursos, currículo, alunas e certificados.

## Rotina diária

1. Acesse **Admin > Academy > Operação**.
2. Confirme que o estado está como **Operação saudável**.
3. Revise matrículas pendentes há mais de 24 horas.
4. Contate alunas sem atividade há 14 dias.
5. Corrija imediatamente cursos ativos sem aulas publicadas ou conclusões sem certificado.

Os alertas são calculados diretamente no banco no momento da consulta. Nenhum dado pessoal é enviado a serviços externos.

## Exportações

A central oferece CSV de matrículas, progresso e certificados. Os arquivos exigem sessão administrativa e não devem ser publicados nem anexados em canais abertos. Os valores são protegidos contra execução de fórmulas ao abrir em Excel ou Google Sheets.

## Verificação antes e depois do deploy

No container com `DATABASE_URL` configurada:

```bash
npm run db:setup
npm run quality:academy
```

O comando de qualidade é somente leitura. Ele retorna código diferente de zero apenas em falhas críticas; avisos operacionais não bloqueiam deploy.

Checklist:

- `GET /api/health` responde `200` e informa banco conectado.
- Login administrativo funciona no domínio principal e nos subdomínios autorizados.
- A central de Operação carrega sem erro.
- As três exportações baixam CSV.
- Uma aula pode ser concluída no painel da aluna.
- A conclusão elegível emite certificado e o PDF abre.
- Certificado revogado não pode ser baixado.

## Incidentes

### Saúde retorna 503

1. Verifique `DATABASE_URL` no Coolify.
2. Confirme que o PostgreSQL está ativo e acessível pela rede interna.
3. Consulte os logs do container antes de reiniciar.
4. Não execute restauração sem validar o backup e o banco-alvo.

### Conclusão sem certificado

1. Confira se o curso permite certificado e possui aulas publicadas.
2. Confirme o percentual mínimo configurado.
3. Use **Academy > Certificados > Emitir/Revalidar**.
4. Registre o motivo caso seja necessário revogar.

### Upload de assinatura falha

Use PNG ou JPEG de até 1 MB e 20 megapixels. A assinatura é armazenada no banco e congelada no certificado emitido; substituir a imagem do curso não altera certificados antigos.

## Retenção e privacidade

- Exporte dados pessoais somente para finalidade administrativa.
- Apague cópias locais quando deixarem de ser necessárias.
- Não remova registros de auditoria para ocultar operações.
- Antes de excluir ou anonimizar uma aluna, verifique as obrigações fiscais, contratuais e de certificação aplicáveis.

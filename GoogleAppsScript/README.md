# Configuração do questionário e da planilha

O site usa um questionário próprio hospedado em Google Apps Script. O identificador aleatório da sessão, o modo e a entropia estimada da senha são enviados no corpo de um formulário POST oculto; não são exibidos nos campos nem na URL do questionário. A senha em si não é enviada.

## Criar e autorizar a planilha

1. Abra [script.google.com](https://script.google.com/) e crie um projeto independente.
2. Substitua o conteúdo de `Code.gs` pelo arquivo deste diretório.
3. Crie um arquivo HTML chamado `Index` e cole nele o conteúdo de `Index.html`.
4. No editor, selecione `setupSpreadsheet` e clique em **Executar**. Na primeira execução, revise e aceite as permissões do Google para criar e preencher a planilha.
5. Consulte o registro de execução para abrir a planilha criada. O ID também fica salvo nas propriedades do projeto. A função é idempotente: executá-la de novo reutiliza a mesma planilha.

## Publicar como aplicativo da web

1. Em **Implantar → Nova implantação**, escolha **Aplicativo da web**.
2. Defina **Executar como: você** e, para que participantes sem conta Google possam responder, escolha o acesso público disponível na sua conta (normalmente **Qualquer pessoa**).
3. Implante e copie o URL do aplicativo terminado em `/exec`.
4. Cole esse URL em `window.POST_SURVEY_WEB_APP_URL` em `pos.html` e publique os arquivos estáticos atualizados no bucket.

O URL público permite que qualquer pessoa envie respostas ao formulário. A planilha permanece na sua conta; não compartilhe o acesso à planilha. Atualizar `Code.gs` e publicar uma nova versão do Apps Script **não recria nem apaga a planilha**: `setupSpreadsheet` reutiliza a planilha cujo ID já está salvo nas propriedades do projeto. Ao receber a primeira resposta com o código novo, os novos cabeçalhos (entropia, tentativas e duração) são adicionados à aba `Respostas`, preservando as linhas existentes. Não execute `setupSpreadsheet` em outro projeto se deseja continuar usando a planilha atual.

O formulário registra a contagem de envios do cadastro que tinham usuário preenchido e a duração entre abrir `register.html` e concluir o cadastro. A senha nunca é enviada.

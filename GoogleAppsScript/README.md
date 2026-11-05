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

O URL público permite que qualquer pessoa envie respostas ao formulário. A planilha em si continua na sua conta; não compartilhe o acesso à planilha. O Apps Script valida os campos de escala, modo, formato do identificador e faixa de entropia antes de gravar cada resposta. A coluna `Entropia da senha (bits)` é adicionada ao cabeçalho da planilha existente automaticamente; não é necessário acrescentar uma pergunta visível ao questionário. Depois de atualizar `Code.gs` e `Index.html`, crie uma nova versão da implantação do aplicativo da web.

# Cookies do Instagram para teste local

Alguns posts do Instagram nao entregam a URL da midia para visitante anonimo.
Para testar download real, exporte cookies de uma conta logada e autorizada.

## Caminho esperado

Salve o arquivo aqui:

```text
cookies/instagram-cookies.txt
```

Esse arquivo esta ignorado pelo Git.

## Como exportar

1. Abra o Edge.
2. Entre no Instagram e confirme que consegue ver o post.
3. Instale uma extensao que exporte cookies no formato Netscape cookies.txt.
4. Exporte apenas cookies de `instagram.com`.
5. Salve como `cookies/instagram-cookies.txt`.
6. Teste de novo no app.

Depois que o arquivo existir, nao precisa reiniciar o servidor para cada novo
link. Reinicie apenas se alterar `.env.local`.

# InstagramLinker

App Next.js para resolver links publicos/autorizados do Instagram e entregar
arquivos de download na melhor qualidade disponivel.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- lucide-react
- yt-dlp como motor local de resolucao

## Rodando localmente

```bash
npm run dev
```

Abra `http://localhost:3000`.

## Seguranca

- Nunca suba `www.instagram.com_cookies.txt`, `.env.local` ou qualquer cookie
  pessoal para GitHub/Vercel.
- Cookies pessoais sao bloqueados em producao por padrao. Para liberar seria
  necessario definir `ALLOW_SERVER_COOKIES=true`, mas isso nao e recomendado
  para um site publico.
- Em producao, prefira `INSTAGRAM_RESOLVER_ENDPOINT` apontando para um backend
  dedicado, com rate limit, observabilidade e credenciais isoladas.
- As rotas validam links do Instagram, aplicam rate limit basico e bloqueiam
  downloads de hosts de midia fora de dominios esperados do Instagram/CDN.

## Motor de download

A rota `POST /api/resolve` valida e normaliza links do Instagram e usa `yt-dlp`
para encontrar as midias. A rota `GET /api/download` re-resolve a midia e envia
o arquivo como anexo, para o botao baixar de forma mais confiavel.

Instale o `yt-dlp` no ambiente onde o app roda:

```bash
python -m pip install -U "yt-dlp[default,curl-cffi]"
```

Se o binario nao estiver no PATH, configure:

```bash
YTDLP_PATH=C:\caminho\para\yt-dlp.exe
```

Para posts que exigem login, exporte cookies de uma conta autorizada e configure:

```bash
YTDLP_COOKIES_PATH=C:\caminho\para\cookies.txt
```

Ou, em ambiente local, autorize o `yt-dlp` a ler cookies de um navegador:

```bash
YTDLP_COOKIES_FROM_BROWSER=chrome
```

Valores comuns: `chrome`, `edge`, `firefox`, `brave`. Use apenas uma conta que
tenha permissao para acessar o conteudo.

## Resolver externo

Para plugar um provedor real, configure:

```bash
INSTAGRAM_RESOLVER_ENDPOINT=https://seu-resolvedor.exemplo/resolve
INSTAGRAM_RESOLVER_TOKEN=token-opcional
```

O endpoint externo deve aceitar:

```json
{
  "url": "https://www.instagram.com/reel/...",
  "preferQuality": "highest"
}
```

E retornar:

```json
{
  "ok": true,
  "provider": "nome-do-provedor",
  "media": [
    {
      "id": "1",
      "type": "video",
      "quality": "HD",
      "width": 1080,
      "height": 1920,
      "downloadUrl": "https://...",
      "filename": "video.mp4"
    }
  ]
}
```

Use somente com conteudo publico, proprio ou baixado com permissao.

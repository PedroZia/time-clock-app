# Time Clock

Registro de horas extras. Página única, zero dependências, sem build.

## Arquivos

| Arquivo | Conteúdo |
|---------|----------|
| `index.html` | Estrutura HTML |
| `style.css` | Tema brutalism-dark (claro/escuro) |
| `script.js` | Lógica, localStorage, export/import, email |

## Uso

Abra `index.html` no navegador, ou faça deploy no GitHub Pages / Vercel.

| Ação | Como |
|------|------|
| **Adicionar** | Preencha início, fim, descrição e clique Add |
| **Editar** | Clique Edit → altere os campos → clique Update |
| **Excluir** | Clique Del → confirme |
| **Exportar** | Clique Export JSON → baixa arquivo `horas-extras-<nome>-<codigo>-<data>.json` |
| **Importar** | Clique Import... → selecione um JSON (array raiz ou wrapper `{ registros: [...] }`) |
| **Enviar por email** | Clique Email em qualquer registro → abre cliente de email com dados preenchidos |
| **Tema** | Alternador ☀/☾ no canto superior direito (respeita preferência do SO na primeira visita) |

## Configuração obrigatória

Antes de usar, edite as constantes no topo de `script.js`:

```js
const NOME_SERVIDOR = "Seu Nome";          // ← troque
const CODIGO_SERVIDOR = "00000";           // ← troque
```

E os destinatários de email na função `sendEmail()` (~linha 144):

```js
const to = "destinatario@orgao.gov.br";    // ← troque
const cc = ["copia1@orgao.gov.br", ...]    // ← troque ou remova
```

## Formato JSON

### Export (gerado pelo app)
```json
{
  "nomeServidor": "Seu Nome",
  "codigoServidor": "00000",
  "registros": [
    {
      "id": 1782824043554,
      "start": "2026-06-30T17:00",
      "end": "2026-06-30T17:30",
      "description": "Correção de Bugs"
    }
  ]
}
```

### Import (ambos aceitos)
O app aceita tanto o formato wrapper acima quanto array raiz:
```json
[
  { "id": ..., "start": "...", "end": "...", "description": "..." }
]
```

## Deploy

- **GitHub Pages**: faça push do repositório, ative Pages na branch main, raiz `/`
- **Vercel**: importe o repositório, sem build step, diretório raiz

## Tecnologia

HTML + CSS + JavaScript vanilla. Nenhum framework, npm, ou build.

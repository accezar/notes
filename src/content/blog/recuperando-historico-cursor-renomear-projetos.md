---
title: 'Recuperando histórico do Cursor depois de renomear projetos.'
description: 'Como recuperar chats do Cursor após renomear ou mover uma pasta no macOS, remapeando o workspace antigo para o novo.'
date: 2026-07-21
category: 'Desenvolvimento'
topics:
  - Cursor
  - macOS
  - SQLite
  - Development
  - AI IDE
draft: false
toc: false
tocMaxDepth: 2
thumbnail: "https://images.unsplash.com/photo-1746286720965-cccf57e56c68?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
---

Recentemente, tive que renomear a pasta de um projeto em que estava trabalhando no Cursor porque o projeto mudou de nome. Percebi que com isso perdi todo o histórico do chat, e não eram conversas que eu gostaria de descartar: havia planos de implementação, decisões arquiteturais, investigações de bugs, snippets e todo o contexto acumulado durante o desenvolvimento e parte desse material existia apenas no chat.

Minha primeira impressão foi que os dados haviam sido apagados, mas depois de pesquisar bem notei que eles continuavam no computador. O Cursor simplesmente deixou de associá-los ao projeto aberto.

Investigando os arquivos locais e os bancos SQLite, consegui recuperar as conversas remapeando o workspace antigo para o novo. Resolvi criar um pequeno artigo apenas explicando para quem passar pelo mesmo poblema o que precisei alterar e o script que passei a usar quando movo ou renomeio um projeto no macOS.

## O que acontece quando uma pasta é renomeada

O Cursor herda do VS Code o conceito de armazenamento por workspace. Cada pasta aberta recebe um diretório dentro de:

```text
~/Library/Application Support/Cursor/User/workspaceStorage/
```

A estrutura se parece com isto:

```text
Cursor/User/
├── globalStorage/
│   └── state.vscdb
└── workspaceStorage/
    ├── 13961fd3.../
    │   ├── workspace.json
    │   └── state.vscdb
    └── da3bc2a6.../
        ├── workspace.json
        └── state.vscdb
```

O nome de cada diretório é um identificador do workspace. O arquivo `workspace.json` informa a qual pasta aquele armazenamento pertence:

```json
{
  "folder": "file:///Users/anna/Projects/react-spotter"
}
```

Eu não descreveria o identificador como “o hash do path”, isso não é confiável para workspaces locais. Há casos em que o mesmo path possui mais de um identificador, e os IDs locais não correspondem de forma consistente a MD5, SHA-1 ou SHA-256 do URI. Por isso, a ideia não é que o script tente calcular nada: ele percorre os arquivos `workspace.json` e encontra o identificador realmente associado a cada path.

Quando uma pasta é movida ou renomeada, o Cursor pode criar outro workspace para o novo endereço. O resultado fica mais ou menos assim:

```text
/Projects/react-test-studio
    → workspace antigo: 13961fd3...

/Projects/react-spotter
    → workspace novo: da3bc2a6...
```

O projeto continua sendo o mesmo para mim, mas o armazenamento local passa a enxergar dois workspaces diferentes.

## Onde as conversas ficam

Nas versões atuais do Cursor, dois bancos têm papéis diferentes.

O banco de cada workspace, em `workspaceStorage/<id>/state.vscdb`, mantém estado local daquela janela: chats selecionados, abas abertas, painéis, layout e outras referências de interface.

O banco global, em `globalStorage/state.vscdb`, guarda o índice geral das conversas e os dados usados para reconstruí-las. No Cursor 3.x, a associação entre chat e workspace foi centralizada nesse banco. O editor lê os headers, filtra as conversas pelo `workspaceIdentifier` e então carrega o conteúdo correspondente.

Dependendo da versão ou da etapa de migração do Cursor, esse índice pode aparecer de duas formas:

```text
ItemTable
└── composer.composerHeaders

ou

composerHeaders
├── composerId
├── workspaceId
└── value
```

Na minha instalação, encontrei uma tabela normalizada chamada `composerHeaders`. O script também procura o formato armazenado como JSON dentro da `ItemTable`, porque ele ainda aparece em diferentes builds e processos de migração.

Os conteúdos das mensagens ficam associados a chaves como:

```text
composerData:<composerId>
bubbleId:<composerId>:<bubbleId>
checkpointId:<composerId>:<checkpointId>
composer.content.<hash>
```

No meu caso, esses dados continuavam intactos. O problema estava no índice: aproximadamente 191 conversas ainda apontavam para o identificador e para o path antigos.

Isso também explica por que copiar apenas o `state.vscdb` do workspace antigo recuperou algumas abas, mas não trouxe todo o histórico. As abas pertenciam ao estado local do workspace. A lista completa dependia do índice global.

O Cursor também mantém transcripts em `~/.cursor/projects/`, mas esses arquivos funcionam como registros auxiliares. Copiar somente os transcripts não garante que as conversas reapareçam na interface, porque o editor depende dos bancos e de seus índices para encontrá-las.

## O limite deste procedimento

Este processo atende a um caso específico:

* a pasta local foi renomeada ou movida;
* o Cursor criou um workspace novo;
* as conversas continuam associadas ao workspace antigo;
* os dados ainda existem no banco global.

Ele não deve ser tratado como uma solução universal para qualquer desaparecimento de histórico.

Versões recentes do Cursor possuem superfícies que ainda usam armazenamentos diferentes. Sessões iniciadas na Agents Window, Remote Control, cloud agents ou outros fluxos podem não existir no mesmo índice local. Também há bugs de agrupamento nos quais as conversas estão corretas no banco, mas aparecem sob um workspace fantasma. Em alguns desses casos, trocar o agrupamento da Agents sidebar para **Updated** ou **Status** já permite acessar o histórico sem editar o banco.

A estrutura descrita aqui também é interna e não representa uma API pública do Cursor. Nomes de tabelas, campos e regras de associação podem mudar entre versões.

Por isso, cuidado com três coisas:

1. Fechar completamente o Cursor com `Cmd+Q` ou `pkill -9 -f "/Applications/Cursor.app"`
2. Fazer backup dos bancos antes de qualquer alteração.
3. Conferir se o problema realmente é a troca do workspace ID.

## O processo de recuperação

O procedimento que uso hoje é o seguinte.

Primeiro, abro a pasta com o nome novo pelo menos uma vez. Isso faz o Cursor criar o novo diretório dentro de `workspaceStorage`.

Depois, fecho completamente o aplicativo. Fechar somente a janela ou deixar algum processo do Cursor ativo não é suficiente. O Cursor mantém os dados carregados em memória e não acompanha alterações externas no SQLite enquanto está rodando. Então o seguro é um `pkill` pelo terminal.

Com o editor fechado, o script:

1. encontra os workspaces antigo e novo lendo seus `workspace.json`;
2. cria backups dos bancos, dos arquivos WAL e das cópias de recuperação;
3. atualiza os headers que ainda apontam para o workspace antigo;
4. substitui os paths dentro de `workspaceIdentifier` e `trackedGitRepos`;
5. remapeia referências auxiliares de abas e inline diffs;
6. opcionalmente transfere o estado local do workspace antigo para o novo.

O conteúdo das conversas não é reescrito. O script altera principalmente o vínculo usado pelo Cursor para localizar e agrupar os chats.

## Como executar

Salve o script como:

```text
~/bin/cursor-remap-chats.py
```

Dê permissão de execução, se desejar:

```bash
chmod +x ~/bin/cursor-remap-chats.py
```

Abra a pasta nova pelo menos uma vez, feche o Cursor com `Cmd+Q` e execute:

```bash
python3 ~/bin/cursor-remap-chats.py \
  --old "/Users/voce/Projects/nome-antigo" \
  --new "/Users/voce/Projects/nome-novo"
```

Para também recuperar abas abertas e outros estados locais do workspace:

```bash
python3 ~/bin/cursor-remap-chats.py \
  --old "/Users/voce/Projects/nome-antigo" \
  --new "/Users/voce/Projects/nome-novo" \
  --also-copy-workspace-state
```

<details>
<summary>Ver o script completo</summary>

```python
#!/usr/bin/env python3
"""Remapeia chats locais do Cursor após renomear ou mover uma pasta.

Uso (com o Cursor totalmente fechado):
  python3 cursor-remap-chats.py --old /path/antigo --new /path/novo
"""
from __future__ import annotations

import argparse
import json
import shutil
import sqlite3
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import quote, unquote, urlparse


def die(message: str, code: int = 1) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(code)


def cursor_running() -> bool:
    commands = (
        ["pgrep", "-x", "Cursor"],
        ["pgrep", "-f", "Cursor.app/Contents/MacOS/Cursor"],
    )
    for command in commands:
        try:
            if subprocess.check_output(command, text=True).strip():
                return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            pass
    return False


def file_uri(path: str) -> str:
    return "file://" + quote(path, safe="/")


def uri_to_path(value: str) -> str | None:
    parsed = urlparse(value)
    if parsed.scheme != "file":
        return None
    return unquote(parsed.path)


def find_workspace_id(
    workspace_storage: Path,
    folder_path: str,
) -> str | None:
    target = str(Path(folder_path).expanduser().resolve())

    for workspace_json in workspace_storage.glob(
        "*/workspace.json"
    ):
        try:
            data = json.loads(
                workspace_json.read_text(encoding="utf-8")
            )
        except (OSError, json.JSONDecodeError):
            continue

        value = data.get("folder") or data.get("workspace")
        if not isinstance(value, str):
            continue

        decoded = uri_to_path(value)
        if (
            decoded
            and str(Path(decoded).expanduser().resolve())
            == target
        ):
            return workspace_json.parent.name

    return None


def rewrite_composer_value(
    raw: str,
    old_id: str,
    new_id: str,
    old_path: str,
    new_path: str,
) -> str:
    old_uri = file_uri(old_path)
    new_uri = file_uri(new_path)

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return (
            raw.replace(old_id, new_id)
            .replace(old_uri, new_uri)
            .replace(old_path, new_path)
        )

    workspace = data.get("workspaceIdentifier")
    if isinstance(workspace, dict):
        workspace["id"] = new_id
        uri = workspace.get("uri")
        if isinstance(uri, dict):
            uri["fsPath"] = new_path
            uri["path"] = new_path
            uri["external"] = new_uri

    repos = data.get("trackedGitRepos")
    if isinstance(repos, list):
        for repo in repos:
            if (
                isinstance(repo, dict)
                and isinstance(repo.get("repoPath"), str)
            ):
                repo["repoPath"] = repo[
                    "repoPath"
                ].replace(old_path, new_path)

    text = json.dumps(
        data,
        ensure_ascii=False,
        separators=(",", ":"),
    )

    return (
        text.replace(old_id, new_id)
        .replace(old_uri, new_uri)
        .replace(old_path, new_path)
    )


def table_exists(
    connection: sqlite3.Connection,
    table: str,
) -> bool:
    row = connection.execute(
        """
        SELECT 1
        FROM sqlite_master
        WHERE type='table' AND name=?
        """,
        (table,),
    ).fetchone()

    return row is not None


def backup_sqlite_files(
    source_dir: Path,
    destination_dir: Path,
) -> None:
    destination_dir.mkdir(parents=True, exist_ok=True)

    names = (
        "state.vscdb",
        "state.vscdb-wal",
        "state.vscdb-shm",
        "state.vscdb.backup",
    )

    for name in names:
        source = source_dir / name
        if source.exists():
            shutil.copy2(
                source,
                destination_dir / name,
            )


def sqlite_backup(
    source: Path,
    destination: Path,
) -> None:
    """Cria uma cópia consistente, incluindo o WAL."""

    with sqlite3.connect(source) as source_connection:
        with sqlite3.connect(
            destination
        ) as destination_connection:
            source_connection.backup(
                destination_connection
            )


def remap_normalized_headers(
    connection: sqlite3.Connection,
    old_id: str,
    new_id: str,
    old_path: str,
    new_path: str,
    backup_dir: Path,
) -> int:
    if not table_exists(connection, "composerHeaders"):
        return 0

    columns = {
        row[1]
        for row in connection.execute(
            "PRAGMA table_info(composerHeaders)"
        ).fetchall()
    }

    required = {
        "composerId",
        "workspaceId",
        "value",
    }

    if not required.issubset(columns):
        print(
            "  aviso: tabela composerHeaders existe, "
            "mas o schema não é reconhecido"
        )
        return 0

    rows = connection.execute(
        """
        SELECT composerId, value
        FROM composerHeaders
        WHERE workspaceId=?
        """,
        (old_id,),
    ).fetchall()

    backup_file = (
        backup_dir
        / "composerHeaders_old_workspace.json"
    )

    backup_file.write_text(
        json.dumps(
            [
                {
                    "composerId": composer_id,
                    "value": value,
                }
                for composer_id, value in rows
            ],
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    for composer_id, value in rows:
        connection.execute(
            """
            UPDATE composerHeaders
            SET workspaceId=?, value=?
            WHERE composerId=?
            """,
            (
                new_id,
                rewrite_composer_value(
                    value,
                    old_id,
                    new_id,
                    old_path,
                    new_path,
                ),
                composer_id,
            ),
        )

    return len(rows)


def remap_itemtable_headers(
    connection: sqlite3.Connection,
    old_id: str,
    new_id: str,
    old_path: str,
    new_path: str,
) -> int:
    if not table_exists(connection, "ItemTable"):
        return 0

    row = connection.execute(
        """
        SELECT value
        FROM ItemTable
        WHERE key='composer.composerHeaders'
        """
    ).fetchone()

    if not row:
        return 0

    try:
        headers = json.loads(row[0])
    except (TypeError, json.JSONDecodeError):
        return 0

    changed = 0
    new_uri = file_uri(new_path)

    for composer in headers.get("allComposers", []):
        if not isinstance(composer, dict):
            continue

        workspace = (
            composer.get("workspaceIdentifier") or {}
        )
        uri = workspace.get("uri") or {}
        fs_path = (
            uri.get("fsPath")
            or uri.get("path")
            or ""
        )

        belongs_to_old_workspace = (
            workspace.get("id") == old_id
            or old_path in fs_path
        )

        if not belongs_to_old_workspace:
            continue

        composer["workspaceIdentifier"] = {
            "id": new_id,
            "uri": {
                "$mid": 1,
                "fsPath": new_path,
                "external": new_uri,
                "path": new_path,
                "scheme": "file",
            },
        }

        repos = composer.get("trackedGitRepos")
        if isinstance(repos, list):
            for repo in repos:
                if (
                    isinstance(repo, dict)
                    and isinstance(
                        repo.get("repoPath"),
                        str,
                    )
                ):
                    repo["repoPath"] = repo[
                        "repoPath"
                    ].replace(old_path, new_path)

        changed += 1

    if changed:
        connection.execute(
            """
            UPDATE ItemTable
            SET value=?
            WHERE key='composer.composerHeaders'
            """,
            (
                json.dumps(
                    headers,
                    ensure_ascii=False,
                    separators=(",", ":"),
                ),
            ),
        )

    return changed


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Remapeia chats do Cursor após "
            "rename ou move de projeto"
        )
    )

    parser.add_argument(
        "--old",
        required=True,
        help="Path absoluto da pasta antiga",
    )
    parser.add_argument(
        "--new",
        required=True,
        help="Path absoluto da pasta nova",
    )
    parser.add_argument(
        "--also-copy-workspace-state",
        action="store_true",
        help=(
            "Copia o estado local do workspace "
            "antigo para o novo"
        ),
    )

    args = parser.parse_args()

    old_path = str(
        Path(args.old).expanduser().resolve()
    )
    new_path = str(
        Path(args.new).expanduser().resolve()
    )

    if cursor_running():
        die(
            "Cursor ainda está rodando. "
            "Feche com Cmd+Q e rode novamente."
        )

    support = (
        Path.home()
        / "Library/Application Support/Cursor/User"
    )
    workspace_storage = support / "workspaceStorage"
    global_storage = support / "globalStorage"
    global_db = global_storage / "state.vscdb"

    if not global_db.is_file():
        die(
            f"Banco global não encontrado: {global_db}"
        )

    old_id = find_workspace_id(
        workspace_storage,
        old_path,
    )
    new_id = find_workspace_id(
        workspace_storage,
        new_path,
    )

    if not old_id:
        die(
            "Não encontrei workspaceStorage "
            f"para o path antigo: {old_path}"
        )

    if not new_id:
        die(
            "Não encontrei workspaceStorage "
            f"para o path novo: {new_path}\n"
            "Abra a pasta nova uma vez no Cursor, "
            "feche o aplicativo e rode novamente."
        )

    if old_id == new_id:
        die(
            "Os paths antigo e novo apontam para "
            "o mesmo workspace id; nada a remapear."
        )

    print(
        f"old: {old_path}\n"
        f"  workspace={old_id}"
    )
    print(
        f"new: {new_path}\n"
        f"  workspace={new_id}"
    )

    stamp = datetime.now().strftime(
        "%Y%m%d_%H%M%S"
    )
    backup_dir = (
        global_storage
        / f"_backup_chat_remap_{stamp}"
    )

    backup_sqlite_files(
        global_storage,
        backup_dir / "globalStorage",
    )

    old_workspace = workspace_storage / old_id
    new_workspace = workspace_storage / new_id

    backup_sqlite_files(
        old_workspace,
        backup_dir / "old_workspace",
    )
    backup_sqlite_files(
        new_workspace,
        backup_dir / "new_workspace",
    )

    if args.also_copy_workspace_state:
        old_state = (
            old_workspace / "state.vscdb"
        )
        new_state = (
            new_workspace / "state.vscdb"
        )

        if not old_state.is_file():
            die(
                "Banco do workspace antigo "
                f"não encontrado: {old_state}"
            )

        for suffix in (
            "",
            "-wal",
            "-shm",
            ".backup",
        ):
            target = Path(
                str(new_state) + suffix
            )
            if target.exists():
                target.unlink()

        sqlite_backup(
            old_state,
            new_state,
        )

        images = old_workspace / "images"
        if images.is_dir():
            destination = (
                new_workspace / "images"
            )
            destination.mkdir(exist_ok=True)
            shutil.copytree(
                images,
                destination,
                dirs_exist_ok=True,
            )

        print(
            "→ estado do workspace copiado "
            "(abas/UI); workspace.json novo "
            "foi preservado"
        )

    with sqlite3.connect(
        global_db
    ) as connection:
        connection.execute(
            "PRAGMA busy_timeout=5000"
        )

        try:
            connection.execute(
                "PRAGMA wal_checkpoint(TRUNCATE)"
            )
        except sqlite3.Error as error:
            print(
                f"  aviso no checkpoint: {error}"
            )

        normalized = remap_normalized_headers(
            connection,
            old_id,
            new_id,
            old_path,
            new_path,
            backup_dir,
        )

        cached = remap_itemtable_headers(
            connection,
            old_id,
            new_id,
            old_path,
            new_path,
        )

        if table_exists(connection, "ItemTable"):
            old_glass = (
                "cursor/glass.tabs.v2/"
                f"{old_id}/state.json"
            )
            new_glass = (
                "cursor/glass.tabs.v2/"
                f"{new_id}/state.json"
            )

            old_glass_exists = (
                connection.execute(
                    """
                    SELECT 1
                    FROM ItemTable
                    WHERE key=?
                    """,
                    (old_glass,),
                ).fetchone()
            )

            if old_glass_exists:
                new_glass_exists = (
                    connection.execute(
                        """
                        SELECT 1
                        FROM ItemTable
                        WHERE key=?
                        """,
                        (new_glass,),
                    ).fetchone()
                )

                if new_glass_exists:
                    connection.execute(
                        """
                        DELETE FROM ItemTable
                        WHERE key=?
                        """,
                        (old_glass,),
                    )
                else:
                    connection.execute(
                        """
                        UPDATE ItemTable
                        SET key=?
                        WHERE key=?
                        """,
                        (
                            new_glass,
                            old_glass,
                        ),
                    )

                print(
                    "→ glass tabs remapeado"
                )

        inline_diffs = 0

        if table_exists(
            connection,
            "cursorDiskKV",
        ):
            rows = connection.execute(
                """
                SELECT key
                FROM cursorDiskKV
                WHERE key LIKE ?
                """,
                (
                    f"inlineDiff:{old_id}:%",
                ),
            ).fetchall()

            for (key,) in rows:
                new_key = key.replace(
                    f"inlineDiff:{old_id}:",
                    f"inlineDiff:{new_id}:",
                    1,
                )

                already_exists = (
                    connection.execute(
                        """
                        SELECT 1
                        FROM cursorDiskKV
                        WHERE key=?
                        """,
                        (new_key,),
                    ).fetchone()
                )

                if already_exists:
                    connection.execute(
                        """
                        DELETE FROM cursorDiskKV
                        WHERE key=?
                        """,
                        (key,),
                    )
                else:
                    connection.execute(
                        """
                        UPDATE cursorDiskKV
                        SET key=?
                        WHERE key=?
                        """,
                        (
                            new_key,
                            key,
                        ),
                    )

            inline_diffs = len(rows)

        print(
            "→ headers normalizados "
            f"remapeados: {normalized}"
        )
        print(
            "→ cache composer.composerHeaders "
            f"remapeado: {cached}"
        )
        print(
            "→ inlineDiff remapeados: "
            f"{inline_diffs}"
        )

        if normalized == 0 and cached == 0:
            die(
                "Nenhum chat associado ao "
                "workspace antigo foi encontrado. "
                "O caso pode ser outro: chat "
                "arquivado, sessão da Agents Window, "
                "índice corrompido ou formato ainda "
                "não suportado."
            )

        connection.commit()

        try:
            connection.execute(
                "PRAGMA wal_checkpoint(TRUNCATE)"
            )
        except sqlite3.Error as error:
            print(
                "  aviso no checkpoint final: "
                f"{error}"
            )

    cursor_backup = (
        global_storage / "state.vscdb.backup"
    )

    if cursor_backup.exists():
        shutil.copy2(
            global_db,
            cursor_backup,
        )
        print(
            "→ state.vscdb.backup existente "
            "foi sincronizado"
        )

    print()
    print(
        f"OK. backup: {backup_dir}"
    )
    print(
        "Abra o Cursor exatamente em: "
        f"{new_path}"
    )
    print(
        "Confira a lista completa de histórico, "
        "não apenas as abas abertas."
    )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

</details>

## Por que o script copia os arquivos WAL e SHM

Os bancos do Cursor usam o modo WAL do SQLite. Nesse modo, as alterações mais recentes podem estar no arquivo `state.vscdb-wal` e ainda não ter sido incorporadas ao arquivo principal.

Copiar somente `state.vscdb` pode gerar um backup incompleto. Por isso, o script salva o banco principal, o WAL, o SHM e a eventual cópia `state.vscdb.backup`. Quando transfere o estado de um workspace, usa a API de backup do próprio SQLite para produzir uma cópia consistente.

## Como confirmar que funcionou

Depois da execução, abra o Cursor exatamente pelo path novo:

```bash
cursor "/Users/voce/Projects/nome-novo"
```

Então verifique a lista completa de histórico. Não use apenas as abas abertas como critério.

As abas representam o estado local da janela e podem voltar mesmo quando parte do índice continua incorreta. O resultado esperado é que as conversas antigas apareçam associadas ao novo workspace e possam ser abertas normalmente.

Se elas não aparecerem:

1. confira a saída do script e veja quantos headers foram remapeados;
2. verifique se os paths passados em `--old` e `--new` estão corretos;
3. confirme que a pasta nova foi aberta antes da execução;
4. troque o agrupamento da Agents sidebar para **Updated** ou **Status**;
5. confirme se a conversa pertence ao editor local ou a outra superfície do Cursor;
6. não execute o script repetidamente sem investigar o backup e os bancos.

Se o script informar que nenhum header foi encontrado, pare. Isso indica que o problema provavelmente não corresponde ao caso abordado neste artigo.

## Onde ficam os backups

Os backups são criados dentro de:

```text
~/Library/Application Support/Cursor/User/globalStorage/
```

Com um nome semelhante a:

```text
_backup_chat_remap_20260721_142530/
```

A pasta contém cópias do banco global e dos workspaces antigo e novo.

Esses arquivos podem incluir prompts, respostas, paths locais, nomes de arquivos, hostname e outros dados de contexto. Não coloque esse diretório em um repositório público e não envie o conteúdo sem revisá-lo.

## Linux e Windows

A lógica é a mesma em outros sistemas, mas o diretório base muda.

No Linux:

```text
~/.config/Cursor/User/
```

No Windows:

```text
%APPDATA%\Cursor\User\
```

Também é necessário adaptar a verificação do processo em execução. No macOS, o script usa `pgrep`; no Windows, seria possível usar `tasklist` ou uma biblioteca multiplataforma como `psutil`. Os paths padrão de macOS e Linux também aparecem nas ferramentas comunitárias que inspecionam os bancos locais do Cursor.

É sempre bom manter backups antes de mudanças estruturais no diretório. Existem ferramentas como o `cursaves`, que exportam, auditam e sincronizam conversas entre workspaces. Renomear uma pasta deveria ser uma operação banal. No meu caso, revelou que uma parte relevante do processo de desenvolvimento estava amarrada a um mecanismo interno do Cursor que eu desconhecia.

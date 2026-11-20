# AI Usage

## Tools and models

- Claude Opus 5.5 on claude.ai was used as a mentor for project planning, explanations, and preparing precise implementation prompts.
- OpenAI Codex in Visual Studio Code was used for code generation.
- Codex model: **[ADD CODEX MODEL NAME]**.

## Configuration

The repository's [`AGENTS.md`](../AGENTS.md) provides the working rules given to Codex. It fixes the backend file structure and technology choices, requires simple and explainable code, keeps routes thin and business logic in the service layer, separates domain errors from HTTP handling, requires async SQLAlchemy 2.x patterns, protects the private environment file, and defines the frontend's accessibility and visual guidelines.

## Prompts

The requested prompt record file is not currently present in the repository. When it is added, it should be stored as [`prompts.md`](prompts.md).

## Chat history

The requested chat-history file is not currently present in the repository. When it is added, it should be stored as [`chat-history.md`](chat-history.md).

## How AI was used

The project design was decided with Claude Opus 5.5 acting as a mentor. Codex generated code from precise, scoped prompts. The developer reviewed every change, tested the API through Swagger and the automated pytest suite, and made the Git commits.

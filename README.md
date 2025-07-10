# FIAP's Hackaton

Projeto desenvolvido no Hackaton do curso 9SOAT da FIAP.

## Git hooks

This repository uses [Husky](https://typicode.github.io/husky) to automate
checks. After installing dependencies, Husky will automatically set up Git
hooks that run the following commands:

* `npm run lint` and `npm run typecheck` before every commit
* `npm test` before every push

To (re)install the hooks manually run:

```bash
npm run prepare
```

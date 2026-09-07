# ESDM — Autenticação com SOLID

Repositório da POC de autenticação desenvolvida para a disciplina, aplicando os
princípios SOLID e o Strategy Pattern em um backend NestJS.

## Objetivo

Autenticar usuários por mais de um mecanismo — e-mail/senha e Google — mantendo
cada mecanismo isolado atrás de um mesmo contrato, substituível e testável sem
banco e sem framework.

O critério de sucesso não é "o login funciona", e sim **adicionar um segundo
provedor sem alterar o primeiro**.

## Status

Implementação em andamento. O código chega à `main` através de Pull Request.

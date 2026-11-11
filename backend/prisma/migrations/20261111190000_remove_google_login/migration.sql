-- Remocao do login com Google: sessoes abertas pelo Google deixam de existir
-- e a coluna googleId sai da tabela users. Contas que so tinham Google podem
-- definir uma senha por POST /auth/password/forgot.
DELETE FROM "sessions" WHERE "provider" = 'google';

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "username" TEXT,
    "email" TEXT,
    "passwordHash" TEXT,
    "isGuest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_users" ("createdAt", "email", "id", "isGuest", "name", "passwordHash", "updatedAt", "username") SELECT "createdAt", "email", "id", "isGuest", "name", "passwordHash", "updatedAt", "username" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_isGuest_createdAt_idx" ON "users"("isGuest", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;


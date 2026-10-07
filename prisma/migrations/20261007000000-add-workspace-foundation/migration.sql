BEGIN;

CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkspaceMember" (
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("workspaceId", "userId")
);

CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");
-- These indexes enforce at most one owner per workspace and one default per user.
CREATE UNIQUE INDEX "WorkspaceMember_one_owner_key"
    ON "WorkspaceMember"("workspaceId") WHERE "role" = 'OWNER';
CREATE UNIQUE INDEX "WorkspaceMember_one_default_key"
    ON "WorkspaceMember"("userId") WHERE "isDefault" = true;

ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The unique index prevents two owners; deferred checks also prevent zero owners.
-- Defer until COMMIT so nested creation and a future demote/promote transfer can be atomic.
CREATE FUNCTION check_workspace_owner() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    workspace_ids TEXT[];
    target_id TEXT;
BEGIN
    IF TG_TABLE_NAME = 'Workspace' THEN
        workspace_ids := ARRAY[NEW."id"];
    ELSIF TG_OP = 'INSERT' THEN
        workspace_ids := ARRAY[NEW."workspaceId"];
    ELSIF TG_OP = 'DELETE' THEN
        workspace_ids := ARRAY[OLD."workspaceId"];
    ELSE
        workspace_ids := ARRAY[OLD."workspaceId", NEW."workspaceId"];
    END IF;

    FOREACH target_id IN ARRAY workspace_ids LOOP
        IF EXISTS (SELECT 1 FROM "Workspace" WHERE "id" = target_id)
            AND (SELECT COUNT(*) FROM "WorkspaceMember" WHERE "workspaceId" = target_id AND "role" = 'OWNER') <> 1 THEN
            RAISE EXCEPTION 'A workspace must have exactly one owner.' USING ERRCODE = '23514';
        END IF;
    END LOOP;
    RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "Workspace_requires_owner"
    AFTER INSERT ON "Workspace" DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION check_workspace_owner();
CREATE CONSTRAINT TRIGGER "WorkspaceMember_preserves_owner"
    AFTER INSERT OR UPDATE OR DELETE ON "WorkspaceMember" DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION check_workspace_owner();

-- Add one default workspace for every existing user without changing private resources.
INSERT INTO "Workspace" ("id", "name", "createdAt", "updatedAt")
    SELECT 'default-workspace-' || "id", 'Personal', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "User";
INSERT INTO "WorkspaceMember" ("workspaceId", "userId", "role", "isDefault")
    SELECT 'default-workspace-' || "id", "id", 'OWNER', true FROM "User";

COMMIT;

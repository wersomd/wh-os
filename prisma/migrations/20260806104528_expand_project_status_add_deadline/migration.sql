-- Add the new deadline column.
ALTER TABLE "Project" ADD COLUMN "deadline" TIMESTAMP(3);

-- Rename the old enum type out of the way.
ALTER TYPE "ProjectStatus" RENAME TO "ProjectStatus_old";

-- Create the new enum type with the expanded value set.
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'IN_PROGRESS', 'REVIEW', 'ON_HOLD', 'DONE', 'ARCHIVED');

-- Migrate the column to the new type, mapping old values to new ones.
ALTER TABLE "Project" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Project" ALTER COLUMN "status" TYPE "ProjectStatus" USING (
  CASE "status"::text
    WHEN 'ACTIVE' THEN 'IN_PROGRESS'
    WHEN 'ON_HOLD' THEN 'ON_HOLD'
    WHEN 'COMPLETED' THEN 'DONE'
    WHEN 'ARCHIVED' THEN 'ARCHIVED'
  END::"ProjectStatus"
);
ALTER TABLE "Project" ALTER COLUMN "status" SET DEFAULT 'PLANNING';

-- Drop the old enum type.
DROP TYPE "ProjectStatus_old";

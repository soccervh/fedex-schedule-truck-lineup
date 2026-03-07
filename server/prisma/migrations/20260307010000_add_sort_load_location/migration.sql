-- Add SORT to LoadLocation enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SORT' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'LoadLocation')) THEN
    ALTER TYPE "LoadLocation" ADD VALUE 'SORT';
  END IF;
END $$;

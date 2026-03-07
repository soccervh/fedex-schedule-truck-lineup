-- Migrate existing LABEL_FACER, SCANNER, SPLITTER to SORT
UPDATE "Route" SET "loadLocation" = 'SORT' WHERE "loadLocation" IN ('LABEL_FACER', 'SCANNER', 'SPLITTER');

-- Office days keep their history: a change applies from a day on, so the
-- days that passed keep the office/home split they had.
ALTER TABLE "user_settings" ADD COLUMN "office_days" JSONB NOT NULL DEFAULT '[]';

UPDATE "user_settings"
SET "office_days" = jsonb_build_array(jsonb_build_object('from', to_char(CURRENT_DATE, 'YYYY-MM-DD'), 'weekdays', to_jsonb("office_weekdays")))
WHERE cardinality("office_weekdays") > 0;

ALTER TABLE "user_settings" DROP COLUMN "office_weekdays";

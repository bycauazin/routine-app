import { config } from "dotenv";

// Runs before each test file's imports: point the app at the test database.
config({ quiet: true });
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.APP_ORIGIN = "http://localhost:5174";
// Tests never read the developer's secret or send real e-mails.
delete process.env.AUTH_SECRET;
process.env.MAIL_PROVIDER = "console";
process.env.SIGNUP_ENABLED = "true";

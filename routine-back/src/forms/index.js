/**
 * All forms, grouped by resource. Explicit imports (no filesystem
 * auto-import): routes use forms.auth.Login.validate.
 */
import ChangeEmail from "./auth/ChangeEmail.js";
import ChangePassword from "./auth/ChangePassword.js";
import EmailOnly from "./auth/EmailOnly.js";
import Login from "./auth/Login.js";
import LoginTwoFactor from "./auth/LoginTwoFactor.js";
import Register from "./auth/Register.js";
import ResetPassword from "./auth/ResetPassword.js";
import TokenOnly from "./auth/TokenOnly.js";
import UpdateProfile from "./auth/UpdateProfile.js";
import SecurityCode from "./security/Code.js";
import SecurityCurrentPassword from "./security/CurrentPassword.js";
import SecurityDeleteAccount from "./security/DeleteAccount.js";
import SecurityPasswordAndCode from "./security/PasswordAndCode.js";
import SecuritySessionById from "./security/SessionById.js";
import * as routine from "./routine/index.js";
import ById from "./shared/ById.js";

const forms = {
  shared: { ById },
  auth: { Login, LoginTwoFactor, Register, EmailOnly, TokenOnly, ResetPassword, UpdateProfile, ChangePassword, ChangeEmail },
  routine,
  security: {
    CurrentPassword: SecurityCurrentPassword,
    Code: SecurityCode,
    PasswordAndCode: SecurityPasswordAndCode,
    DeleteAccount: SecurityDeleteAccount,
    SessionById: SecuritySessionById,
  },
};

export default forms;

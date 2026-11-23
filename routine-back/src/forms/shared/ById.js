import { BaseForm } from "../BaseForm.js";
import { idParams } from "./schemas.js";

/** Routes that only take an :id (get, delete, actions without body). */
export default class ById extends BaseForm {
  static get schemas() {
    return { params: idParams };
  }
}

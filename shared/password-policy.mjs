// One contract for every password-setting flow; never apply complexity at login.
export const PASSWORD_POLICY_MESSAGE = "Use at least 8 characters, including a letter and a number. Uppercase and symbols are optional.";
export const isValidNewPassword = value => typeof value === "string" && value.length >= 8 && /[A-Za-z]/.test(value) && /[0-9]/.test(value);

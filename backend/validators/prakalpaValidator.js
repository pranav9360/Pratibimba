import { body } from "express-validator";

export const createPrakalpaValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Prakalpa name is required"),

  body("auditAreas")
    .optional()
    .isArray()
    .withMessage("Audit Areas must be an array"),

  body("auditAreas.*")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Audit Area cannot be empty"),

  body("prakalpaPramukh")
    .optional()
    .isString()
    .trim()
    .withMessage("Prakalpa Pramukh must be a string"),

  body("prakalpaPramukhEmail")
    .optional({ checkFalsy: true })
    .isEmail()
    .normalizeEmail()
    .withMessage("Prakalpa Pramukh email must be valid"),

  body("seniorEmail")
    .optional({ checkFalsy: true })
    .isEmail()
    .normalizeEmail()
    .withMessage("Senior email must be valid"),

  body("active")
    .optional()
    .isBoolean(),
];

export const updatePrakalpaValidator = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Prakalpa name cannot be empty"),

  body("auditAreas")
    .optional()
    .isArray()
    .withMessage("Audit Areas must be an array"),

  body("auditAreas.*")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Audit Area cannot be empty"),

  body("prakalpaPramukh")
    .optional()
    .isString()
    .trim()
    .withMessage("Prakalpa Pramukh must be a string"),

  body("prakalpaPramukhEmail")
    .optional({ checkFalsy: true })
    .isEmail()
    .normalizeEmail()
    .withMessage("Prakalpa Pramukh email must be valid"),

  body("seniorEmail")
    .optional({ checkFalsy: true })
    .isEmail()
    .normalizeEmail()
    .withMessage("Senior email must be valid"),

  body("active")
    .optional()
    .isBoolean(),
];

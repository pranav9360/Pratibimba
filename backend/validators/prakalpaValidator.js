import { body } from "express-validator";

export const createPrakalpaValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage(
      "Prakalpa name is required"
    ),

  body("active")
    .optional()
    .isBoolean(),
];

export const updatePrakalpaValidator = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage(
      "Prakalpa name cannot be empty"
    ),

  body("active")
    .optional()
    .isBoolean(),
];

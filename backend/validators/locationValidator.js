import { body } from "express-validator";

export const createLocationValidator = [
  body("prakalpa")
    .isString().bail()
    .trim()
    .notEmpty()
    .withMessage(
      "Prakalpa is required"
    ),

  body("name")
    .isString().bail()
    .trim()
    .notEmpty()
    .withMessage(
      "Location name is required"
    ),

  body("sublocations")
    .isArray()
    .withMessage(
      "Sublocations must be an array"
    ),
];

export const updateLocationValidator = [
  body("prakalpa")
    .optional()
    .isString().bail()
    .trim(),

  body("name")
    .optional()
    .isString().bail()
    .trim(),

  body("sublocations")
    .optional()
    .isArray(),
];

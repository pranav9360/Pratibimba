import { body } from "express-validator";

export const createLocationValidator = [
  body("prakalpa")
    .trim()
    .notEmpty()
    .withMessage(
      "Prakalpa is required"
    ),

  body("name")
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
    .trim(),

  body("name")
    .optional()
    .trim(),

  body("sublocations")
    .optional()
    .isArray(),
];

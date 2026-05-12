// src/validators/postValidators.js
import { body, query } from 'express-validator'
import { validationResult } from 'express-validator'

export const createPostRules = [
  body('title')
    .trim().isLength({ min: 3, max: 200 })
    .withMessage('Titolo tra 3 e 200 caratteri').escape(),
  body('content')
    .optional().trim().isLength({ max: 10000 })
    .withMessage('Contenuto max 10.000 caratteri'),
]

export const paginationRules = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
]

/** Blocca la richiesta se ci sono errori di validazione */
export function validate(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() })
  next()
}

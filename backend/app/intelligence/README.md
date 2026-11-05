# Monetra Intelligence Engine

This first implementation is deliberately deterministic and dependency-light.

## Run tests

From the repository root:

```powershell
cd backend
python -m unittest discover -s tests -v
```

No database, Supabase credentials, external API, or paid model is needed for these unit tests.

## Current capabilities

- Decimal-safe money parsing and aggregation
- Budget boundary calculations
- Savings-goal progress
- Safe-to-spend calculation with commitments and reserves
- Monthly recurring commitment normalisation
- Transaction-status bucketing
- Initial deterministic intent classification

## Important limitation

Intent classification is an initial phrase/rule matcher, not unrestricted natural-language understanding. Unmatched questions return `unsupported`; ambiguous questions request clarification. Add paraphrases to the catalogue and tests before claiming support.

The calculation functions accept structured data. A later service layer will load authenticated user records from the existing SQLAlchemy models and pass them into these pure functions. Do not query data directly from this module.

# Import Input Placeholders

Replace the contents of these two files with real downloaded datasets:

- eea-electricity-snapshot.json
- defra-core-fuels-snapshot.json

Keep the same field names used in each placeholder file.

## Run validations

From apps/api:

npm run factors:import:eea -- --input data/import-inputs/eea-electricity-snapshot.json --dry-run
npm run factors:import:defra -- --input data/import-inputs/defra-core-fuels-snapshot.json --dry-run

## Promote and activate

npm run factors:import:eea -- --input data/import-inputs/eea-electricity-snapshot.json --activate
npm run factors:import:defra -- --input data/import-inputs/defra-core-fuels-snapshot.json --activate

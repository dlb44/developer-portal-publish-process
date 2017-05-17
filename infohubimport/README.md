# Developer Portal
## InfoHub Swagger Import
This service consumes an AWS SNS topic when a Swagger document is identified to be processed. It pushes the API to the InfoHub import endpoint.
- After the lambda service is deployed, configure the following environment variables:
  - INFOHUB_IMPORT_URL
    - This variable points to the InfoHub import URL where the lambda will send either the URL of the Swagger document that was changed, or the contents of the Swagger document.
  - API_KEY
    - This variable is the secret API key that authorizes acces to invoke the InfoHub import URL.
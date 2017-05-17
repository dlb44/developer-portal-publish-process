# Developer Portal
## API Documentation Generation Service
This service consumes an AWS SNS topic onto an AWS SQS queue. An AWS ECS instance pulls items off the queue and generates the HTML documentation. After the HTML is generated, it is saved to an AWS S3 bucket.
 
 _Note: There is no extra setup configuration for this service after it is deployed with Handel._
# Developer Portal
## Event Hub Webhook to Process GitHub Push Events
This service creates an AWS API Gateway endpoint which should be registered as an EventHub webhook in order to process EventHub raised events from GitHub push events.

After this service is deployed through Handel, follow these configuration steps:
- Create a non-person BYU identity that represents the Developer Portal (only need to do this once; be sure to ask)
- Create a BYU Store application and subscribe to the EventHub v1 API
- Associate your BYU Store application consumer keys with the non-person BYU identity for the Developer Portal
- Subscribe to the `GitHub Push` event similar to the following
```bash
curl -X POST --header "Accept: application/json" --header "Authorization: Bearer <token>" "https://api.byu.edu/domains/eventhub/v1/subscriptions" -d '{ "subscription": { "domain": "edu.byu", "entity": "AppDevGitHub", "event_type": "GitHub Push" } }'
```
- Register a webhook to the AWS API Gateway endpoint similar to the following:
```bash
curl -X POST --header "Accept: application/json" --header "Authorization: Bearer <token>" "https://api.byu.edu/domains/eventhub/v1/webhooks" -d '{ "webhook": { "content_type": "application/json", "push_option": "Push Message", "endpoint": <AWS API Gateway endpoint> } }'
```
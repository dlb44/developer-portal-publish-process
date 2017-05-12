# Developer Portal - Drupal import API
API for the Developer Portal site to import generated documentation 
## lambda_handler
```Python
lambda_handler(event,context)
```
This is the entry point for the AWS Lambda function. It retrieves the documentation saved to an S3 Bucket and processes the first 50 items. It returns the content into a CSV format:
```text
uuid|title|body|domain_or_university_api|path
"/byuapi/academic_units"|"Academic Units"|&lt;!doctype html&gt;&lt;html&gt;&lt;/html&gt;"|"U"|"/byuapi/academic_units"
```
* ```uuid```
    * Because the basepath of the Swagger document is unique across our APIs, we use it as our UUID.
* ```title```
    * Title of the API found in the ```title``` property of the Swagger document ```info``` property.
* ```body```
    * Generated HTML from the Swagger document that is represented as an HTMLEncoded string.
* ```domain_or_university```
    * specifies a ```D``` if the API is a "Domain" API.
    * specifies a ```U``` if the API is a "University" API.
* ```path```
    * ```basePath``` of the Swagger document

## processItem
```Python
processitem(item)
```
Processes the S3 Bucket item. Determines if ```Key``` is under the ```apis``` path and if the item is not a path object.

## fetchItem
```Python
fetchItem(key)
```
Helper function to retrieve the S3 Bucket item content and then delete the Bucket object.

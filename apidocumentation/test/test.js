/*
 * Copyright 2016 Brigham Young University
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
'use strict';
process.env.IS_TEST=true;

const expect = require('chai').expect;
var fs = require("fs");
var AWS = require('aws-sdk-mock');

describe('Produce HTML documentation from Swagger URL', function() {
  describe('handler', function() {

    before(function() {
      // runs before all tests in this block
      var stringValue = 'uuid|title|body|domain_or_university_api|path';
      var buf = new ArrayBuffer(stringValue.length);
      var bodyValue = new Uint8Array(buf);
      for (var i=0; i < stringValue.length; i++) {
        bodyValue[i] = stringValue.charCodeAt(i);
      }
      var awsObject = { Body: bodyValue};
      AWS.mock('S3','putObject','"/domains/tutorial/cars"|"Cars"|"&lt;html&gt;&lt;body&gt;    &lt;h2&gt;car created&lt;/h2&gt;    &lt;div&gt;edu.byu&lt;/div&gt;    &lt;div&gt;cars-tutorial&lt;/div&gt;    &lt;div&gt;car created event definition&lt;/div&gt;    &lt;div&gt;[object Object]&lt;/div&gt;    &lt;div&gt;[object Object]&lt;/div&gt;    &lt;div&gt;Simple documentation&lt;/div&gt;&lt;/body&gt;&lt;/html&gt;"|"D"|"/domains/tutorial/cars"|"/domains/tutorial/cars"');
    });

    after(function() {
      // runs after all tests in this block
      AWS.restore('S3','putObject');
      AWS.restore('SQS','receiveMessage');
      AWS.restore('SQS','deleteMessage');
    });

    it('should generate and save HTML documentation for api (including x-event-types)', function(done) {
       this.timeout(100000);
      var event = fs.readFileSync("test/resources/event.json","utf-8");
      var receiveBody = { Body: event , ReceiptHandle: "handleID"};
      var sqs_receiveMessage = { ResponseMetadata: { RequestId: '05853632-c561-5c84-8918-6764d77b105c' },
        Messages:
          [ { MessageId: '22e5fdaf-2d11-4898-a4a2-614818d706d7',
            ReceiptHandle: 'AQEBFxIlOGwBvz3uJWLtjWc/w1ZAeLtYiiBKA/hSuLZN/cZ0gRiHlwqdf+FW/nafIDaRNxgClZDSHZCMqqmH46Ua9fiO0k+dUwewoI8Go8UZDMyvNx5tlY08sNDVFRK06qK5k8evFt2gdlYg+pZghEkf8Q/sGCggfh5r3rjI6jzUe9sPf4jms9VUUenG3lmD3ZxwamI4nYQ8hBBrejZ+6msgkYWgY38mhBmRLXmWnzkF/dY2a3fKtybm1OqN4w0Qw96b8llGsr8Hqxyyplm9/OHj9/RUBoUEoK3clSrPkstVDOhYcFVC+AfbyjsWsv4fr5pNp0DoYVJKQYtuOl6ReVNs7ER2IBzWk978hTUtcgwf0qdAVH/jqnq3iGyDFlAIZBWPkc5zJuko9zPzMa5alii+lTnW0EKOx9xv+pdKwHHKhMY=',
            MD5OfBody: '7affceced1dd4c6ca6a82d4e5b2cb5a5',
            Body: '{\n  "Type" : "Notification",\n  "MessageId" : "11111111-1111-1111-1111-482c271374cd",\n  "TopicArn" : "arn:aws:sns:us-west-2:11111111:devportalwebhook-dev-topic-sns",\n  "Message" : "{\\"swaggerURL\\":\\"https://github.com/byu-oit-appdev/cars-tutorial/raw/master/swagger.json\\"}",\n  "Timestamp" : "2017-04-24T20:06:37.344Z",\n  "SignatureVersion" : "1",\n  "Signature" : "XXXX",\n  "SigningCertURL" : "https://localhost/mine.pem",\n  "UnsubscribeURL" : "https://sns.us-west-2.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=arn:aws:sns:us-west-2:11:devportalwebhook-dev-topic-sns:XXX"\n}' } ] };//{ Messages: [receiveBody] };
      AWS.mock('SQS', 'receiveMessage', sqs_receiveMessage);
      AWS.mock('SQS', 'deleteMessage', {me:"hey"});
      var index = require("../index.js");
    });
  });
});
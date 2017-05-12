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

var Promise = require('bluebird');
var promised_request = Promise.promisify(require('request'));
var fs = require('fs');
var Mustache = require('mustache');
var htmlencode = require('htmlencode');
var path = require('path');
var concat = require('concat-stream-promise');
var inliner = require('html-inline');
var bootprint = require('bootprint');
var json_refs = require('json-refs');
var AWS = require('aws-sdk');
AWS.config.region = 'us-west-2';
AWS.config.setPromisesDependency(Promise);

var sqs = new AWS.SQS({apiVersion: '2012-11-05'});
var QUEUE_URL = process.env.SQS_DEVPORTALSWAGGERDOC_DEV_QUEUE_QUEUE_URL;

var processingMessage = false;

try {
  setInterval(processMessage, 10000);
  processMessage();
} catch (e) {
  console.log(e);
}

function processMessage() {
  if(processingMessage) return;
  processingMessage = true;

  var params = {
    MaxNumberOfMessages: 1,
    QueueUrl: QUEUE_URL,
    WaitTimeSeconds: 20
  };

  return sqs.receiveMessage(params).promise()
    .then(function(data) {
      console.log("receiveMessage",data);
      if(data.Messages && data.Messages.length > 0) {
        var promised_handler = Promise.promisify(exports.handler);
        return promised_handler(JSON.parse(JSON.parse(data.Messages[0].Body).Message))
          .then(function (handlerData) {
            console.log("handlerData",handlerData);
            var deleteParams = {
              QueueUrl: QUEUE_URL,
              ReceiptHandle: data.Messages[0].ReceiptHandle
            };
            return sqs.deleteMessage(deleteParams).promise()
              .then(function(deleteData) {
                console.log("Message Deleted", deleteData);
                processingMessage = false;
                return deleteData;
              })
              .catch(function (error) {
                console.log("deleteMessage Error", error);
                processingMessage = false;
                throw error;
              });
          });
      }
      else {
        processingMessage = false;
      }
    })
    .catch(function (error) {
      console.log("getMessage Error: ", error);
      processingMessage = false;
      throw error;
    });
}

exports.handler = function (event, callback) {
  console.log("0:",process.memoryUsage());
  try {
    console.log("handler(event)",event);
    var swaggerURL = event.swaggerURL;
    var options = {
      url: swaggerURL,
      method: 'GET'
    };
    console.log("options",options);
    return promised_request(options)
      .then(function (swaggerRequestResult) {
        // console.log(swaggerRequestResult);
        if (swaggerRequestResult.statusCode == 200) {
          if (swaggerRequestResult && swaggerRequestResult.body) {
            var swagger = JSON.parse(swaggerRequestResult.body);
            swaggerRequestResult.body = null;
            swagger.info.contact = { email:'it@byu.edu', name: "OIT Service Desk Support", url: 'https://it.byu.edu'};
            try {
              processEvents(swagger);
            } catch (e) {
              console.log(e.message);
            }
            console.log("1:",process.memoryUsage());
            var docObj = {};
            return generateAPIDocumentation(swagger, swaggerURL,docObj)
              .then(function () {
                removeHTMLFilesFromBasepath(swagger.basePath);
                console.log("5:",process.memoryUsage());
                return saveHTMLDocumentation('apis', swagger, docObj)
                  .then(function () {
                    console.log("Success");
                    callback(null, "Success");
                  })
                  .catch(function (error) {
                    console.log("error: " + error.message);
                    callback(null, error.message);
                  });
              });
          }
          else {
            callback("Error in swagger file result.")
          }
        }
        else {
          callback("Error retrieving swagger file.");
        }
      });
  } catch (e) {
    callback(e);
  }
};

function removeHTMLFilesFromBasepath(basePath) {
  const directory = '/tmp'+basePath;

  var files = fs.readdirSync(directory);
  files.forEach(function (file) {
    fs.unlinkSync(path.join(directory, file));
  });
}

function listFilesInDir(directory) {
  var files = fs.readdirSync(directory);
  files.forEach(function (file) {
    console.log(path.join(directory, file));
  });
}

function resolveRefsRecursively(swagger, refsToProcess) {
  return json_refs.resolveRefs(swagger, {subDocPath: refsToProcess.shift()})
    .then(function (resolvedRefsSwagger) {
      if(refsToProcess.length == 0) {
        return resolvedRefsSwagger.resolved;
      }
      else {
        return resolveRefsRecursively(resolvedRefsSwagger.resolved,refsToProcess);
      }
    })
}

function generateAPIDocumentation(swagger, swaggerURL, docObj) {
  var refsToProcess = [];
  var foundRefs = json_refs.findRefs(swagger);
  var exampleRefsFound = false;
  Object.keys(foundRefs).forEach(function (ref) {
    if(ref.indexOf('example') > -1) {
      exampleRefsFound = true;
      refsToProcess.push(ref);
    }
  });
  console.log("2:",process.memoryUsage());

  return resolveRefsRecursively(swagger,refsToProcess)
  // return json_refs.resolveRefs(swagger)
    .then(function (resolvedRefsSwagger) {
      if(exampleRefsFound) {
        swagger = resolvedRefsSwagger;
      }
      // Load bootprint-swagger
      console.log("3:",process.memoryUsage());
      return bootprint
        .load(require('bootprint-openapi'))
        // Customize configuration, override any options
        .merge({
          handlebars: {
            partials: path.join(__dirname, './partials'),
            helpers: require.resolve('./scripts/helpers.js')
          }
        })
        // Specify build source and target
        .build(swagger, '/tmp'+swagger.basePath)
        // Generate swagger-documentation into "target" directory
        .generate()
        .then(function (data) {
          // console.log(data);
          // listFilesInDir('/tmp'+swagger.basePath);
          var inline = inliner({ basedir: '/tmp'+swagger.basePath });
          var r = fs.createReadStream('/tmp'+swagger.basePath+'/index.html');
          // console.log("Got here!");
          return r.pipe(inline).pipe(concat())
            .then(function (body) {
              console.log("4:",process.memoryUsage());
              docObj.Body = body.toString('utf8');
              // console.log(docObj.Body);
              docObj.Body = docObj.Body.substring(docObj.Body.indexOf("<body>")+6,docObj.Body.indexOf("</body>"));
              // docObj.Body = /<body>([\s\S]*?)<\/body>/.exec(docObj.Body)[1];
              docObj.Body += '<meta content="'+ swagger.basePath + "/" + swagger.info.version + '" property="api-context" />';
              // fs.writeFileSync('result.html',docObj.Body,'utf8');
              return;
            });
        });
    })
}

function saveHTMLDocumentation(keyPrefix, swagger, params) {
  var api_key_name = swagger.basePath;
  if(api_key_name.charAt(0) === '/') {
    api_key_name = api_key_name.substr(1);
  }
  console.log(api_key_name);
  params.Bucket = process.env.S3_DEVPORTALSWAGGERDOC_DEV_BUCKET_BUCKET_NAME;
  params.Key = keyPrefix + '/' + api_key_name + '.csv';
  params.ContentType = 'text/plain';
  var domainOrUAPI = "U";
  if(swagger.basePath.indexOf("domains") == 1) {
    domainOrUAPI = "D";
  }
  params.Body = params.Body.replace(/\r?\n|\r/g,"");
  params.Body = htmlencode.htmlEncode(params.Body);
  params.Body = "\"" + swagger.basePath + "\"|\"" + swagger.info.title + "\"|\"" + params.Body + "\"|\"" + domainOrUAPI + "\"|\"" + swagger.basePath + "\"|\"" + swagger.basePath + "\"";
  // fs.writeFileSync('item.csv',params.Body,'utf8');
  var s3bucket = new AWS.S3();
  console.log(process.memoryUsage());
  return s3bucket.putObject(params).promise();
}

function processEvents(swagger) {
  console.log("processEvents");
  if(swagger["x-event-types"]) {
    var eventTypesArray = [];
    for (var key in swagger["x-event-types"]) {
      if (swagger["x-event-types"].hasOwnProperty(key)) {
        swagger["x-event-types"][key].event_type = key;
        eventTypesArray.push(swagger["x-event-types"][key]);
      }
    }
    swagger["x-event-types"] = eventTypesArray;
    var eventTypesTemplate = fs.readFileSync('templates/event-types.mustache','utf-8');
    Mustache.parse(eventTypesTemplate);
    var rendered = Mustache.render(eventTypesTemplate, swagger);
    var docObj = { Body: rendered };
    return saveHTMLDocumentation('events',swagger,docObj);
  }
  else {
    throw Error("No event types defined.");
  }
}

if(process.env.IS_TEST) {
  exports.processMessage = processMessage;
}
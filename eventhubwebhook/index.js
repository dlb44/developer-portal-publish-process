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
var YAML = require('yamljs');
var AWS = require('aws-sdk');
AWS.config.setPromisesDependency(Promise);
const ssm = new AWS.SSM({apiVersion: '2014-11-06'});

function verifyEventHubInvocation(hmac_hash) {
  var params = {
    Names: [
      'devportalwebhook-dev-hmacsecret'
    ],
    WithDecryption: true
  };
  return ssm.getParameters(params).promise()
    .then(response => {
      response.Parameters[0].Value;
      // hash the payload with secret and compare to what is passed in
      return false;
    });
}


/**
 * Entry point of the AWS lambda function which contains the EventHub event domain: edu.byu, entity: AppDevGitHub, event_type: GitHub Push
 * @param event
 * @param context
 * @param callback
 * @returns {Promise.<TResult>}
 */
exports.processEvent = function(event, context, callback) {
  verifyEventHubInvocation()
    .then(function (verified) {
      if( !verified ) {
        callback(null, {
          statusCode: 403,
          headers: {},
          body: "Not Authorized"
        });
      }
      else {
        console.log("event: ",JSON.stringify(event));
        event.body = JSON.parse(event.body);
        if(event.body.event) {
          if (event.body.event.body.ref === "refs/heads/master") {
            if (event.body.event.body.repository.url) {
              var repositoryBaseURL = event.body.event.body.repository.url;
              console.log(repositoryBaseURL);
              return getRepoMeta(repositoryBaseURL)
                .then(function (repoMeta) {
                  if (repoMeta.links.swagger_urls) {
                    console.log(repoMeta.links.swagger_urls);
                    return getListOfChangedSwaggerDocuments(event.body.event.body.repository.full_name, event.body.event.body.before, event.body.event.body.after, repoMeta.links.swagger_urls)
                      .then(function(swagger_document_urls) {
                        var processSwaggerPromises = [];
                        swagger_document_urls.forEach(function (swaggerURL) {
                          console.log(swaggerURL);
                          processSwaggerPromises.push(processSwaggerItem(swaggerURL));
                        });
                        Promise.settle(processSwaggerPromises).then(function (result_list) {
                          callback(null,"Success");
                        });
                      });
                  }
                  else {
                    throw Error("No swagger paths found");
                  }
                })
                .catch(function (error) {
                  console.log(error);
                  callback(null,error.message);
                });
            }
            else {
              callback(null, "Repository URL does not exist.");
            }
          }
          else {
            callback(null, "Acknowledge event");
          }
        }
        else {
          callback(null, "Event does not exist.");
        }
      }
    })
};

/**
 * Inspect the commit log to see if any of the swagger files specified in the swagger_urls array are part of the commit. Returns the list of swagger documents to be processed.
 * @param repository_full_name
 * @param beforeCommitHash
 * @param afterCommitHash
 * @param swagger_urls
 * @returns {Promise.<TResult>}
 */
function getListOfChangedSwaggerDocuments(repository_full_name, beforeCommitHash, afterCommitHash, swagger_urls) {
  var options = {
    // https://api.github.com/repos/byu-oit-appdev/cars-tutorial/compare/632f384b0037e7a7c2636fb7b5ea86e7f5c307f8...f9c0893da817a502b421e18b5ae5d18993536e1e
    url: "https://api.github.com/repos/" + repository_full_name + '/compare/' + beforeCommitHash + '...' + afterCommitHash,
    method: 'GET',
    headers: {
      "User-Agent": "curl/7.51.0"
    },
    json: true

  };
  return promised_request(options)
    .then(function (jsonResponse) {
      if (jsonResponse.statusCode == 200) {
        var swagger_list = [];
        console.log(JSON.stringify(jsonResponse.body));
        jsonResponse.body.files.forEach(function (file) {
          if(swagger_urls.indexOf(file.filename) > -1) {
            console.log("swagger document added: " + file.filename);
            var swagger_raw_url_split = file.raw_url.split('/');
            swagger_raw_url_split[6] = "master";
            var swagger_raw_url = swagger_raw_url_split.join('/');
            swagger_list.push(swagger_raw_url);
          }
        });
        return swagger_list;
      }
      else {
        return [];
      }
    })
    .catch(function (error) {
      console.log(error);
    });
}

/**
 * Retrieves the .repo-meta file that should be in the root directory of the repository.
 * @param repositoryBaseURL
 * @returns {Promise.<TResult>}
 */
function getRepoMeta(repositoryBaseURL) {
  var options = {
    url: repositoryBaseURL + '/raw/master/.repo-meta.json',
    method: 'GET'
  };
  return promised_request(options)
    .then(function (jsonFileResponse) {
      if(jsonFileResponse.statusCode == 404) {
        var options = {
          url: repositoryBaseURL + '/raw/master/.repo-meta.yml',
          method: 'GET'
        };
        return promised_request(options)
          .then(function (ymlFileResponse) {
            if(ymlFileResponse.statusCode == 404) {
              throw Error("No .repo-meta file found");
            }
            else {
              // convert YAML response to JSON object
              return YAML.parse(ymlFileResponse.body);
            }
          })
      }
      else if(jsonFileResponse.statusCode == 200) {
        return JSON.parse(jsonFileResponse.body);
      }
      else {
        throw Error("Error retrieving .repo-meta file.");
      }
    });
}
/**
 * Takes the URL of the swagger document and publishes an SNS topic from which other subscribers can handle the work from this event.
 * @param swaggerURL
 * @returns {*}
 */
function processSwaggerItem(swaggerURL) {
  const sns = new AWS.SNS({ apiVersion: '2010-12-01' });
  let payload = { swaggerURL: swaggerURL};

  const params = {
    Message: JSON.stringify(payload),
    TargetArn: process.env.SNS_DEVPORTALWEBHOOK_DEV_TOPIC_TOPIC_ARN
  };

  return sns.publish(params).promise()
    .then(function (data) {
      console.log("Success");
      console.log(data);
    })
    .catch(function (error) {
      console.log("Error");
      console.log(error);
    });
}

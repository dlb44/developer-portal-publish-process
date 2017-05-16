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

var express = require('express');
var AWS = require('aws-sdk');

var app = express();

app.get('/', function (req, res) {
  try {
    retrieveItems(res, function (err, data) {
      if(err) {
        res.sendStatus(500);
      }
      else {
        res.setHeader('Content-Type','text/plain');
        res.status(200).send(data);
      }
    });
  } catch (e) {
    res.sendStatus(500);
  }
});

app.get('/health', function (req, res) {
  res.sendStatus(200);
});

app.listen(process.env.PORT, function () {
  console.log('App listening on port '+process.env.PORT+'!')
});

function retrieveItems(res, callback) {
  var s3bucket = new AWS.S3();
  let params = {
    Bucket : process.env.S3_DEVELOPERPORTALPUBLISH_DEV_BUCKET_BUCKET_NAME,
    StartAfter : 'apis'
  };
  var currentTotal = 0;
  var responseList = [];
  let contentList = [];

  s3bucket.listObjectsV2(params,function (err, data) {
    if(err) {
      console.log(err.message);
      callback(err);
    }
    contentList = data.Contents;
    var recursiveDataObj = {
      contentList: contentList,
      currentTotal: currentTotal,
      responseList: responseList,
      finished: false
    };
    recursiveCall(recursiveDataObj, function (err1, data1) {
      if(err1) {
        callback(err1);
      }
      else {
        var csv = 'uuid|title|body|domain_or_university_api|path';
        data1.unshift(csv);
        callback(null, data1.join('\n'));
      }
    })
  });
}

function recursiveCall(recursiveDataObj, callback) {
  if(recursiveDataObj.contentList.length == 0) {
    callback(null, recursiveDataObj.responseList);
  }
  else {
    processItem(recursiveDataObj.contentList.shift(),recursiveDataObj, function (err, contents) {
      if(err) {
        callback(null,recursiveDataObj.responseList);
      }
      else if (contents == "Hit Limit") {
        callback(null, recursiveDataObj.responseList);
      }
      else {
        if (contents != "") {
          recursiveDataObj.responseList.push(contents);
        }
        recursiveCall(recursiveDataObj,callback);
      }
    });
  }
}

function processItem(item, recursiveDataObj, callback) {
  if (item.Key) {
    if (item.Key.startsWith("apis") && !item.Key.endsWith("/")) {
      return fetchItem(item.Key,recursiveDataObj, callback)
    }
    else {
      callback(null,"");
    }
  }
  else {
    callback(null,"");
  }
}

function fetchItem(key, recursiveDataObj, callback)
{
  var s3 = new AWS.S3();
  let params = {
    Bucket: process.env.S3_DEVELOPERPORTALPUBLISH_DEV_BUCKET_BUCKET_NAME,
    Key: key
  };
  s3.headObject(params,function (err, data) {
    if(err) {
      callback(err);
    }
    else {
      let contentLength = data.ContentLength;
      if ((recursiveDataObj.currentTotal + contentLength) > 500000000) {
        callback(null,"Hit Limit");
      }
      else {
        recursiveDataObj.currentTotal += contentLength;
        params.ResponseContentType = "text/plain";
        s3.getObject(params, function(err2, data2) {
          if(err2) {
            callback(err2);
          }
          else {
            let content = data2.Body;
            s3.deleteObject({
              Bucket: process.env.S3_DEVELOPERPORTALPUBLISH_DEV_BUCKET_BUCKET_NAME,
              Key: key}, function (err3, data3) {
              if(err3) {
                console.log(err3);
              }
              else {
                console.log("Success on delete!");
                console.log(data3.DeleteMarker);
              }
              callback(null,content);
            });
          }
        });
      }
    }
  });
}
if(process.env.IS_TEST) {
  exports.retrieveItems = retrieveItems;
  exports.recursiveCall = recursiveCall;
  exports.processItem = processItem;
  exports.fetchItem = fetchItem;
}
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
var index = require("../index.js");

describe('API for the Developer Portal site to import generated documentation', function() {
  describe('handler', function() {

    before(function() {
      // runs before all tests in this block
      var itemContent = "/domains/tutorial/cars\"|\"Cars\"|\"&lt;div class=&quot;container&quot;&gt;&lt;&lt;/div&gt;meta content=&quot;/domains/tutorial/cars/v1&quot; property=&quot;api-context&quot; /&gt;\"|\"D\"|\"/domains/tutorial/cars\"|\"/domains/tutorial/cars";
      var bucketList = { Contents: [{Key:'apis/domains/tutorial/cars'},{Key:'apis/domains/tutorial/cars'},{Key:'apis/domains/tutorial/cars'},{Key:'apis/domains/tutorial/cars'}] }
      var headObject = { ContentLength: 150000000};
      var getObject = { Body: itemContent};
      var deleteObject = { DeleteMarker: true};
      AWS.mock('S3','listObjectsV2',bucketList);
      AWS.mock('S3','headObject',headObject);
      AWS.mock('S3','getObject',getObject);
      AWS.mock('S3','deleteObject',deleteObject);
    });

    after(function() {
      // runs after all tests in this block
      AWS.restore('S3','listObjectsV2');
      AWS.restore('S3','headObject');
      AWS.restore('S3','getObject');
      AWS.restore('S3','deleteObject');
    });

    it('should generate and save HTML documentation for api (including x-event-types)', function(done) {
      this.timeout(100000);
      index.retrieveItems({},function(error, response) {
        console.log(response);
        expect(error).to.be.null;
        expect(response).not.to.be.empty;
        done();
      });
    });
  });
});
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
"use strict";
const expect = require('chai').expect;
var fs = require("fs");
var AWS = require('aws-sdk-mock');
var gitHubPush = require("../index.js");

describe('GitHub Push Event', function() {
  describe('#processEvent(event)', function() {

    before(function() {
      AWS.mock('Lambda','invoke','');
    });

    after(function() {
      AWS.restore('Lambda','invoke');
    });

    it('should not generate HTML documentation for apis when swagger changes do not exist', function(done) {
       this.timeout(40000);
      var event = fs.readFileSync("test/resources/event.json","utf-8");
      event = JSON.parse(event);
      gitHubPush.processEvent(event,null,function(error, htmlResponse) {
          expect(htmlResponse).not.to.be.empty;
          done();
        });
    });
    it('should generate HTML documentation for apis when swagger changes exist', function(done) {
       this.timeout(40000);
      var event = fs.readFileSync("test/resources/event_swagger_change.json","utf-8");
      event = JSON.parse(event);
      gitHubPush.processEvent(event,null,function(error, htmlResponse) {
          expect(htmlResponse).not.to.be.empty;
          done();
        });
    });
  });
});
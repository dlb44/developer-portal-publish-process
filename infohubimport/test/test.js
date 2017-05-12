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
var index = require("../index.js");

describe('InfoHub Import', function() {
  describe('handler', function() {

    it('should import an API into InfoHub from a Swagger URL',
      function(done) {
        this.timeout(40000);
        var event = fs.readFileSync("test/resources/event.json","utf-8");
        event = JSON.parse(event);
        var context = {succeed:function(response) {
          expect(response).not.to.be.empty;
          done();
        },fail:function(error){}}
        index.handler(event,context);
      });

  });
});
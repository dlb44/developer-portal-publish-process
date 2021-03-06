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

var request = require('request');

exports.handler = function (event, context) {

  var options = {
    uri: process.env.INFOHUB_IMPORT_URL,
    qs: {
      api_key: process.env.API_KEY
    },
    method: 'POST'
  };

  if(event.swaggerURL) {
    options.qs.url = event.swaggerURL;
  }
  else if(event.swagger) {
    options.qs.json = event;
  }

  request(options, function (error, response, body) {
    if(error)
    {
      context.fail(error);
    }
    else {
      context.succeed(body);
    }
  });
};

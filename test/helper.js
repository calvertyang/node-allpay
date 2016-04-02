var chai = require('chai');
var bunyan = require('bunyan');

chai.config.includeStack = true;

global.expect = chai.expect;
global.AssertionError = chai.AssertionError;
global.Assertion = chai.Assertion;
global.assert = chai.assert;

// setup logger
var logger = bunyan.createLogger({
  name: 'node-allpay-api',
  level: 'debug'
});

global.logger = logger;
/*jslint node: true */
'use strict';

/**
 * 相依模組
 */
var util = require('util');
var crypto = require('crypto');
var http = require('http');
var https = require('https');
var querystring = require('querystring');
var _ = require('lodash');
var moment = require('moment');

/**
 * API 查詢端點
 *
 * @constant {object}
 */
var _ENDPOINT = {
  // 付款
  aioCheckOut : '/Cashier/AioCheckOut/V2',
  // 訂單查詢
  queryTradeInfo: '/Cashier/QueryTradeInfo',
  // 信用卡定期定額訂單查詢
  queryPeriodCreditCardTradeInfo: '/Cashier/QueryPeriodCreditCardTradeInfo',
  // 信用卡關帳/退刷/取消/放棄
  creditDetailDoAction: '/CreditDetail/DoAction',
  //
  aioChargeback: '/Cashier/AioChargeback'
};

/**
 * 回傳值非 JSON 物件之 API 查詢端點
 *
 * @constant {string[]}
 */
var _RETURN_NON_OBJECT_ENDPOINT = [
  _ENDPOINT.aioCheckOut,
  _ENDPOINT.queryTradeInfo,
  _ENDPOINT.creditDetailDoAction,
  _ENDPOINT.aioChargeback
];

/**
 * API 錯誤訊息
 *
 * @constant {object}
 */
var _ERROR_MESSAGES = {
  initializeRequired: 'Allpay not initialized',
  keyAndSecretRequired: 'Key and secret cannot be empty',
  missingParameter: 'Missing parameter ',
  wrongParameter: 'Wrong parameter '
};

/**
 * 設定
 *
 * @property {string} merchantID - 廠商編號
 * @property {string} hashKey - HashKey
 * @property {string} hashIV - HashIV
 * @property {string} baseUrl - API base url
 * @property {boolean} useSSL - 使用 SSL 連線
 * @property {boolean} debug - 顯示除錯訊息
 * @property {boolean} initialized - 初始化註記
 * @private
 */
var _api = {
  merchantID: '',
  hashKey: '',
  hashIV: '',
  baseUrl: 'payment.allpay.com.tw',
  port: 443,
  useSSL: true,
  debug: false,
  initialized: false
};

/**
 * 建構子
 *
 * @param {object} opts - 參數
 * @param {string} opts.merchantID - 廠商編號
 * @param {string} opts.hashKey - Hashkey
 * @param {string} opts.hashIV - HashIV
 * @param {boolean} opts.debug - 選填. 顯示除錯訊息
 */
var Allpay = function(opts) {
  if (typeof opts !== 'object') {
    return sendErrorResponse(null, new Error(_ERROR_MESSAGES.missingParameter));
  }

  if (!opts.hasOwnProperty('merchantID') || !opts.merchantID) {
    return sendErrorResponse(null, new Error(_ERROR_MESSAGES.wrongParameter + '"merchantID"'));
  }

  if (!opts.hasOwnProperty('hashKey') || !opts.hashKey) {
    return sendErrorResponse(null, new Error(_ERROR_MESSAGES.wrongParameter + '"hashKey"'));
  }

  if (!opts.hasOwnProperty('hashIV') || !opts.hashIV) {
    return sendErrorResponse(null, new Error(_ERROR_MESSAGES.wrongParameter + '"hashIV"'));
  }

  if (!(this instanceof Allpay)) {
    return new Allpay(opts);
  }

  this.version = require('../package.json').version;
  _api.merchantID = opts.merchantID;
  _api.hashKey = opts.hashKey;
  _api.hashIV = opts.hashIV;
  _api.debug = opts.debug || false;
  _api.initialized = true;
};

Allpay.prototype = {
  /**
   * 設定連線參數
   *
   * @param {object} opts - 參數
   * @param {string} opts.baseUrl - 選填. 網址
   * @param {string} opts.port - 選填. 連接埠
   * @param {boolean} opts.useSSL - 選填. 使用 SSL 連線
   */
  setHost: function(opts) {
    _api.baseUrl = opts.baseUrl || _api.baseUrl;
    _api.port = opts.port || _api.port;
    _api.useSSL = opts.hasOwnProperty('useSSL') ? opts.useSSL : _api.useSSL;
  },

  /**
   * 產生交易檢查碼
   *
   * @param {Object} data - 交易資料
   */
  genCheckMacValue: function(data) {
    // 若有 CheckMacValue 則先移除
    if (data.hasOwnProperty('CheckMacValue')) {
      delete data.CheckMacValue;
    }

    // 使用物件 key 排序資料
    var keys = Object.keys(data);
    var sortedKeys = _.sortBy(keys, function(key) {
      return key;
    });

    var uri = _.map(sortedKeys, function(key) {
      return key + '=' + data[key];
    }).join('&');

    uri = util.format('HashKey=%s&%s&HashIV=%s', _api.hashKey, uri, _api.hashIV);
    uri = encodeURIComponent(uri);
    var regex;
    var find = ["%2d", "%5f", "%2e", "%21", "%2a", "%28", "%29", "%20"];
    var replace = ["-", "_", ".", "!", "*", "(", ")", "+"];
    for (var i = 0; i < find.length; i++) {
      regex = new RegExp(find[i], "g");
      uri = uri.replace(regex, replace[i]);
    }
    uri = uri.toLowerCase();
    var checksum = crypto.createHash('md5').update(uri).digest('hex').toUpperCase();

    return checksum;
  },

  /**
   * 送出訂單
   *
   * @param {object} opts - 參數
   * @param {string} opts.MerchantTradeNo - 廠商交易編號
   */
  aioCheckOut: function(opts, callback){
    var data = {};

    if (typeof opts !== 'object') {
      return sendErrorResponse(callback, new Error(_ERROR_MESSAGES.missingParameter));
    }

    // 廠商編號
    data.MerchantID = _api.merchantID;

    // 廠商交易編號
    if (!opts.hasOwnProperty('MerchantTradeNo') || !opts.MerchantTradeNo) {
      return sendErrorResponse(callback, new Error(_ERROR_MESSAGES.wrongParameter + '"MerchantTradeNo"'));
    }
    data.MerchantTradeNo = opts.MerchantTradeNo;


    data.MerchantTradeDate = moment().format('YYYY/MM/DD HH:mm:ss');

    // 付款方式
    // if (!opts.hasOwnProperty('PaymentType') || !opts.MerchantTradeNo) {
    //   return sendErrorResponse(callback, new Error(_ERROR_MESSAGES.wrongParameter + '"PaymentType"'));
    // }
    // data.PaymentType = opts.PaymentType;
    data.PaymentType = 'aio'

    // 總金額
    if (!opts.hasOwnProperty('TotalAmount') || !opts.TotalAmount) {
      return sendErrorResponse(callback, new Error(_ERROR_MESSAGES.wrongParameter + '"TotalAmount"'));
    }
    data.TotalAmount = opts.TotalAmount;

    // 交易描述
    if (!opts.hasOwnProperty('TradeDesc') || !opts.TradeDesc) {
      return sendErrorResponse(callback, new Error(_ERROR_MESSAGES.wrongParameter + '"TradeDesc"'));
    }
    data.TradeDesc = opts.TradeDesc;

    // 項目
    if (!opts.hasOwnProperty('itemName') || !opts.itemName || !Array.isArray(opts.itemName)) {
      return sendErrorResponse(callback, new Error(_ERROR_MESSAGES.wrongParameter + '"itemName"'));
    }

    data.itemName = '';
    var items = [];

    for (var i of opts.itemName){
      if ( !i.hasOwnProperty('name') ||
           !i.hasOwnProperty('qty') ||
           !i.hasOwnProperty('price') )
      {
        return sendErrorResponse(callback, new Error(_ERROR_MESSAGES.wrongParameter + '"itemName"'));
        break;
      }

      items.push(i.name + i.price + ' 元 X' + i.qty);
    }
    data.itemName = items.join('#');


    // 付款完成通知回傳網址
    if (!opts.hasOwnProperty('ReturnURL') || !opts.ReturnURL) {
      return sendErrorResponse(callback, new Error(_ERROR_MESSAGES.wrongParameter + '"ReturnURL"'));
    }
    data.ReturnURL = opts.ReturnURL;

    // 效費者付款方式
    if (!opts.hasOwnProperty('ChoosePayment') || !opts.ChoosePayment) {
      return sendErrorResponse(callback, new Error(_ERROR_MESSAGES.wrongParameter + '"ChoosePayment"'));
    }
    data.ChoosePayment = opts.ChoosePayment;

    // 驗證時間
    // data.TimeStamp = Date.now();

    // 檢查碼
    data.CheckMacValue = opts.hasOwnProperty('CheckMacValue') ? opts.CheckMacValue : this.genCheckMacValue(data);

    // sendRequest('POST', _ENDPOINT.aioCheckOut, data, callback);
    callback({
      url: 'https://' + _api.baseUrl + _ENDPOINT.aioCheckOut,
      data: data
    });
  },

  /**
   * 訂單查詢
   *
   * @param {object} opts - 參數
   * @param {string} opts.MerchantTradeNo - 廠商交易編號
   * @param {string} opts.PlatformID - 選填. 特約合作平台商代號
   * @param {string} opts.CheckMacValue - 選填. 檢查碼
   * @param {requestCallback} callback - 處理回應的 callback
   */
  queryTradeInfo: function(opts, callback) {
    var data = {};

    if (typeof opts !== 'object') {
      return sendErrorResponse(callback, new Error(_ERROR_MESSAGES.missingParameter));
    }

    // 廠商編號
    data.MerchantID = _api.merchantID;

    // 廠商交易編號
    if (!opts.hasOwnProperty('MerchantTradeNo') || !opts.MerchantTradeNo) {
      return sendErrorResponse(callback, new Error(_ERROR_MESSAGES.wrongParameter + '"MerchantTradeNo"'));
    }
    data.MerchantTradeNo = opts.MerchantTradeNo;

    // 驗證時間
    data.TimeStamp = Date.now();

    // 特約合作平台商代號
    if (opts.hasOwnProperty('PlatformID') && opts.PlatformID) {
      data.PlatformID = opts.PlatformID;
    }

    // 檢查碼
    data.CheckMacValue = opts.hasOwnProperty('CheckMacValue') ? opts.CheckMacValue : this.genCheckMacValue(data);

    sendRequest('POST', _ENDPOINT.queryTradeInfo, data, callback);
  },

  /**
   * 信用卡定期定額訂單查詢
   *
   * @param {object} opts - 參數
   * @param {string} opts.MerchantTradeNo - 廠商交易編號
   * @param {string} opts.CheckMacValue - 選填. 檢查碼
   * @param {requestCallback} callback - 處理回應的 callback
   */
  queryPeriodCreditCardTradeInfo: function(opts, callback) {
    var data = {};

    if (typeof opts !== 'object') {
      return sendErrorResponse(callback, new Error(_ERROR_MESSAGES.missingParameter));
    }

    // 廠商編號
    data.MerchantID = _api.merchantID;

    // 廠商交易編號
    if (!opts.hasOwnProperty('MerchantTradeNo') || !opts.MerchantTradeNo) {
      return sendErrorResponse(callback, new Error(_ERROR_MESSAGES.wrongParameter + '"MerchantTradeNo"'));
    }
    data.MerchantTradeNo = opts.MerchantTradeNo;

    // 驗證時間
    data.TimeStamp = Date.now();

    // 檢查碼
    data.CheckMacValue = opts.hasOwnProperty('CheckMacValue') ? opts.CheckMacValue : this.genCheckMacValue(data);

    sendRequest('POST', _ENDPOINT.queryPeriodCreditCardTradeInfo, data, callback);
  },

  /**
   * 信用卡關帳/退刷/取消/放棄
   *
   * @param {object} opts - 參數
   * @param {string} opts.MerchantTradeNo - 廠商交易編號
   * @param {string} opts.TradeNo - AllPay 的交易編號
   * @param {string} opts.Action - 執行動作
   * @param {string} opts.TotalAmount - 金額
   * @param {string} opts.PlatformID - 選填. 特約合作平台商代號
   * @param {string} opts.CheckMacValue - 選填. 檢查碼
   */
  creditDetailDoAction: function(opts, callback) {
    var data = {};

    if (typeof opts !== 'object') {
      return sendErrorResponse(callback, new Error(_ERROR_MESSAGES.missingParameter));
    }

    // 廠商編號
    data.MerchantID = _api.merchantID;

    // 廠商交易編號
    if (!opts.hasOwnProperty('MerchantTradeNo') || !opts.MerchantTradeNo) {
      return sendErrorResponse(callback, new Error(_ERROR_MESSAGES.wrongParameter + '"MerchantTradeNo"'));
    }
    data.MerchantTradeNo = opts.MerchantTradeNo;

    // AllPay 的交易編號
    if (!opts.hasOwnProperty('TradeNo') || !opts.TradeNo) {
      return sendErrorResponse(callback, new Error(_ERROR_MESSAGES.wrongParameter + '"TradeNo"'));
    }
    data.TradeNo = opts.TradeNo;

    // 執行動作
    if (!opts.hasOwnProperty('Action') || !opts.Action) {
      return sendErrorResponse(callback, new Error(_ERROR_MESSAGES.wrongParameter + '"Action"'));
    }
    data.Action = opts.Action;

    // 執行動作
    if (!opts.hasOwnProperty('TotalAmount') || isNaN(Number(opts.TotalAmount))) {
      return sendErrorResponse(callback, new Error(_ERROR_MESSAGES.wrongParameter + '"TotalAmount"'));
    }
    data.TotalAmount = Number(opts.TotalAmount);

    // 特約合作平台商代號
    if (opts.hasOwnProperty('PlatformID') && opts.PlatformID) {
      data.PlatformID = opts.PlatformID;
    }

    // 檢查碼
    data.CheckMacValue = opts.hasOwnProperty('CheckMacValue') ? opts.CheckMacValue : this.genCheckMacValue(data);

    sendRequest('POST', _ENDPOINT.creditDetailDoAction, data, callback);
  },

  /**
   * 廠商通知退款
   *
   * @param {object} opts - 參數
   * @param {string} opts.MerchantTradeNo - 廠商交易編號
   * @param {string} opts.TradeNo - AllPay 的交易編號
   * @param {string} opts.ChargeBackTotalAmount - 退款金額
   * @param {string} opts.Remark - 選填. 備註欄位
   * @param {string} opts.PlatformID - 選填. 特約合作平台商代號
   * @param {string} opts.CheckMacValue - 選填. 檢查碼
   */
  aioChargeback: function(opts, callback) {
    var data = {};

    if (typeof opts !== 'object') {
      return sendErrorResponse(callback, new Error(_ERROR_MESSAGES.missingParameter));
    }

    // 廠商編號
    data.MerchantID = _api.merchantID;

    // 廠商交易編號
    if (!opts.hasOwnProperty('MerchantTradeNo') || !opts.MerchantTradeNo) {
      return sendErrorResponse(callback, new Error(_ERROR_MESSAGES.wrongParameter + '"MerchantTradeNo"'));
    }
    data.MerchantTradeNo = opts.MerchantTradeNo;

    // AllPay 的交易編號
    if (!opts.hasOwnProperty('TradeNo') || !opts.TradeNo) {
      return sendErrorResponse(callback, new Error(_ERROR_MESSAGES.wrongParameter + '"TradeNo"'));
    }
    data.TradeNo = opts.TradeNo;

    // 退款金額
    if (!opts.hasOwnProperty('ChargeBackTotalAmount') || !opts.ChargeBackTotalAmount) {
      return sendErrorResponse(callback, new Error(_ERROR_MESSAGES.wrongParameter + '"ChargeBackTotalAmount"'));
    }
    data.ChargeBackTotalAmount = opts.ChargeBackTotalAmount;

    // 備註欄位
    if (opts.hasOwnProperty('Remark') && opts.Remark) {
      data.Remark = opts.Remark;
    }

    // 特約合作平台商代號
    if (opts.hasOwnProperty('PlatformID') && opts.PlatformID) {
      data.PlatformID = opts.PlatformID;
    }

    // 檢查碼
    data.CheckMacValue = opts.hasOwnProperty('CheckMacValue') ? opts.CheckMacValue : this.genCheckMacValue(data);

    sendRequest('POST', _ENDPOINT.aioChargeback, data, callback);
  }
};

/**
 * Send HTTP/HTTPS request
 *
 * @param {string} method - HTTP 方法
 * @param {string} path - 請求路徑
 * @param {object} data - 資料物件
 * @param {requestCallback} callback - 處理回應的 callback
 * @private
 */
function sendRequest(method, path, data, callback) {
  if (!_api.initialized) {
    throw _ERROR_MESSAGES.initializeRequired;
  }

  log('The following data will be sent');
  log(data);

  var dataString = querystring.stringify(data);

  var header = {
    'Content-Type': 'application/x-www-form-urlencoded'
  };

  // 使用 POST 時設定 Content-Length 標頭
  if (method === 'POST') {
    header['Content-Length'] = dataString.length;
  } else {
    path += '?' + dataString;
  }

  var options = {
    host: _api.baseUrl,
    port: 443,
    path: path,
    method: method,
    headers: header
  };

  var request;
  if (!_api.useSSL) {
    options.port = 80;
    request = http.request(options);
  } else {
    request = https.request(options);
  }

  log(options);

  if (method === 'POST') {
    request.write(dataString);
  }

  request.end();

  var buffer = '';
  request.on('response', function (response) {
    response.setEncoding('utf8');

    response.on('data', function (chunk) {
      buffer += chunk;
    });

    response.on('end', function () {
      var responseData;

      log('response ended');

      if (callback) {
        var err = null;

        // 另外處理非 JSON 物件的返回值
        if (_RETURN_NON_OBJECT_ENDPOINT.indexOf(path) !== -1) {
          if (response.statusCode === 200) {
            var responseArr;
            if (path === _ENDPOINT.aioChargeback) {
              responseArr = buffer.split('|');
              responseData = {
                status: responseArr[0],
                message: responseArr[1]
              };
            } else {
              responseArr = buffer.split('&');
              responseData = {};
              for (var i in responseArr) {
                var key = responseArr[i].split('=')[0];
                var val = responseArr[i].split('=')[1];
                responseData[key] = val;
              }
            }
          } else {
            err = response.statusCode;
          }
        } else {
          try {
            responseData = JSON.parse(buffer);
          } catch (_error) {
            // log('buffer:');
            // log(buffer);
            var parserError = _error;
            log(parserError);
            log('could not convert API response to JSON, above error is ignored and raw API response is returned to client');
            err = parserError;
          }
        }

        callback(err, responseData);
      }
    });

    response.on('close', function (e) {
      log('problem with API request detailed stacktrace below ');
      log(e);
      callback(e);
    });
  });

  request.on('error', function (e) {
    log('problem with API request detailed stacktrace below ');
    log(e);
    callback(e);
  });
}

/**
 * 返回或拋出錯誤回應
 *
 * @param {requestCallback} callback - 處理回應的 callback
 * @param {Object} err - 錯誤物件
 * @param {Object} returnData - 回應資料
 * @private
 */
function sendErrorResponse(callback, err, returnData) {
  if (callback) {
    callback(err, returnData);
  } else {
    throw err;
  }
}

/**
 * 訊息紀錄
 *
 * @param {Object} - 訊息物件
 * @private
 */
function log(message) {
  if (message instanceof Error) {
    console.log(message.stack);
  }

  if (_api.debug) {
    if (typeof message === 'object') {
      console.log(JSON.stringify(message, null, 2));
    } else {
      console.log(message);
    }
  }
}

/**
 * 模組匯出
 */
module.exports = Allpay;

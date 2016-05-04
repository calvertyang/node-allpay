// dependencies
import util from "util";
import crypto from "crypto";
import http from "http";
import https from "https";
import querystring from "querystring";

/**
 * API 查詢端點
 *
 * @constant {object}
 */
const ENDPOINT = {
  // 訂單產生
  aioCheckOut: "/Cashier/AioCheckOut/V2",
  // 訂單查詢
  queryTradeInfo: "/Cashier/QueryTradeInfo/V2",
  // 信用卡定期定額訂單查詢
  queryCreditCardPeriodInfo: "/Cashier/QueryCreditCardPeriodInfo",
  // 信用卡關帳/退刷/取消/放棄
  doAction: "/CreditDetail/DoAction",
  // 廠商通知退款
  aioChargeback: "/Cashier/AioChargeback",
  // 廠商申請撥款/退款
  capture: "/Cashier/Capture"
};

/**
 * 回傳值非 JSON 物件之 API 查詢端點
 *
 * @constant {string[]}
 */
const NON_JSON_RESPONSE_ENDPOINT = [
  ENDPOINT.aioCheckOut,
  ENDPOINT.queryTradeInfo,
  ENDPOINT.doAction,
  ENDPOINT.aioChargeback,
  ENDPOINT.capture
];

/**
 * API 錯誤訊息
 *
 * @constant {object}
 */
const ERROR_MESSAGE = {
  initializeRequired: "Allpay has not been initialized.",
  wrongParameter: "Wrong parameter.",
  requiredParameter: "%s is required.",
  lengthLimitation: "The maximum length for %s is %d.",
  fixedLengthLimitation: "The length for %s should be %d.",
  removeParameter: "Please remove %s.",
  invalidParameter: "%s should be %s.",
  wrongDataFormat: "The %s data format is wrong.",
  cannotBeEmpty: "%s cannot be empty.",
  notSupported: "This feature is not supported in test mode."
};

/**
 * 主機位址
 *
 * @constant {object}
 */
const HOST = {
  production: "payment.allpay.com.tw",
  test: "payment-stage.allpay.com.tw"
};

/**
 * 設定
 *
 * @property {string} merchantID - 廠商編號
 * @property {string} hashKey - HashKey
 * @property {string} hashIV - HashIV
 * @property {string} baseUrl - API base url
 * @property {boolean} useSSL - 是否使用 SSL 連線
 * @property {string} mode - "production" 或 "test"
 * @property {boolean} debug - 顯示除錯訊息
 * @property {boolean} initialized - 初始化標記
 * @private
 */
let CONFIG = {
  merchantID: "",
  hashKey: "",
  hashIV: "",
  mode: "test",
  debug: false,
  host: HOST.test,
  port: 443,
  useSSL: true,
  isInitialized: false
};

class Allpay {

  /**
   * 建構子
   */
  constructor({ merchantID, hashKey, hashIV, mode, debug } = {}) {
    if (typeof merchantID === "undefined") {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "merchantID");
      return sendErrorResponse(errorMsg);
    }
    if (typeof merchantID !== "string") {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "merchantID", "string");
      return sendErrorResponse(errorMsg);
    }
    if (merchantID.length > 10) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "merchantID", 10);
      return sendErrorResponse(errorMsg);
    }
    CONFIG.merchantID = merchantID;

    if (typeof hashKey === "undefined") {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "hashKey");
      return sendErrorResponse(errorMsg);
    }
    if (typeof hashKey !== "string") {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "hashKey", "string");
      return sendErrorResponse(errorMsg);
    }
    CONFIG.hashKey = hashKey;

    if (typeof hashIV === "undefined") {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "hashIV");
      return sendErrorResponse(errorMsg);
    }
    if (typeof hashIV !== "string") {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "hashIV", "string");
      return sendErrorResponse(errorMsg);
    }
    CONFIG.hashIV = hashIV;

    if (typeof mode !== "undefined") {
      if (typeof mode !== "string") {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "mode", "string");
        return sendErrorResponse(errorMsg);
      }
      if (["test", "production"].indexOf(mode) === -1) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "mode", "'test' or 'production'");
        return sendErrorResponse(errorMsg);
      }

      CONFIG.mode = mode;
    }

    if (typeof debug !== "undefined") {
      if (typeof debug !== "boolean") {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "debug", "boolean");
        return sendErrorResponse(errorMsg);
      }

      CONFIG.debug = debug;
    }

    CONFIG.host = mode === "production" ? HOST.production : HOST.test;

    if (!(this instanceof Allpay)) {
      return new Allpay(opts);
    }

    this.version = require("../package.json").version;

    CONFIG.isInitialized = true;

    log("==================================================");
    log("Allpay SDK config")
    log("==================================================");
    log(CONFIG);
  }

  /**
   * 設定連線參數
   *
   * @param {string} host - 選填. 主機位址
   * @param {string} port - 選填. 通訊埠
   * @param {boolean} useSSL - 選填. 是否使用 SSL 連線
   */
  setHost({ host, port, useSSL } = {}) {
    if (host !== undefined) {
      if (typeof host !== "string") {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "host", "string");
        return sendErrorResponse(errorMsg);
      }

      CONFIG.host = host;
    }

    if (port !== undefined) {
      if (!Number.isInteger(port)) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "port", "number");
        return sendErrorResponse(errorMsg);
      }

      CONFIG.port = port;
    }

    if (useSSL !== undefined) {
      if (typeof useSSL !== "boolean") {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "useSSL", "boolean");
        return sendErrorResponse(errorMsg);
      }

      CONFIG.useSSL = useSSL;
    }

    log("==================================================");
    log("Current host data")
    log("==================================================");
    log(`Host: ${CONFIG.host}\nPort: ${CONFIG.port}\nUse SSL: ${CONFIG.useSSL}`);
  }

  /**
   * 取得目前設定
   */
  getConfig() {
    log("==================================================");
    log("Current config data")
    log("==================================================");
    log(JSON.stringify(CONFIG, null, 2));

    return CONFIG;
  }

  /**
   * 訂單產生
   *
   * @param {object} opts - 訂單產生相關參數，請參考「全方位金流API介接技術文件」
   * @param {requestCallback} callback - 處理回應的 callback
   */
  aioCheckOut(opts, callback = undefined) {
    let data = {};

    // 參數檢查
    if (typeof opts !== "object") {
      return sendErrorResponse(new Error(ERROR_MESSAGE.wrongParameter), callback);
    }

    if (!opts.hasOwnProperty("MerchantTradeNo")) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "MerchantTradeNo");
      return sendErrorResponse(errorMsg, callback);
    }
    if (typeof opts.MerchantTradeNo !== "string") {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "MerchantTradeNo", "string");
      return sendErrorResponse(errorMsg, callback);
    }
    if (opts.MerchantTradeNo.length > 20) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "MerchantTradeNo", 20);
      return sendErrorResponse(errorMsg, callback);
    }

    if (!opts.hasOwnProperty("MerchantTradeDate")) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "MerchantTradeDate");
      return sendErrorResponse(errorMsg, callback);
    }
    if (typeof opts.MerchantTradeDate !== "string") {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "MerchantTradeDate", "string");
      return sendErrorResponse(errorMsg, callback);
    }

    if (opts.MerchantTradeDate.length > 20) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "MerchantTradeDate", 20);
      return sendErrorResponse(errorMsg, callback);
    }

    //
    // NOTE: 2016/05/04 - 目前預設自動帶入 aio
    //
    // if (!opts.hasOwnProperty("PaymentType")) {
    //   let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "PaymentType");
    //   return sendErrorResponse(errorMsg, callback);
    // }
    // if (typeof opts.PaymentType !== "string") {
    //   let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "PaymentType", "string");
    //   return sendErrorResponse(errorMsg, callback);
    // }
    // if (opts.PaymentType.length > 20) {
    //   let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "PaymentType", 20);
    //   return sendErrorResponse(errorMsg, callback);
    // }

    if (!opts.hasOwnProperty("TotalAmount")) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "TotalAmount");
      return sendErrorResponse(errorMsg, callback);
    }
    if (!Number.isInteger(opts.TotalAmount)) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "TotalAmount", "number");
      return sendErrorResponse(errorMsg, callback);
    }

    if (!opts.hasOwnProperty("TradeDesc")) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "TradeDesc");
      return sendErrorResponse(errorMsg, callback);
    }
    if (typeof opts.TradeDesc !== "string") {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "TradeDesc", "string");
      return sendErrorResponse(errorMsg, callback);
    }
    if (opts.TradeDesc.length > 200) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "TradeDesc", 200);
      return sendErrorResponse(errorMsg, callback);
    }

    if (!opts.hasOwnProperty("Items")) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "Items");
      return sendErrorResponse(errorMsg, callback);
    }
    if (!Array.isArray(opts.Items)) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "Items", "array");
      return sendErrorResponse(errorMsg, callback);
    }
    if (opts.Items.length === 0) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.cannotBeEmpty, "Items");
      return sendErrorResponse(errorMsg, callback);
    }
    opts.Items.forEach((item) => {
      if (!item.hasOwnProperty("name")) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "Items.name");
        return sendErrorResponse(errorMsg, callback);
      }
      if (typeof item.name !== "string") {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "Items.name", "string");
        return sendErrorResponse(errorMsg, callback);
      }

      if (!item.hasOwnProperty("price")) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "Items.price");
        return sendErrorResponse(errorMsg, callback);
      }
      if (!Number.isInteger(item.price)) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "Items.price", "number");
        return sendErrorResponse(errorMsg, callback);
      }

      if (!item.hasOwnProperty("currency")) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "Items.currency");
        return sendErrorResponse(errorMsg, callback);
      }
      if (typeof item.currency !== "string") {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "Items.currency", "string");
        return sendErrorResponse(errorMsg, callback);
      }

      if (!item.hasOwnProperty("quantity")) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "Items.quantity");
        return sendErrorResponse(errorMsg, callback);
      }
      if (!Number.isInteger(item.quantity)) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "Items.quantity", "number");
        return sendErrorResponse(errorMsg, callback);
      }
    });

    if (!opts.hasOwnProperty("ReturnURL")) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "ReturnURL");
      return sendErrorResponse(errorMsg, callback);
    }
    if (typeof opts.ReturnURL !== "string") {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "ReturnURL", "string");
      return sendErrorResponse(errorMsg, callback);
    }
    if (opts.ReturnURL.length > 200) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "ReturnURL", 200);
      return sendErrorResponse(errorMsg, callback);
    }

    if (!opts.hasOwnProperty("ChoosePayment")) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "ChoosePayment");
      return sendErrorResponse(errorMsg, callback);
    }
    if (typeof opts.ChoosePayment !== "string") {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "ChoosePayment", "string");
      return sendErrorResponse(errorMsg, callback);
    }
    if (opts.ChoosePayment.length > 20) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "ChoosePayment", 20);
      return sendErrorResponse(errorMsg, callback);
    }

    if (opts.hasOwnProperty("ClientBackURL")) {
      if (typeof opts.ClientBackURL !== "string") {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "ClientBackURL", "string");
        return sendErrorResponse(errorMsg, callback);
      }
      if (opts.ClientBackURL.length > 200) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "ClientBackURL", 200);
        return sendErrorResponse(errorMsg, callback);
      }
    }

    if (opts.hasOwnProperty("ItemURL")) {
      if (typeof opts.ItemURL !== "string") {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "ItemURL", "string");
        return sendErrorResponse(errorMsg, callback);
      }
      if (opts.ItemURL.length > 200) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "ItemURL", 200);
        return sendErrorResponse(errorMsg, callback);
      }
    }

    if (opts.hasOwnProperty("Remark")) {
      if (typeof opts.Remark !== "string") {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "Remark", "string");
        return sendErrorResponse(errorMsg, callback);
      }
      if (opts.Remark.length > 100) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "Remark", 100);
        return sendErrorResponse(errorMsg, callback);
      }
    }

    if (opts.hasOwnProperty("ChooseSubPayment")) {
      if (typeof opts.ChooseSubPayment !== "string") {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "ChooseSubPayment", "string");
        return sendErrorResponse(errorMsg, callback);
      }
      if (opts.ChooseSubPayment.length > 20) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "ChooseSubPayment", 20);
        return sendErrorResponse(errorMsg, callback);
      }
    }

    if (opts.hasOwnProperty("OrderResultURL")) {
      if (typeof opts.OrderResultURL !== "string") {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "OrderResultURL", "string");
        return sendErrorResponse(errorMsg, callback);
      }
      if (opts.OrderResultURL.length > 200) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "OrderResultURL", 200);
        return sendErrorResponse(errorMsg, callback);
      }
    }

    if (opts.hasOwnProperty("NeedExtraPaidInfo")) {
      if (typeof opts.NeedExtraPaidInfo !== "string") {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "NeedExtraPaidInfo", "string");
        return sendErrorResponse(errorMsg, callback);
      }
      if (opts.NeedExtraPaidInfo.length > 1) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "NeedExtraPaidInfo", 1);
        return sendErrorResponse(errorMsg, callback);
      }
    }

    if (opts.hasOwnProperty("DeviceSource")) {
      if (typeof opts.DeviceSource !== "string") {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "DeviceSource", "string");
        return sendErrorResponse(errorMsg, callback);
      }
      if (opts.DeviceSource.length > 10) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "DeviceSource", 10);
        return sendErrorResponse(errorMsg, callback);
      }
    }

    if (opts.hasOwnProperty("IgnorePayment")) {
      if (typeof opts.IgnorePayment !== "string") {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "IgnorePayment", "string");
        return sendErrorResponse(errorMsg, callback);
      }
      if (opts.IgnorePayment.length > 100) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "IgnorePayment", 100);
        return sendErrorResponse(errorMsg, callback);
      }
    }

    if (opts.hasOwnProperty("PlatformID")) {
      if (typeof opts.PlatformID !== "string") {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "PlatformID", "string");
        return sendErrorResponse(errorMsg, callback);
      }
      if (opts.PlatformID.length > 10) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "PlatformID", 10);
        return sendErrorResponse(errorMsg, callback);
      }
    }

    if (opts.hasOwnProperty("InvoiceMark")) {
      if (typeof opts.InvoiceMark !== "string") {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "InvoiceMark", "string");
        return sendErrorResponse(errorMsg, callback);
      }
      if (opts.InvoiceMark.length > 1) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "InvoiceMark", 1);
        return sendErrorResponse(errorMsg, callback);
      }
    }

    if (opts.hasOwnProperty("HoldTradeAMT")) {
      if (!Number.isInteger(opts.HoldTradeAMT)) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "HoldTradeAMT", "number");
        return sendErrorResponse(errorMsg, callback);
      }
    }

    if (opts.hasOwnProperty("EncryptType")) {
      if (!Number.isInteger(opts.EncryptType)) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "EncryptType", "number");
        return sendErrorResponse(errorMsg, callback);
      }
    }

    if (opts.hasOwnProperty("UseRedeem")) {
      if (typeof opts.UseRedeem !== "string") {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "UseRedeem", "string");
        return sendErrorResponse(errorMsg, callback);
      }
      if (opts.UseRedeem.length > 1) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "UseRedeem", 1);
        return sendErrorResponse(errorMsg, callback);
      }
    }

    if (["ATM", "CVS", "BARCODE"].indexOf(opts.ChoosePayment) > -1) {
      if (opts.ChoosePayment === "ATM") {
        if (opts.hasOwnProperty("ExpireDate")) {
          if (!Number.isInteger(opts.ExpireDate)) {
            let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "ExpireDate", "number");
            return sendErrorResponse(errorMsg, callback);
          }
          if (opts.ExpireDate < 1 || opts.ExpireDate > 60) {
            let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "ExpireDate", "1 ~ 60");
            return sendErrorResponse(errorMsg, callback);
          }
        }
      } else {
        if (opts.hasOwnProperty("StoreExpireDate")) {
          if (!Number.isInteger(opts.StoreExpireDate)) {
            let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "StoreExpireDate", "number");
            return sendErrorResponse(errorMsg, callback);
          }
        }

        if (opts.hasOwnProperty("Desc_1")) {
          if (typeof opts.Desc_1 !== "string") {
            let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "Desc_1", "string");
            return sendErrorResponse(errorMsg, callback);
          }
          if (opts.Desc_1.length > 20) {
            let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "Desc_1", 20);
            return sendErrorResponse(errorMsg, callback);
          }
        }

        if (opts.hasOwnProperty("Desc_2")) {
          if (typeof opts.Desc_2 !== "string") {
            let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "Desc_2", "string");
            return sendErrorResponse(errorMsg, callback);
          }
          if (opts.Desc_2.length > 20) {
            let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "Desc_2", 20);
            return sendErrorResponse(errorMsg, callback);
          }
        }

        if (opts.hasOwnProperty("Desc_3")) {
          if (typeof opts.Desc_3 !== "string") {
            let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "Desc_3", "string");
            return sendErrorResponse(errorMsg, callback);
          }
          if (opts.Desc_3.length > 20) {
            let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "Desc_3", 20);
            return sendErrorResponse(errorMsg, callback);
          }
        }

        if (opts.hasOwnProperty("Desc_4")) {
          if (typeof opts.Desc_4 !== "string") {
            let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "Desc_4", "string");
            return sendErrorResponse(errorMsg, callback);
          }
          if (opts.Desc_4.length > 20) {
            let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "Desc_4", 20);
            return sendErrorResponse(errorMsg, callback);
          }
        }
      }

      if (opts.hasOwnProperty("PaymentInfoURL")) {
        if (typeof opts.PaymentInfoURL !== "string") {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "PaymentInfoURL", "string");
          return sendErrorResponse(errorMsg, callback);
        }
        if (opts.PaymentInfoURL.length > 200) {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "PaymentInfoURL", 200);
          return sendErrorResponse(errorMsg, callback);
        }
      }

      if (opts.hasOwnProperty("ClientRedirectURL")) {
        if (typeof opts.ClientRedirectURL !== "string") {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "ClientRedirectURL", "string");
          return sendErrorResponse(errorMsg, callback);
        }
        if (opts.ClientRedirectURL.length > 200) {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "ClientRedirectURL", 200);
          return sendErrorResponse(errorMsg, callback);
        }
      }
    }

    if (opts.ChoosePayment === "Alipay") {
      if (!opts.hasOwnProperty("Email")) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "Email");
        return sendErrorResponse(errorMsg, callback);
      }
      if (typeof opts.Email !== "string") {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "Email", "string");
        return sendErrorResponse(errorMsg, callback);
      }
      if (opts.Email.length > 200) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "Email", 200);
        return sendErrorResponse(errorMsg, callback);
      }

      if (!opts.hasOwnProperty("PhoneNo")) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "PhoneNo");
        return sendErrorResponse(errorMsg, callback);
      }
      if (typeof opts.PhoneNo !== "string") {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "PhoneNo", "string");
        return sendErrorResponse(errorMsg, callback);
      }
      if (opts.PhoneNo.length > 20) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "PhoneNo", 20);
        return sendErrorResponse(errorMsg, callback);
      }

      if (!opts.hasOwnProperty("UserName")) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "UserName");
        return sendErrorResponse(errorMsg, callback);
      }
      if (typeof opts.UserName !== "string") {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "UserName", "string");
        return sendErrorResponse(errorMsg, callback);
      }
      if (opts.UserName.length > 20) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "UserName", 20);
        return sendErrorResponse(errorMsg, callback);
      }
    }

    if (opts.ChoosePayment === "Tenpay") {
      if (opts.hasOwnProperty("ExpireTime")) {
        if (typeof opts.ExpireTime !== "string") {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "ExpireTime", "string");
          return sendErrorResponse(errorMsg, callback);
        }
        if (opts.ExpireTime.length > 20) {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "ExpireTime", 20);
          return sendErrorResponse(errorMsg, callback);
        }
      }
    }

    if (opts.ChoosePayment === "Credit") {
      if (opts.hasOwnProperty("CreditInstallment")) {
        if (!Number.isInteger(opts.CreditInstallment)) {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "CreditInstallment", "number");
          return sendErrorResponse(errorMsg, callback);
        }
      }

      if (opts.hasOwnProperty("InstallmentAmount")) {
        if (!Number.isInteger(opts.InstallmentAmount)) {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "InstallmentAmount", "number");
          return sendErrorResponse(errorMsg, callback);
        }
      }

      if (opts.hasOwnProperty("Redeem")) {
        if (typeof opts.Redeem !== "string") {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "Redeem", "string");
          return sendErrorResponse(errorMsg, callback);
        }
        if (opts.Redeem.length > 1) {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "Redeem", 1);
          return sendErrorResponse(errorMsg, callback);
        }
      }

      if (opts.hasOwnProperty("UnionPay")) {
        if (!Number.isInteger(opts.UnionPay)) {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "UnionPay", "number");
          return sendErrorResponse(errorMsg, callback);
        }
      }

      if (opts.hasOwnProperty("Language")) {
        if (typeof opts.Language !== "string") {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "Language", "string");
          return sendErrorResponse(errorMsg, callback);
        }
        if (opts.Language.length > 3) {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "Language", 3);
          return sendErrorResponse(errorMsg, callback);
        }
      }

      if (opts.hasOwnProperty("PeriodAmount")) {
        if (!Number.isInteger(opts.PeriodAmount)) {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "PeriodAmount", "number");
          return sendErrorResponse(errorMsg, callback);
        }
      }

      if (opts.hasOwnProperty("PeriodType")) {
        if (typeof opts.PeriodType !== "string") {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "PeriodType", "string");
          return sendErrorResponse(errorMsg, callback);
        }
        if (opts.PeriodType.length > 1) {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "PeriodType", 1);
          return sendErrorResponse(errorMsg, callback);
        }
      }

      if (opts.hasOwnProperty("Frequency")) {
        if (!Number.isInteger(opts.Frequency)) {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "Frequency", "number");
          return sendErrorResponse(errorMsg, callback);
        }
      }

      if (opts.hasOwnProperty("ExecTimes")) {
        if (!Number.isInteger(opts.ExecTimes)) {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "ExecTimes", "number");
          return sendErrorResponse(errorMsg, callback);
        }
      }

      if (opts.hasOwnProperty("PeriodReturnURL")) {
        if (typeof opts.PeriodReturnURL !== "string") {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "PeriodReturnURL", "string");
          return sendErrorResponse(errorMsg, callback);
        }
        if (opts.PeriodReturnURL.length > 200) {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "PeriodReturnURL", 200);
          return sendErrorResponse(errorMsg, callback);
        }
      }
    }

    if (opts.InvoiceMark === "Y") {
      if (!opts.hasOwnProperty("RelateNumber")) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "RelateNumber");
        return sendErrorResponse(errorMsg, callback);
      }
      if (typeof opts.RelateNumber !== "string") {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "RelateNumber", "string");
        return sendErrorResponse(errorMsg, callback);
      }
      if (opts.RelateNumber.length > 30) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "RelateNumber", 30);
        return sendErrorResponse(errorMsg, callback);
      }

      if (opts.hasOwnProperty("CarruerType")) {
        if (typeof opts.CarruerType !== "string") {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "CarruerType", "string");
          return sendErrorResponse(errorMsg, callback);
        }
        if (opts.CarruerType.length > 1) {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "CarruerType", 1);
          return sendErrorResponse(errorMsg, callback);
        }
      }

      if (opts.CarruerType === "1") {
        if (!opts.hasOwnProperty("CustomerID") || !opts.CustomerID) {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "CustomerID");
          return sendErrorResponse(errorMsg, callback);
        }
      }
      if (opts.hasOwnProperty("CustomerID")) {
        if (typeof opts.CustomerID !== "string") {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "CustomerID", "string");
          return sendErrorResponse(errorMsg, callback);
        }

        if (opts.CustomerID.length > 20) {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "CustomerID", 20);
          return sendErrorResponse(errorMsg, callback);
        }
      }

      if (opts.hasOwnProperty("CustomerIdentifier")) {
        if (typeof opts.CustomerIdentifier !== "string") {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "CustomerIdentifier", "string");
          return sendErrorResponse(errorMsg, callback);
        }

        if (opts.CustomerIdentifier.length !== 8) {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.fixedLengthLimitation, "CustomerIdentifier", 8);
          return sendErrorResponse(errorMsg, callback);
        }
      }

      if (opts.hasOwnProperty("Donation")) {
        if (typeof opts.Donation !== "string") {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "Donation", "string");
          return sendErrorResponse(errorMsg, callback);
        }
        if (opts.Donation.length > 1) {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "Donation", 1);
          return sendErrorResponse(errorMsg, callback);
        }
      }

      if (opts.hasOwnProperty("Print")) {
        if (typeof opts.Print !== "string") {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "Print", "string");
          return sendErrorResponse(errorMsg, callback);
        }
        if (opts.Print.length > 1) {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "Print", 1);
          return sendErrorResponse(errorMsg, callback);
        }
      }

      if (opts.Donation === "1" && opts.Print === "1") {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "Print", "0");
        return sendErrorResponse(errorMsg, callback);
      }
      if (opts.hasOwnProperty("CustomerIdentifier") && opts.CustomerIdentifier !== "") {
        if (!opts.hasOwnProperty("Print") || opts.Print === "0") {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "Print", "1");
          return sendErrorResponse(errorMsg, callback);
        }
      }

      if (opts.Print === "1") {
        if (!opts.hasOwnProperty("CustomerName") || !opts.CustomerName) {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "CustomerName");
          return sendErrorResponse(errorMsg, callback);
        }
        if (!opts.hasOwnProperty("CustomerAddr") || !opts.CustomerAddr) {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "CustomerAddr");
          return sendErrorResponse(errorMsg, callback);
        }
      }

      if (opts.hasOwnProperty("CustomerName")) {
        if (typeof opts.CustomerName !== "string") {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "CustomerName", "string");
          return sendErrorResponse(errorMsg, callback);
        }
        if (opts.CustomerName.length > 20) {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "CustomerName", 20);
          return sendErrorResponse(errorMsg, callback);
        }
      }

      if (opts.hasOwnProperty("CustomerAddr")) {
        if (typeof opts.CustomerAddr !== "string") {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "CustomerAddr", "string");
          return sendErrorResponse(errorMsg, callback);
        }
        if (opts.CustomerAddr.length > 200) {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "CustomerAddr", 200);
          return sendErrorResponse(errorMsg, callback);
        }
      }

      if (!opts.CustomerPhone && !opts.CustomerEmail) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "CustomerPhone or CustomerEmail");
        return sendErrorResponse(errorMsg, callback);
      }

      if (opts.hasOwnProperty("CustomerPhone")) {
        if (typeof opts.CustomerPhone !== "string") {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "CustomerPhone", "string");
          return sendErrorResponse(errorMsg, callback);
        }
        if (opts.CustomerPhone.length > 20) {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "CustomerPhone", 20);
          return sendErrorResponse(errorMsg, callback);
        }
      }

      if (opts.hasOwnProperty("CustomerEmail")) {
        if (typeof opts.CustomerEmail !== "string") {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "CustomerEmail", "string");
          return sendErrorResponse(errorMsg, callback);
        }
        if (opts.CustomerEmail.length > 200) {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "CustomerEmail", 200);
          return sendErrorResponse(errorMsg, callback);
        }
      }

      if (!opts.hasOwnProperty("TaxType")) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "TaxType");
        return sendErrorResponse(errorMsg, callback);
      }
      if (typeof opts.TaxType !== "string") {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "TaxType", "string");
        return sendErrorResponse(errorMsg, callback);
      }
      if (opts.TaxType.length > 1) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "TaxType", 1);
        return sendErrorResponse(errorMsg, callback);
      }

      if (opts.hasOwnProperty("ClearanceMark")) {
        if (typeof opts.ClearanceMark !== "string") {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "ClearanceMark", "string");
          return sendErrorResponse(errorMsg, callback);
        }
        if (opts.ClearanceMark.length > 1) {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "ClearanceMark", 1);
          return sendErrorResponse(errorMsg, callback);
        }
      }

      if (opts.TaxType === "2") {
        if (!opts.hasOwnProperty("ClearanceMark") || !opts.ClearanceMark) {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "ClearanceMark");
          return sendErrorResponse(errorMsg, callback);
        }
      }

      if (opts.hasOwnProperty("CarruerNum")) {
        if (typeof opts.CarruerNum !== "string") {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "CarruerNum", "string");
          return sendErrorResponse(errorMsg, callback);
        }
        if (opts.CarruerNum.length > 64) {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "CarruerNum", 64);
          return sendErrorResponse(errorMsg, callback);
        }
      }

      switch (opts.CarruerType) {
        case undefined:
        case "":
        case "1":
          if (opts.hasOwnProperty("CarruerNum") && opts.CarruerNum !== "") {
            let errorMsg = genErrorMessage(ERROR_MESSAGE.removeParameter, "CarruerNum");
            return sendErrorResponse(errorMsg, callback);
          }
          break;
        case "2":
          if (!opts.CarruerNum.match(/^[a-zA-Z]{2}\d{14}$/)) {
            let errorMsg = genErrorMessage(ERROR_MESSAGE.wrongDataFormat, "CarruerNum");
            return sendErrorResponse(errorMsg, callback);
          }
          break;
        case "3":
          if (!opts.CarruerNum.match(/^\/{1}[0-9a-zA-Z+-.]{7}$/)) {
            let errorMsg = genErrorMessage(ERROR_MESSAGE.wrongDataFormat, "CarruerNum");
            return sendErrorResponse(errorMsg, callback);
          }
          break;
        default:
          let errorMsg = genErrorMessage(ERROR_MESSAGE.removeParameter, "CarruerNum");
          return sendErrorResponse(errorMsg, callback);
      }

      if (opts.CustomerIdentifier !== "" && opts.Donation === "1") {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "Donation", "2");
        return sendErrorResponse(errorMsg, callback);
      }

      if (opts.Donation === "1") {
        if (!opts.hasOwnProperty("LoveCode") || !opts.LoveCode) {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "LoveCode");
          return sendErrorResponse(errorMsg, callback);
        }
        if (typeof opts.LoveCode !== "string") {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "LoveCode", "string");
          return sendErrorResponse(errorMsg, callback);
        }
        if (!opts.LoveCode.match(/^([xX]{1}[0-9]{2,6}|[0-9]{3,7})$/)) {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.wrongDataFormat, "LoveCode");
          return sendErrorResponse(errorMsg, callback);
        }
      }

      if (!opts.hasOwnProperty("InvoiceItems")) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "InvoiceItems");
        return sendErrorResponse(errorMsg, callback);
      }
      if (!Array.isArray(opts.InvoiceItems)) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "InvoiceItems", "array");
        return sendErrorResponse(errorMsg, callback);
      }
      if (opts.InvoiceItems.length === 0) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.cannotBeEmpty, "InvoiceItems");
        return sendErrorResponse(errorMsg, callback);
      }
      opts.InvoiceItems.forEach((invoiceItem) => {
        if (!invoiceItem.hasOwnProperty("name")) {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "InvoiceItems.name");
          return sendErrorResponse(errorMsg, callback);
        }
        if (typeof invoiceItem.name !== "string") {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "InvoiceItems.name", "string");
          return sendErrorResponse(errorMsg, callback);
        }

        if (!invoiceItem.hasOwnProperty("count")) {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "InvoiceItems.count");
          return sendErrorResponse(errorMsg, callback);
        }
        if (!Number.isInteger(invoiceItem.count)) {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "InvoiceItems.count", "number");
          return sendErrorResponse(errorMsg, callback);
        }

        if (!invoiceItem.hasOwnProperty("word")) {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "InvoiceItems.word");
          return sendErrorResponse(errorMsg, callback);
        }
        if (typeof invoiceItem.word !== "string") {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "InvoiceItems.word", "string");
          return sendErrorResponse(errorMsg, callback);
        }

        if (!invoiceItem.hasOwnProperty("price")) {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "InvoiceItems.price");
          return sendErrorResponse(errorMsg, callback);
        }
        if (!Number.isInteger(invoiceItem.price)) {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "InvoiceItems.price", "number");
          return sendErrorResponse(errorMsg, callback);
        }

        if (!invoiceItem.hasOwnProperty("taxType")) {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "InvoiceItems.taxType");
          return sendErrorResponse(errorMsg, callback);
        }
        if (typeof invoiceItem.taxType !== "string") {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "InvoiceItems.taxType", "string");
          return sendErrorResponse(errorMsg, callback);
        }
      });

      if (opts.hasOwnProperty("DelayDay")) {
        if (!Number.isInteger(opts.DelayDay)) {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "DelayDay", "number");
          return sendErrorResponse(errorMsg, callback);
        }
        if (opts.DelayDay < 0 || opts.DelayDay > 15) {
          let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "DelayDay", "0 ~ 15");
          return sendErrorResponse(errorMsg, callback);
        }
      }

      if (!opts.hasOwnProperty("InvType")) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "InvType");
        return sendErrorResponse(errorMsg, callback);
      }
      if (typeof opts.InvType !== "string") {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "InvType", "string");
        return sendErrorResponse(errorMsg, callback);
      }
      if (opts.InvType.length > 2) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "InvType", 2);
        return sendErrorResponse(errorMsg, callback);
      }
    }

    // 廠商編號
    data.MerchantID = CONFIG.merchantID;

    // 廠商交易編號
    data.MerchantTradeNo = opts.MerchantTradeNo;

    // 廠商交易時間
    data.MerchantTradeDate = opts.MerchantTradeDate;

    // 交易類型
    data.PaymentType = "aio";

    // 交易金額
    data.TotalAmount = opts.TotalAmount;

    // 交易描述
    data.TradeDesc = opts.TradeDesc;

    // 商品名稱
    let items = [];
    let alipayItemNames = [];
    let alipayItemCounts = [];
    let alipayItemPrices = [];
    opts.Items.forEach((item) => {
      items.push(`${item.name} ${item.price} ${item.currency} x ${item.quantity}`);

      if (opts.ChoosePayment === "Alipay") {
        alipayItemNames.push(item.name);
        alipayItemCounts.push(item.quantity);
        alipayItemPrices.push(item.price);
      }
    });
    data.ItemName = items.join("#").substr(0, 200);

    // 付款完成通知回傳網址
    data.ReturnURL = opts.ReturnURL;

    // 選擇預設付款方式
    data.ChoosePayment = opts.ChoosePayment;

    // Client 端返回廠商網址
    if (opts.hasOwnProperty("ClientBackURL")) {
      data.ClientBackURL = opts.ClientBackURL;
    }

    // 商品銷售網址
    if (opts.hasOwnProperty("ItemURL")) {
      data.ItemURL = opts.ItemURL;
    }

    // 備註欄位
    if (opts.hasOwnProperty("Remark")) {
      data.Remark = opts.Remark;
    }

    // 選擇預設付款子項目
    if (opts.hasOwnProperty("ChooseSubPayment")) {
      data.ChooseSubPayment = opts.ChooseSubPayment;
    }

    // Client 端回傳付款結果網址
    if (opts.hasOwnProperty("OrderResultURL")) {
      data.OrderResultURL = opts.OrderResultURL;
    }

    // 是否需要額外的付款資訊
    if (opts.hasOwnProperty("NeedExtraPaidInfo")) {
      data.NeedExtraPaidInfo = opts.NeedExtraPaidInfo;
    }

    // 裝置來源
    if (opts.hasOwnProperty("DeviceSource")) {
      data.DeviceSource = opts.DeviceSource;
    }

    // 隱藏付款方式
    if (data.ChoosePayment === "ALL" && opts.hasOwnProperty("IgnorePayment")) {
      data.IgnorePayment = opts.IgnorePayment;
    }

    // 特約合作平台商代號
    if (opts.hasOwnProperty("PlatformID")) {
      data.PlatformID = opts.PlatformID;
    }

    // 電子發票開註記
    if (opts.hasOwnProperty("InvoiceMark")) {
      data.InvoiceMark = opts.InvoiceMark;
    }

    // 是否延遲撥款
    if (opts.hasOwnProperty("HoldTradeAMT")) {
      data.HoldTradeAMT = opts.HoldTradeAMT;
    }

    // CheckMacValue 加密類型
    if (opts.hasOwnProperty("EncryptType")) {
      data.EncryptType = opts.EncryptType;
    }

    // 是否可以使用購物金/紅包折抵
    if (opts.hasOwnProperty("UseRedeem")) {
      data.UseRedeem = opts.UseRedeem;
    }

    if (data.ChoosePayment === "ATM") {
      // 允許繳費有效天數
      if (opts.hasOwnProperty("ExpireDate")) {
        data.ExpireDate = opts.ExpireDate;
      }

      // Server 端回傳付款相關資訊
      if (opts.hasOwnProperty("PaymentInfoURL")) {
        data.PaymentInfoURL = opts.PaymentInfoURL;
      }

      // Client 端回傳付款相關資訊
      if (opts.hasOwnProperty("ClientRedirectURL")) {
        data.ClientRedirectURL = opts.ClientRedirectURL;
      }
    }

    if (["CVS", "BARCODE"].indexOf(data.ChoosePayment) > -1) {
      // 超商繳費截止時間
      if (opts.hasOwnProperty("StoreExpireDate")) {
        data.StoreExpireDate = opts.StoreExpireDate;
      }

      // 交易描述 1
      if (opts.hasOwnProperty("Desc_1")) {
        data.Desc_1 = opts.Desc_1;
      }

      // 交易描述 2
      if (opts.hasOwnProperty("Desc_2")) {
        data.Desc_2 = opts.Desc_2;
      }

      // 交易描述 3
      if (opts.hasOwnProperty("Desc_3")) {
        data.Desc_3 = opts.Desc_3;
      }

      // 交易描述 4
      if (opts.hasOwnProperty("Desc_4")) {
        data.Desc_4 = opts.Desc_4;
      }

      // Server 端回傳付款相關資訊
      if (opts.hasOwnProperty("PaymentInfoURL")) {
        data.PaymentInfoURL = opts.PaymentInfoURL;
      }

      // Client 端回傳付款相關資訊
      if (opts.hasOwnProperty("ClientRedirectURL")) {
        data.ClientRedirectURL = opts.ClientRedirectURL;
      }
    }

    if (data.ChoosePayment === "Alipay") {
      // 商品名稱
      data.AlipayItemName = alipayItemNames.join("#").substr(0, 200);

      // 商品購買數量
      data.AlipayItemCounts = alipayItemCounts.join("#").substr(0, 100);

      // 商品單價
      data.AlipayItemPrice = alipayItemPrices.join("#").substr(0, 20);

      // 購買人信箱
      data.Email = opts.Email;

      // 購買人電話
      data.PhoneNo = opts.PhoneNo;

      // 購買人姓名
      data.UserName = opts.UserName;
    }

    if (data.ChoosePayment === "Tenpay") {
      // 付款截止時間
      if (opts.hasOwnProperty("ExpireTime")) {
        data.ExpireTime = opts.ExpireTime;
      }
    }

    if (data.ChoosePayment === "Credit") {
      // 刷卡分期期數
      if (opts.hasOwnProperty("CreditInstallment")) {
        data.CreditInstallment = opts.CreditInstallment;
      }

      // 使用刷卡分期的付款金額
      if (opts.hasOwnProperty("InstallmentAmount")) {
        data.InstallmentAmount = opts.InstallmentAmount;
      }

      // 信用卡是否使用紅利折抵
      if (opts.hasOwnProperty("Redeem")) {
        data.Redeem = opts.Redeem;
      }

      // 是否為銀聯卡交易
      if (opts.hasOwnProperty("UnionPay")) {
        data.UnionPay = opts.UnionPay;
      }

      // 語系設定
      if (opts.hasOwnProperty("Language")) {
        data.Language = opts.Language;
      }

      // 每次授權金額
      if (opts.hasOwnProperty("PeriodAmount")) {
        data.PeriodAmount = opts.PeriodAmount;
      }

      // 週期種類
      if (opts.hasOwnProperty("PeriodType")) {
        data.PeriodType = opts.PeriodType;
      }

      // 執行頻率
      if (opts.hasOwnProperty("Frequency")) {
        data.Frequency = opts.Frequency;
      }

      // 執行次數
      if (opts.hasOwnProperty("ExecTimes")) {
        data.ExecTimes = opts.ExecTimes;
      }

      // 定期定額的執行結果回應 URL語系設定
      if (opts.hasOwnProperty("PeriodReturnURL")) {
        data.PeriodReturnURL = opts.PeriodReturnURL;
      }
    }

    if (data.InvoiceMark === "Y") {
      // 廠商自訂編號
      data.RelateNumber = opts.RelateNumber;

      // 客戶代號
      data.CustomerID = opts.CustomerID || "";

      // 統一編號
      data.CustomerIdentifier = opts.CustomerIdentifier || "";

      // 客戶名稱
      data.CustomerName = urlEncode(opts.CustomerName || "");

      // 客戶地址
      data.CustomerAddr = urlEncode(opts.CustomerAddr || "");

      // 客戶手機號碼
      data.CustomerPhone = opts.CustomerPhone || "";

      // 客戶電子信箱
      data.CustomerEmail = urlEncode(opts.CustomerEmail || "");

      // 通關方式
      data.ClearanceMark = opts.ClearanceMark || "";

      // 課稅類別
      data.TaxType = opts.TaxType;

      // 載具類別
      data.CarruerType = opts.CarruerType || "";

      // 載具編號
      data.CarruerNum = opts.CarruerNum || "";

      // 捐贈註記
      data.Donation = opts.Donation || "2";

      // 愛心碼
      data.LoveCode = opts.LoveCode || "";

      // 列印註記
      data.Print = opts.Print || "0";

      let itemNames = [];
      let itemCounts = [];
      let itemWords = [];
      let itemPrices = [];
      let itemTaxTypes = [];
      opts.InvoiceItems.forEach((item) => {
        itemNames.push(urlEncode(item.name));
        itemCounts.push(item.count);
        itemWords.push(urlEncode(item.word));
        itemPrices.push(item.price);
        itemTaxTypes.push(item.taxType);
      });

      // 商品名稱
      data.InvoiceItemName = itemNames.join("|");

      // 商品數量
      data.InvoiceItemCount = itemCounts.join("|");

      // 商品單位
      data.InvoiceItemWord = itemWords.join("|");

      // 商品價格
      data.InvoiceItemPrice = itemPrices.join("|");

      // 商品課稅別
      data.InvoiceItemTaxType = itemTaxTypes.join("|");

      // 備註
      data.InvoiceRemark = urlEncode(opts.InvoiceRemark || "");

      // 延遲天數
      data.DelayDay = opts.DelayDay || 0;

      // 字軌類別
      data.InvType = opts.InvType;
    }

    // 檢查碼
    data.CheckMacValue = opts.hasOwnProperty("CheckMacValue") ? opts.CheckMacValue : this.genCheckMacValue(data, data.EncryptType === 1 ? "sha256" : "md5" );

    // 產生表單資料
    let url = `${CONFIG.useSSL ? "https" : "http"}://${CONFIG.host}${ENDPOINT.aioCheckOut}`;
    let target = opts.target || "_self";
    let html = `<form id="_allpayForm" method="post" target="${target}" action="${url}">`;
    Object.keys(data).forEach((key) => {
      html += `<input type="hidden" name="${key}" value="${data[key]}" />`;
    });
    if (opts.hasOwnProperty("paymentButton") && opts.paymentButton !== "") {
      html += `<input type="submit" id="_paymentButton" value="${opts.paymentButton}" />`;
    } else {
      html += '<script type="text/javascript">document.getElementById("_allpayForm").submit();</script>';
    }
    html += "</form>"

    if (callback) {
      callback(undefined, {
        url: url,
        data: data,
        html: html
      });
    }
  }

  /**
   * 訂單查詢
   *
   * @param {object} opts - 訂單查詢相關參數，請參考「全方位金流API介接技術文件」
   * @param {requestCallback} callback - 處理回應的 callback
   */
  queryTradeInfo(opts, callback = undefined) {
    let data = {};

    // 參數檢查
    if (typeof opts !== "object") {
      return sendErrorResponse(new Error(ERROR_MESSAGE.wrongParameter), callback);
    }

    if (!opts.hasOwnProperty("MerchantTradeNo")) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "MerchantTradeNo");
      return sendErrorResponse(errorMsg, callback);
    }
    if (typeof opts.MerchantTradeNo !== "string") {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "MerchantTradeNo", "string");
      return sendErrorResponse(errorMsg, callback);
    }
    if (opts.MerchantTradeNo.length > 20) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "MerchantTradeNo", 20);
      return sendErrorResponse(errorMsg, callback);
    }

    if (opts.hasOwnProperty("PlatformID") && opts.PlatformID.length > 10) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "PlatformID", 10);
      return sendErrorResponse(errorMsg, callback);
    }

    // 廠商編號
    data.MerchantID = CONFIG.merchantID;

    // 廠商交易編號
    data.MerchantTradeNo = opts.MerchantTradeNo;

    // 驗證時間
    data.TimeStamp = Date.now();

    // 特約合作平台商代號
    if (opts.hasOwnProperty("PlatformID")) {
      data.PlatformID = opts.PlatformID;
    }

    // 檢查碼
    data.CheckMacValue = opts.hasOwnProperty("CheckMacValue") ? opts.CheckMacValue : this.genCheckMacValue(data);

    sendRequest("POST", ENDPOINT.queryTradeInfo, data, callback);
  }

  /**
   * 信用卡定期定額訂單查詢
   *
   * @param {object} opts - 信用卡定期定額訂單查詢相關參數，請參考「全方位金流API介接技術文件」
   * @param {requestCallback} callback - 處理回應的 callback
   */
  queryCreditCardPeriodInfo(opts, callback = undefined) {
    let data = {};

    // 參數檢查
    if (typeof opts !== "object") {
      return sendErrorResponse(new Error(ERROR_MESSAGE.wrongParameter), callback);
    }

    if (!opts.hasOwnProperty("MerchantTradeNo")) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "MerchantTradeNo");
      return sendErrorResponse(errorMsg, callback);
    }
    if (typeof opts.MerchantTradeNo !== "string") {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "MerchantTradeNo", "string");
      return sendErrorResponse(errorMsg, callback);
    }
    if (opts.MerchantTradeNo.length > 20) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "MerchantTradeNo", 20);
      return sendErrorResponse(errorMsg, callback);
    }

    // 廠商編號
    data.MerchantID = CONFIG.merchantID;

    // 廠商交易編號
    data.MerchantTradeNo = opts.MerchantTradeNo;

    // 驗證時間
    data.TimeStamp = Date.now();

    // 檢查碼
    data.CheckMacValue = opts.hasOwnProperty("CheckMacValue") ? opts.CheckMacValue : this.genCheckMacValue(data);

    sendRequest("POST", ENDPOINT.queryCreditCardPeriodInfo, data, callback);
  }

  /**
   * 信用卡關帳/退刷/取消/放棄
   *
   * @param {object} opts - 信用卡關帳/退刷/取消/放棄相關參數，請參考「全方位金流API介接技術文件」
   * @param {requestCallback} callback - 處理回應的 callback
   */
  doAction(opts, callback = undefined) {
    if (CONFIG.mode === "test") {
      return sendErrorResponse(new Error(ERROR_MESSAGE.notSupported), callback);
    }

    let data = {};

    // 參數檢查
    if (typeof opts !== "object") {
      return sendErrorResponse(new Error(ERROR_MESSAGE.wrongParameter), callback);
    }

    if (!opts.hasOwnProperty("MerchantTradeNo")) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "MerchantTradeNo");
      return sendErrorResponse(errorMsg, callback);
    }
    if (typeof opts.MerchantTradeNo !== "string") {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "MerchantTradeNo", "string");
      return sendErrorResponse(errorMsg, callback);
    }
    if (opts.MerchantTradeNo.length > 20) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "MerchantTradeNo", 20);
      return sendErrorResponse(errorMsg, callback);
    }

    if (!opts.hasOwnProperty("TradeNo")) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "TradeNo");
      return sendErrorResponse(errorMsg, callback);
    }
    if (typeof opts.TradeNo !== "string") {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "TradeNo", "string");
      return sendErrorResponse(errorMsg, callback);
    }
    if (opts.TradeNo.length > 20) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "TradeNo", 20);
      return sendErrorResponse(errorMsg, callback);
    }

    if (!opts.hasOwnProperty("Action")) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "Action");
      return sendErrorResponse(errorMsg, callback);
    }
    if (typeof opts.Action !== "string") {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "Action", "string");
      return sendErrorResponse(errorMsg, callback);
    }
    if (opts.Action.length > 1) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "Action", 1);
      return sendErrorResponse(errorMsg, callback);
    }

    if (!opts.hasOwnProperty("TotalAmount")) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "TotalAmount");
      return sendErrorResponse(errorMsg, callback);
    }
    if (!Number.isInteger(opts.TotalAmount)) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "TotalAmount", "number");
      return sendErrorResponse(errorMsg, callback);
    }

    if (opts.hasOwnProperty("PlatformID")) {
      if (typeof opts.PlatformID !== "string") {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "PlatformID", "string");
        return sendErrorResponse(errorMsg, callback);
      }

      if (opts.PlatformID.length > 10) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "PlatformID", 10);
        return sendErrorResponse(errorMsg, callback);
      }
    }

    // 廠商編號
    data.MerchantID = CONFIG.merchantID;

    // 廠商交易編號
    data.MerchantTradeNo = opts.MerchantTradeNo;

    // AllPay 的交易編號
    data.TradeNo = opts.TradeNo;

    // 執行動作
    data.Action = opts.Action;

    // 金額
    data.TotalAmount = opts.TotalAmount;

    // 特約合作平台商代號
    if (opts.hasOwnProperty("PlatformID")) {
      data.PlatformID = opts.PlatformID;
    }

    // 檢查碼
    data.CheckMacValue = opts.hasOwnProperty("CheckMacValue") ? opts.CheckMacValue : this.genCheckMacValue(data);

    sendRequest("POST", ENDPOINT.doAction, data, callback);
  }

  /**
   * 廠商通知退款
   *
   * @param {object} opts - 廠商通知退款相關參數，請參考「全方位金流API介接技術文件」
   * @param {requestCallback} callback - 處理回應的 callback
   */
  aioChargeback(opts, callback = undefined) {
    let data = {};

    // 參數檢查
    if (typeof opts !== "object") {
      return sendErrorResponse(new Error(ERROR_MESSAGE.wrongParameter), callback);
    }

    if (!opts.hasOwnProperty("MerchantTradeNo")) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "MerchantTradeNo");
      return sendErrorResponse(errorMsg, callback);
    }
    if (typeof opts.MerchantTradeNo !== "string") {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "MerchantTradeNo", "string");
      return sendErrorResponse(errorMsg, callback);
    }
    if (opts.MerchantTradeNo.length > 20) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "MerchantTradeNo", 20);
      return sendErrorResponse(errorMsg, callback);
    }

    if (!opts.hasOwnProperty("TradeNo")) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "TradeNo");
      return sendErrorResponse(errorMsg, callback);
    }
    if (typeof opts.TradeNo !== "string") {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "TradeNo", "string");
      return sendErrorResponse(errorMsg, callback);
    }
    if (opts.TradeNo.length > 20) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "TradeNo", 20);
      return sendErrorResponse(errorMsg, callback);
    }

    if (!opts.hasOwnProperty("ChargeBackTotalAmount")) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "ChargeBackTotalAmount");
      return sendErrorResponse(errorMsg, callback);
    }
    if (!Number.isInteger(opts.ChargeBackTotalAmount)) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "ChargeBackTotalAmount", "number");
      return sendErrorResponse(errorMsg, callback);
    }

    if (opts.hasOwnProperty("Remark")) {
      if (typeof opts.Remark !== "string") {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "Remark", "string");
        return sendErrorResponse(errorMsg, callback);
      }

      if (opts.Remark.length > 100) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "Remark", 100);
        return sendErrorResponse(errorMsg, callback);
      }
    }

    if (opts.hasOwnProperty("PlatformID")) {
      if (typeof opts.PlatformID !== "string") {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "PlatformID", "string");
        return sendErrorResponse(errorMsg, callback);
      }

      if (opts.PlatformID.length > 10) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "PlatformID", 10);
        return sendErrorResponse(errorMsg, callback);
      }
    }

    // 廠商編號
    data.MerchantID = CONFIG.merchantID;

    // 廠商交易編號
    data.MerchantTradeNo = opts.MerchantTradeNo;

    // AllPay 的交易編號
    data.TradeNo = opts.TradeNo;

    // 退款金額
    data.ChargeBackTotalAmount = opts.ChargeBackTotalAmount;

    // 備註欄位
    if (opts.hasOwnProperty("Remark")) {
      data.Remark = opts.Remark;
    }

    // 特約合作平台商代號
    if (opts.hasOwnProperty("PlatformID")) {
      data.PlatformID = opts.PlatformID;
    }

    // 檢查碼
    data.CheckMacValue = opts.hasOwnProperty("CheckMacValue") ? opts.CheckMacValue : this.genCheckMacValue(data);

    sendRequest("POST", ENDPOINT.aioChargeback, data, callback);
  }

  /**
   * 廠商申請撥款/退款
   *
   * @param {object} opts - 廠商申請撥款/退款相關參數，請參考「全方位金流API介接技術文件」
   * @param {requestCallback} callback - 處理回應的 callback
   */
  capture(opts, callback = undefined) {
    let data = {};

    // 參數檢查
    if (typeof opts !== "object") {
      return sendErrorResponse(new Error(ERROR_MESSAGE.wrongParameter), callback);
    }

    if (!opts.hasOwnProperty("MerchantTradeNo")) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "MerchantTradeNo");
      return sendErrorResponse(errorMsg, callback);
    }
    if (typeof opts.MerchantTradeNo !== "string") {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "MerchantTradeNo", "string");
      return sendErrorResponse(errorMsg, callback);
    }
    if (opts.MerchantTradeNo.length > 20) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "MerchantTradeNo", 20);
      return sendErrorResponse(errorMsg, callback);
    }

    if (!opts.hasOwnProperty("CaptureAMT")) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "CaptureAMT");
      return sendErrorResponse(errorMsg, callback);
    }
    if (!Number.isInteger(opts.CaptureAMT)) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "CaptureAMT", "number");
      return sendErrorResponse(errorMsg, callback);
    }

    if (!opts.hasOwnProperty("UserRefundAMT")) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "UserRefundAMT");
      return sendErrorResponse(errorMsg, callback);
    }
    if (!Number.isInteger(opts.UserRefundAMT)) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "UserRefundAMT", "number");
      return sendErrorResponse(errorMsg, callback);
    }

    if (opts.UserRefundAMT !== 0) {
      if (!opts.hasOwnProperty("UserName")) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "UserName");
        return sendErrorResponse(errorMsg, callback);
      }

      if (!opts.hasOwnProperty("UserCellPhone")) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "UserCellPhone");
        return sendErrorResponse(errorMsg, callback);
      }
    }

    if (opts.hasOwnProperty("UserName")) {
      if (typeof opts.UserName !== "string") {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "UserName", "string");
        return sendErrorResponse(errorMsg, callback);
      }

      if (opts.UserName.length > 20) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "UserName", 20);
        return sendErrorResponse(errorMsg, callback);
      }
    }

    if (opts.hasOwnProperty("UserCellPhone")) {
      if (typeof opts.UserCellPhone !== "string") {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "UserCellPhone", "string");
        return sendErrorResponse(errorMsg, callback);
      }

      if (opts.UserCellPhone.length > 20) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "UserCellPhone", 20);
        return sendErrorResponse(errorMsg, callback);
      }
    }

    if (opts.hasOwnProperty("PlatformID")) {
      if (typeof opts.PlatformID !== "string") {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "PlatformID", "string");
        return sendErrorResponse(errorMsg, callback);
      }

      if (opts.PlatformID.length > 10) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "PlatformID", 10);
        return sendErrorResponse(errorMsg, callback);
      }
    }

    if (opts.hasOwnProperty("UpdatePlatformChargeFee")) {
      if (typeof opts.UpdatePlatformChargeFee !== "string") {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "UpdatePlatformChargeFee", "string");
        return sendErrorResponse(errorMsg, callback);
      }

      if (opts.UpdatePlatformChargeFee.length > 1) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "UpdatePlatformChargeFee", 1);
        return sendErrorResponse(errorMsg, callback);
      }
    }

    if (opts.UpdatePlatformChargeFee === "Y") {
      if (!opts.hasOwnProperty("PlatformChargeFee")) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.requiredParameter, "PlatformChargeFee");
        return sendErrorResponse(errorMsg, callback);
      }

      if (!Number.isInteger(opts.PlatformChargeFee)) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "PlatformChargeFee", "number");
        return sendErrorResponse(errorMsg, callback);
      }
    }

    if (opts.hasOwnProperty("Remark")) {
      if (typeof opts.Remark !== "string") {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "Remark", "string");
        return sendErrorResponse(errorMsg, callback);
      }

      if (opts.Remark.length > 30) {
        let errorMsg = genErrorMessage(ERROR_MESSAGE.lengthLimitation, "Remark", 30);
        return sendErrorResponse(errorMsg, callback);
      }
    }

    // 廠商編號
    data.MerchantID = CONFIG.merchantID;

    // 廠商交易編號
    data.MerchantTradeNo = opts.MerchantTradeNo;

    // 廠商申請撥款金額
    data.CaptureAMT = opts.CaptureAMT;

    // 要退款給買方的金額
    data.UserRefundAMT = opts.UserRefundAMT;


    if (data.UserRefundAMT !== 0) {
      // 購買人姓名
      data.UserName = opts.UserName;

      // 買方手機號碼
      data.UserCellPhone = opts.UserCellPhone;
    }

    // 特約合作平台商代號
    if (opts.hasOwnProperty("PlatformID")) {
      data.PlatformID = opts.PlatformID;
    }

    // 是否更改特約合作平台商手續費
    if (opts.hasOwnProperty("UpdatePlatformChargeFee")) {
      data.UpdatePlatformChargeFee = opts.UpdatePlatformChargeFee;

      if (data.UpdatePlatformChargeFee === "Y") {
        // 特約合作平台商手續費
        data.PlatformChargeFee = opts.PlatformChargeFee;
      }
    }

    // 備註
    if (opts.hasOwnProperty("Remark")) {
      data.Remark = opts.Remark;
    }

    // 檢查碼
    data.CheckMacValue = opts.hasOwnProperty("CheckMacValue") ? opts.CheckMacValue : this.genCheckMacValue(data);

    sendRequest("POST", ENDPOINT.capture, data, callback);
  }

  /**
   * 產生交易檢查碼
   *
   * @param {Object} data - 交易資料
   * @param {string} encryptType - 加密類型
   */
  genCheckMacValue(data, encryptType = "md5") {
    if (["md5", "sha256"].indexOf(encryptType.toLowerCase()) === -1) {
      let errorMsg = genErrorMessage(ERROR_MESSAGE.invalidParameter, "encryptType", "'md5' or 'sha256'");
      return sendErrorResponse(errorMsg);
    }

    // 若有 CheckMacValue 則先移除
    if (data.hasOwnProperty("CheckMacValue")) {
      delete data.CheckMacValue;
    }

    let hashKey = data.hashKey || CONFIG.hashKey;
    let hashIV = data.hashIV || CONFIG.hashIV;

    if (data.hasOwnProperty("hashKey")) {
      delete data.hashKey;
    }

    if (data.hasOwnProperty("hashIV")) {
      delete data.hashIV;
    }

    // 使用物件 key 排序資料
    let keys = Object.keys(data).sort((s1, s2) => {
      let s1lower = s1.toLowerCase();
      let s2lower = s2.toLowerCase();

      return s1lower > s2lower ? 1 : (s1lower < s2lower ? -1 : 0);
    });
    let uri = keys.map(key => {
      return `${key}=${data[key]}`
    }).join("&");

    uri = `HashKey=${hashKey}&${uri}&HashIV=${hashIV}`;

    log("==================================================");
    log("The data below will be used to generate CheckMacValue");
    log("==================================================");
    log(uri);

    uri = urlEncode(uri);
    uri = uri.toLowerCase();

    let checksum = crypto.createHash(encryptType).update(uri).digest("hex").toUpperCase();

    log("==================================================");
    log("Generated CheckMacValue");
    log("==================================================");
    log(checksum);

    return checksum;
  }

  /**
   * 驗證資料正確性
   *
   * @param {Object} data - 待驗證資料
   * @param {string} encryptType - 加密類型
   */
  isDataValid(data, encryptType = "md5") {
    log("==================================================");
    log("Start to validate the following data");
    log("==================================================");
    log(data);

    let receivedCheckMacValue = data.CheckMacValue;
    let generatedCheckMacValue = this.genCheckMacValue(data, encryptType);
    let isMatched = receivedCheckMacValue === generatedCheckMacValue;

    log(`Validation Result: ${isMatched ? "Match" : "Not match"}`)

    return isMatched;
  }
}

/**
 * 將資料編碼成與 .Net UrlEncode 相符的格式
 *
 * @param {string} data - 待編碼資料
 * @private
 */
function urlEncode(data) {
  log("==================================================");
  log("Data before urlEncode");
  log("==================================================");
  log(data);

  if (data === "") {
    return data;
  }

  let find = ["~", "%20", "'"];
  let replace = ["%7E", "+", "%27"];
  let encodedData = encodeURIComponent(data);

  find.forEach((encodedChar, index) => {
    let regex = new RegExp(encodedChar, "g");
    encodedData = encodedData.replace(regex, replace[index]);
  });

  log("==================================================");
  log("Data after urlEncode");
  log("==================================================");
  log(encodedData);

  return encodedData;
}

/**
 * 發送 HTTP/HTTPS 請求
 *
 * @param {string} method - HTTP 方法
 * @param {string} path - 請求路徑
 * @param {object} data - 資料
 * @param {requestCallback} callback - 處理回應的 callback
 * @private
 */
function sendRequest(method, path, data, callback) {
  if (!CONFIG.isInitialized) {
    throw ERROR_MESSAGE.initializeRequired;
  }

  log("==================================================");
  log("The data below will be sent");
  log("==================================================");
  log(data);

  let dataString = querystring.stringify(data);

  let headers = {
    "Content-Type": "application/x-www-form-urlencoded"
  };

  // 使用 POST 時設定 Content-Length 標頭
  if (method === "POST") {
    headers["Content-Length"] = dataString.length;
  } else {
    path = `${path}?${dataString}`;
  }

  let options = {
    host: CONFIG.host,
    port: CONFIG.port,
    path: path,
    method: method,
    headers: headers
  };

  let request;
  if (!CONFIG.useSSL) {
    request = http.request(options);
  } else {
    request = https.request(options);
  }

  log("==================================================");
  log("HTTP/HTTPS request options");
  log("==================================================");
  log(options);

  if (method === "POST") {
    log("==================================================");
    log("Send request");
    log("==================================================");
    log(dataString);
    request.write(dataString);
  }

  request.end();

  let buffer = "";
  request.on("response", (response) => {
    response.setEncoding("utf8");

    response.on("data", (chunk) => {
      buffer += chunk;
    });

    response.on("end", () => {
      let responseData;

      log("==================================================");
      log("Response data");
      log("==================================================");
      log(buffer);

      if (callback) {
        let err = undefined;

        // 另外處理非 JSON 物件的返回值
        if (NON_JSON_RESPONSE_ENDPOINT.indexOf(path) > -1) {
          if (response.statusCode === 200) {
            if (path === ENDPOINT.aioChargeback) {
              let [status, message] = buffer.split("|");
              responseData = {
                status: status,
                message: message
              };
            } else {
              responseData = {};
              let responseArr = buffer.split("&");
              responseArr.forEach((param) => {
                let [key, value] = param.split("=");
                responseData[key] = value;
              });
            }
          } else {
            err = response.statusCode;
          }
        } else {
          try {
            responseData = JSON.parse(buffer);
          } catch (error) {
            log("==================================================");
            log("Could not convert API response to JSON, the error below is ignored and raw API response is returned to client");
            log("==================================================");
            log(error);
            err = error;
          }
        }

        callback(err, responseData);
      }
    });

    response.on("close", (err) => {
      log("==================================================");
      log("Problem with API request detailed stacktrace below");
      log("==================================================");
      log(err);
      sendErrorResponse(err, callback);
    });
  });

  request.on("error", (err) => {
    log("==================================================");
    log("Problem with API request detailed stacktrace below");
    log("==================================================");
    log(err);
    sendErrorResponse(err, callback);
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
function sendErrorResponse(err, callback = undefined, returnData = undefined) {
  let error;
  if (err instanceof Error) {
    error = err;
  } else {
    error = new Error(err);
  }

  if (callback) {
    callback(error, returnData);
  } else {
    throw error;
  }
}

/**
 * 訊息紀錄
 *
 * @param {Object} message - 訊息物件
 * @private
 */
function log(message) {
  if (message instanceof Error) {
    console.log(message.stack);
  }

  if (CONFIG.debug) {
    if (typeof message === "object") {
      console.log(JSON.stringify(message, null, 2));
    } else {
      console.log(message);
    }
  }
}

/**
 * 格式化錯誤訊息
 *
 * @param {string} template - 格式化字串
 * @param {string[]} values - 欲帶入格式化字串的資料
 * @private
 */
function genErrorMessage(template, ...values) {
  return util.format(template, ...values)
}

module.exports = Allpay;

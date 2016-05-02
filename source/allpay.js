// dependencies
import util from "util";
import crypto from "crypto";
import http from "http";
import https from "https";
import querystring from "querystring";
import moment from "moment";

/**
 * API 查詢端點
 *
 * @constant {object}
 */
const _ENDPOINTS = {
  // 訂單產生
  aioCheckOut : "/Cashier/AioCheckOut/V2",
  // 訂單查詢
  queryTradeInfo: "/Cashier/QueryTradeInfo/V2",
  // 信用卡定期定額訂單查詢
  queryCreditCardPeriodInfo: "/Cashier/QueryCreditCardPeriodInfo",
  // 信用卡關帳/退刷/取消/放棄
  doAction: "/CreditDetail/DoAction",
  // 廠商通知退款
  aioChargeback: "/Cashier/AioChargeback",
  // 廠商申請撥款/退款
  capture: "/Cashier/Capture",
};

/**
 * 回傳值非 JSON 物件之 API 查詢端點
 *
 * @constant {string[]}
 */
const _NON_JSON_RESPONSE_ENDPOINTS = [
  _ENDPOINTS.aioCheckOut,
  _ENDPOINTS.queryTradeInfo,
  _ENDPOINTS.doAction,
  _ENDPOINTS.aioChargeback,
  _ENDPOINTS.capture
];

/**
 * API 錯誤訊息
 *
 * @constant {object}
 */
const _ERROR_MESSAGES = {
 initializeRequired: "Allpay has not been initialized.",
 wrongParameter: "Wrong parameter.",
 requiredParameter: "%s is required.",
 lengthLimitation: "The maximum length for %s is %d.",
 fixedLengthLimitation: "The length for %s is %d.",
 removeParameter: "Please remove %s.",
 invalidParameter: "%s is invalid.",
 notSupported: "This feature is not supported in test mode",
};

/**
 * 主機
 *
 * @constant {object}
 */
const _HOSTS = {
  production: "payment.allpay.com.tw",
  test: "payment-stage.allpay.com.tw",
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
let _config = {
  merchantID: "",
  hashKey: "",
  hashIV: "",
  mode: "test",
  debug: false,
  host: "",
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
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.requiredParameter, "merchantID");
      return sendErrorResponse(errorMsg);
    }
    if (merchantID.length > 10) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "merchantID", 10);
      return sendErrorResponse(errorMsg);
    }

    if (typeof hashKey === "undefined") {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.requiredParameter, "hashKey");
      return sendErrorResponse(errorMsg);
    }

    if (typeof hashIV === "undefined") {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.requiredParameter, "hashIV");
      return sendErrorResponse(errorMsg);
    }

    if (!(this instanceof Allpay)) {
      return new Allpay(opts);
    }

    this.version = require("../package.json").version;
    _config.merchantID = merchantID;
    _config.hashKey = hashKey;
    _config.hashIV = hashIV;
    _config.mode = mode === "production" ? "production" : "test";
    _config.debug = debug || false;
    _config.host = mode === "production" ? _HOSTS.production : _HOSTS.test;
    _config.isInitialized = true;

    log("==================================================");
    log("Allpay SDK config")
    log("==================================================");
    log(_config);
  }

  /**
   * 設定連線參數
   *
   * @param {string} host - 選填. 主機位址
   * @param {string} port - 選填. 通訊埠
   * @param {boolean} useSSL - 選填. 是否使用 SSL 連線
   */
  setHost({ host, port, useSSL } = {}) {
    _config.host = host || _config.host;
    _config.port = port || _config.port;
    _config.useSSL = useSSL !== false;

    log("==================================================");
    log("Current host data")
    log("==================================================");
    log(`Host: ${_config.host}\nPort: ${_config.port}\nUse SSL: ${_config.useSSL}`);
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
      return sendErrorResponse(new Error(_ERROR_MESSAGES.wrongParameter), callback);
    }

    if (!opts.hasOwnProperty("MerchantTradeNo")) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.requiredParameter, "MerchantTradeNo");
      return sendErrorResponse(errorMsg, callback);
    }
    if (opts.MerchantTradeNo.length > 20) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "MerchantTradeNo", 20);
      return sendErrorResponse(errorMsg, callback);
    }

    if (opts.hasOwnProperty("MerchantTradeDate") && opts.MerchantTradeDate.length > 20) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "MerchantTradeDate", 20);
      return sendErrorResponse(errorMsg, callback);
    }

    // NOTE: 目前預設自動帶入 aio
    // if (!opts.hasOwnProperty("PaymentType")) {
    //   let errorMsg = genErrorMessage(_ERROR_MESSAGES.requiredParameter, "PaymentType");
    //   return sendErrorResponse(errorMsg, callback);
    // }
    // if (opts.PaymentType.length > 20) {
    //   let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "PaymentType", 20);
    //   return sendErrorResponse(errorMsg, callback);
    // }

    if (!opts.hasOwnProperty("TotalAmount")) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.requiredParameter, "TotalAmount");
      return sendErrorResponse(errorMsg, callback);
    }

    if (!opts.hasOwnProperty("TradeDesc")) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.requiredParameter, "TradeDesc");
      return sendErrorResponse(errorMsg, callback);
    }
    if (opts.TradeDesc.length > 200) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "TradeDesc", 200);
      return sendErrorResponse(errorMsg, callback);
    }

    if (!opts.hasOwnProperty("Items") || opts.Items.length === 0) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.requiredParameter, "Items");
      return sendErrorResponse(errorMsg, callback);
    }

    if (!opts.hasOwnProperty("ReturnURL")) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.requiredParameter, "ReturnURL");
      return sendErrorResponse(errorMsg, callback);
    }
    if (opts.ReturnURL.length > 200) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "ReturnURL", 200);
      return sendErrorResponse(errorMsg, callback);
    }

    if (!opts.hasOwnProperty("ChoosePayment")) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.requiredParameter, "ChoosePayment");
      return sendErrorResponse(errorMsg, callback);
    }
    if (opts.ChoosePayment.length > 20) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "ChoosePayment", 20);
      return sendErrorResponse(errorMsg, callback);
    }

    if (opts.hasOwnProperty("ClientBackURL") && opts.ClientBackURL.length > 200) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "ClientBackURL", 200);
      return sendErrorResponse(errorMsg, callback);
    }

    if (opts.hasOwnProperty("ItemURL") && opts.ItemURL.length > 200) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "ItemURL", 200);
      return sendErrorResponse(errorMsg, callback);
    }

    if (opts.hasOwnProperty("Remark") && opts.Remark.length > 100) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "Remark", 100);
      return sendErrorResponse(errorMsg, callback);
    }

    if (opts.hasOwnProperty("ChooseSubPayment") && opts.ChooseSubPayment.length > 20) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "ChooseSubPayment", 20);
      return sendErrorResponse(errorMsg, callback);
    }

    if (opts.hasOwnProperty("OrderResultURL") && opts.OrderResultURL.length > 200) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "OrderResultURL", 200);
      return sendErrorResponse(errorMsg, callback);
    }

    if (opts.hasOwnProperty("NeedExtraPaidInfo") && opts.NeedExtraPaidInfo.length > 1) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "NeedExtraPaidInfo", 1);
      return sendErrorResponse(errorMsg, callback);
    }

    if (opts.hasOwnProperty("DeviceSource") && opts.DeviceSource.length > 10) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "DeviceSource", 10);
      return sendErrorResponse(errorMsg, callback);
    }

    if (opts.hasOwnProperty("IgnorePayment") && opts.IgnorePayment.length > 100) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "IgnorePayment", 100);
      return sendErrorResponse(errorMsg, callback);
    }

    if (opts.hasOwnProperty("PlatformID") && opts.PlatformID.length > 10) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "PlatformID", 10);
      return sendErrorResponse(errorMsg, callback);
    }

    if (opts.hasOwnProperty("InvoiceMark") && opts.InvoiceMark.length > 1) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "InvoiceMark", 1);
      return sendErrorResponse(errorMsg, callback);
    }

    if (opts.hasOwnProperty("EncryptType") && opts.EncryptType.length > 1) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "EncryptType", 1);
      return sendErrorResponse(errorMsg, callback);
    }

    if (opts.hasOwnProperty("UseRedeem") && opts.UseRedeem.length > 1) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "UseRedeem", 1);
      return sendErrorResponse(errorMsg, callback);
    }

    if (opts.hasOwnProperty("ExpireDate") && (opts.ExpireDate < 1 || opts.ExpireDate > 60)) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.invalidParameter, "ExpireDate");
      return sendErrorResponse(errorMsg, callback);
    }

    if (["ATM", "CVS", "BARCODE"].indexOf(opts.ChoosePayment) > -1) {
      if (opts.hasOwnProperty("PaymentInfoURL") && opts.PaymentInfoURL.length > 200) {
        let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "PaymentInfoURL", 200);
        return sendErrorResponse(errorMsg, callback);
      }

      if (opts.hasOwnProperty("ClientRedirectURL") && opts.ClientRedirectURL.length > 200) {
        let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "ClientRedirectURL", 200);
        return sendErrorResponse(errorMsg, callback);
      }
    }

    if (opts.hasOwnProperty("Desc_1") && opts.Desc_1.length > 20) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "Desc_1", 20);
      return sendErrorResponse(errorMsg, callback);
    }

    if (opts.hasOwnProperty("Desc_2") && opts.Desc_2.length > 20) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "Desc_2", 20);
      return sendErrorResponse(errorMsg, callback);
    }

    if (opts.hasOwnProperty("Desc_3") && opts.Desc_3.length > 20) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "Desc_3", 20);
      return sendErrorResponse(errorMsg, callback);
    }

    if (opts.hasOwnProperty("Desc_4") && opts.Desc_4.length > 20) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "Desc_4", 20);
      return sendErrorResponse(errorMsg, callback);
    }

    if (opts.ChoosePayment === "Alipay") {
      if (opts.hasOwnProperty("AlipayItemName") && opts.AlipayItemName.length > 200) {
        let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "AlipayItemName", 200);
        return sendErrorResponse(errorMsg, callback);
      }

      if (opts.hasOwnProperty("AlipayItemCounts") && opts.AlipayItemCounts.length > 100) {
        let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "AlipayItemCounts", 100);
        return sendErrorResponse(errorMsg, callback);
      }

      if (opts.hasOwnProperty("AlipayItemPrice") && opts.AlipayItemPrice.length > 20) {
        let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "AlipayItemPrice", 20);
        return sendErrorResponse(errorMsg, callback);
      }

      if (opts.hasOwnProperty("Email") && opts.Email.length > 200) {
        let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "Email", 200);
        return sendErrorResponse(errorMsg, callback);
      }

      if (opts.hasOwnProperty("PhoneNo") && opts.PhoneNo.length > 20) {
        let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "PhoneNo", 20);
        return sendErrorResponse(errorMsg, callback);
      }

      if (opts.hasOwnProperty("UserName") && opts.UserName.length > 20) {
        let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "UserName", 20);
        return sendErrorResponse(errorMsg, callback);
      }
    }

    if (opts.ChoosePayment === "Tenpay") {
      if (opts.hasOwnProperty("ExpireTime") && opts.ExpireTime.length > 20) {
        let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "ExpireTime", 20);
        return sendErrorResponse(errorMsg, callback);
      }
    }

    if (opts.ChoosePayment === "Credit") {
      if (opts.hasOwnProperty("Redeem") && opts.Redeem.length > 1) {
        let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "Redeem", 1);
        return sendErrorResponse(errorMsg, callback);
      }

      if (opts.hasOwnProperty("Language") && opts.Language.length > 3) {
        let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "Language", 3);
        return sendErrorResponse(errorMsg, callback);
      }

      if (opts.hasOwnProperty("PeriodType") && opts.PeriodType.length > 1) {
        let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "PeriodType", 1);
        return sendErrorResponse(errorMsg, callback);
      }

      if (opts.hasOwnProperty("PeriodReturnURL") && opts.PeriodReturnURL.length > 200) {
        let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "PeriodReturnURL", 200);
        return sendErrorResponse(errorMsg, callback);
      }
    }

    if (opts.InvoiceMark === "Y") {
      if (!opts.hasOwnProperty("RelateNumber")) {
        let errorMsg = genErrorMessage(_ERROR_MESSAGES.requiredParameter, "RelateNumber");
        return sendErrorResponse(errorMsg, callback);
      }
      if (opts.RelateNumber.length > 30) {
        let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "RelateNumber", 30);
        return sendErrorResponse(errorMsg, callback);
      }

      if (opts.hasOwnProperty("CarruerType") && opts.CarruerType.length > 1) {
        let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "CarruerType", 1);
        return sendErrorResponse(errorMsg, callback);
      }

      if (opts.hasOwnProperty("CustomerID") && opts.CustomerID.length > 20) {
        let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "CustomerID", 20);
        return sendErrorResponse(errorMsg, callback);
      }
      if (opts.CarruerType === "1") {
        if (!opts.hasOwnProperty("CustomerID") || !opts.CustomerID) {
          let errorMsg = genErrorMessage(_ERROR_MESSAGES.requiredParameter, "CustomerID");
          return sendErrorResponse(errorMsg, callback);
        }
      }

      if (opts.hasOwnProperty("CustomerIdentifier") && opts.CustomerIdentifier.length !== 8) {
        let errorMsg = genErrorMessage(_ERROR_MESSAGES.fixedLengthLimitation, "CustomerIdentifier", 8);
        return sendErrorResponse(errorMsg, callback);
      }

      if (opts.hasOwnProperty("Donation") && opts.Donation.length > 1) {
        let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "Donation", 1);
        return sendErrorResponse(errorMsg, callback);
      }

      if (opts.hasOwnProperty("Print") && opts.Print.length > 1) {
        let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "Print", 1);
        return sendErrorResponse(errorMsg, callback);
      }
      if (opts.Donation === "1" && opts.hasOwnProperty("Print") && opts.Print === "1") {
        let errorMsg = genErrorMessage(_ERROR_MESSAGES.invalidParameter, "CustomerID");
        return sendErrorResponse(errorMsg, callback);
      }
      if (opts.hasOwnProperty("CustomerIdentifier") && opts.CustomerIdentifier !== "") {
        if (!opts.hasOwnProperty("Print") || opts.Print === "0") {
          let errorMsg = genErrorMessage(_ERROR_MESSAGES.invalidParameter, "CustomerID");
          return sendErrorResponse(errorMsg, callback);
        }
      }

      if (opts.hasOwnProperty("CustomerName") && opts.CustomerName.length > 20) {
        let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "CustomerName", 20);
        return sendErrorResponse(errorMsg, callback);
      }

      if (opts.hasOwnProperty("CustomerAddr") && opts.CustomerAddr.length > 200) {
        let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "CustomerAddr", 200);
        return sendErrorResponse(errorMsg, callback);
      }

      if (opts.Print === "1") {
        if (!opts.hasOwnProperty("CustomerName") || !opts.CustomerName) {
          let errorMsg = genErrorMessage(_ERROR_MESSAGES.requiredParameter, "CustomerName");
          return sendErrorResponse(errorMsg, callback);
        }

        if (!opts.hasOwnProperty("CustomerAddr") || !opts.CustomerAddr) {
          let errorMsg = genErrorMessage(_ERROR_MESSAGES.requiredParameter, "CustomerAddr");
          return sendErrorResponse(errorMsg, callback);
        }
      }

      if (opts.hasOwnProperty("CustomerPhone") && opts.CustomerPhone.length > 20) {
        let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "CustomerPhone", 20);
        return sendErrorResponse(errorMsg, callback);
      }

      if (opts.hasOwnProperty("CustomerEmail") && opts.CustomerEmail.length > 200) {
        let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "CustomerEmail", 200);
        return sendErrorResponse(errorMsg, callback);
      }

      if (!opts.CustomerPhone && !opts.CustomerEmail) {
        let errorMsg = genErrorMessage(_ERROR_MESSAGES.requiredParameter, "CustomerPhone or CustomerEmail");
        return sendErrorResponse(errorMsg, callback);
      }

      if (!opts.hasOwnProperty("TaxType")) {
        let errorMsg = genErrorMessage(_ERROR_MESSAGES.requiredParameter, "TaxType");
        return sendErrorResponse(errorMsg, callback);
      }
      if (opts.TaxType.length > 1) {
        let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "TaxType", 1);
        return sendErrorResponse(errorMsg, callback);
      }

      if (opts.hasOwnProperty("ClearanceMark") && opts.ClearanceMark.length > 1) {
        let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "ClearanceMark", 1);
        return sendErrorResponse(errorMsg, callback);
      }

      if (opts.TaxType === "2") {
        if (!opts.hasOwnProperty("ClearanceMark") || !opts.ClearanceMark) {
          let errorMsg = genErrorMessage(_ERROR_MESSAGES.requiredParameter, "ClearanceMark");
          return sendErrorResponse(errorMsg, callback);
        }
      }

      if (opts.hasOwnProperty("CarruerNum") && opts.CarruerNum.length > 64) {
        let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "CarruerNum", 64);
        return sendErrorResponse(errorMsg, callback);
      }

      switch (opts.CarruerType) {
        case "":
        case undefined:
        case "1":
          if (opts.hasOwnProperty("CarruerNum") && opts.CarruerNum !== "") {
            let errorMsg = genErrorMessage(_ERROR_MESSAGES.removeParameter, "CarruerNum");
            return sendErrorResponse(errorMsg, callback);
          }
          break;
        case "2":
          if (!opts.CarruerNum.match(/^[a-zA-Z]{2}\d{14}$/)) {
            let errorMsg = genErrorMessage(_ERROR_MESSAGES.invalidParameter, "CarruerNum");
            return sendErrorResponse(errorMsg, callback);
          }
          break;
        case "3":
          if (!opts.CarruerNum.match(/^\/{1}[0-9a-zA-Z+-.]{7}$/)) {
            let errorMsg = genErrorMessage(_ERROR_MESSAGES.invalidParameter, "CarruerNum");
            return sendErrorResponse(errorMsg, callback);
          }
          break;
        default:
          let errorMsg = genErrorMessage(_ERROR_MESSAGES.removeParameter, "CarruerNum");
          return sendErrorResponse(errorMsg, callback);
      }

      if (opts.CustomerIdentifier !== "" && opts.Donation === "1") {
        let errorMsg = genErrorMessage(_ERROR_MESSAGES.invalidParameter, "CarruerNum");
        return sendErrorResponse(errorMsg, callback);
      }

      if (opts.Donation === "1") {
        if (!opts.hasOwnProperty("LoveCode") || !opts.LoveCode) {
          let errorMsg = genErrorMessage(_ERROR_MESSAGES.requiredParameter, "LoveCode");
          return sendErrorResponse(errorMsg, callback);
        }
        if (!opts.LoveCode.match(/^([xX]{1}[0-9]{2,6}|[0-9]{3,7})$/)) {
          let errorMsg = genErrorMessage(_ERROR_MESSAGES.invalidParameter, "LoveCode");
          return sendErrorResponse(errorMsg, callback);
        }
      }

      if (!opts.hasOwnProperty("InvoiceItems") || opts.InvoiceItems.length === 0) {
        let errorMsg = genErrorMessage(_ERROR_MESSAGES.requiredParameter, "InvoiceItems");
        return sendErrorResponse(errorMsg, callback);
      }

      if (opts.hasOwnProperty("DelayDay") && (opts.DelayDay < 0 || opts.DelayDay > 15)) {
        let errorMsg = genErrorMessage(_ERROR_MESSAGES.invalidParameter, "DelayDay");
        return sendErrorResponse(errorMsg, callback);
      }

      if (!opts.hasOwnProperty("InvType")) {
        let errorMsg = genErrorMessage(_ERROR_MESSAGES.requiredParameter, "InvType");
        return sendErrorResponse(errorMsg, callback);
      }
      if (opts.InvType.length > 2) {
        let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "InvType", 2);
        return sendErrorResponse(errorMsg, callback);
      }
    }

    // 廠商編號
    data.MerchantID = _config.merchantID;

    // 廠商交易編號
    data.MerchantTradeNo = opts.MerchantTradeNo;

    // 廠商交易時間
    data.MerchantTradeDate = opts.MerchantTradeDate || moment().format('YYYY/MM/DD HH:mm:ss');

    // 交易類型
    data.PaymentType = "aio";

    // 交易金額
    data.TotalAmount = opts.TotalAmount;

    // 交易描述
    data.TradeDesc = opts.TradeDesc;

    // 商品名稱
    let items = [];
    opts.Items.forEach((item) => {
      items.push(`${item.name} ${item.price} 元 x${item.quantity}`);
    });
    data.ItemName = items.join("#");

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
    data.NeedExtraPaidInfo = opts.NeedExtraPaidInfo || "N";

    // 裝置來源
    data.DeviceSource = opts.DeviceSource || "P";

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
      data.AlipayItemName = opts.AlipayItemName;

      // 商品購買數量
      data.AlipayItemCounts = opts.AlipayItemCounts;

      // 商品單價
      data.AlipayItemPrice = opts.AlipayItemPrice;

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
      data.CustomerName = opts.CustomerName || "";

      // 客戶地址
      data.CustomerAddr = opts.CustomerAddr || "";

      // 客戶手機號碼
      if (opts.hasOwnProperty("CustomerPhone")) {
        data.CustomerPhone = opts.CustomerPhone || "";
      }

      // 客戶電子信箱
      if (opts.hasOwnProperty("CustomerEmail")) {
        data.CustomerEmail = opts.CustomerEmail || "";
      }

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
        itemNames.push(item.name);
        itemCounts.push(item.count);
        itemWords.push(item.word);
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
      data.InvoiceRemark = opts.InvoiceRemark || "";

      // 延遲天數
      data.DelayDay = opts.DelayDay || 0;

      // 字軌類別
      data.InvType = opts.InvType;
    }

    // 檢查碼
    data.CheckMacValue = opts.hasOwnProperty("CheckMacValue") ? opts.CheckMacValue : this.genCheckMacValue(data, data.EncryptType === 1 ? "sha256" : "md5" );

    // 產生表單資料
    let url = `${_config.useSSL ? "https" : "http"}://${_config.host}${_ENDPOINTS.aioCheckOut}`;
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
      return sendErrorResponse(new Error(_ERROR_MESSAGES.wrongParameter), callback);
    }

    if (!opts.hasOwnProperty("MerchantTradeNo")) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.requiredParameter, "MerchantTradeNo");
      return sendErrorResponse(errorMsg, callback);
    }
    if (opts.MerchantTradeNo.length > 20) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "MerchantTradeNo", 20);
      return sendErrorResponse(errorMsg, callback);
    }

    if (opts.hasOwnProperty("PlatformID") && opts.PlatformID.length > 10) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "PlatformID", 10);
      return sendErrorResponse(errorMsg, callback);
    }

    // 廠商編號
    data.MerchantID = _config.merchantID;

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

    sendRequest("POST", _ENDPOINTS.queryTradeInfo, data, callback);
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
      return sendErrorResponse(new Error(_ERROR_MESSAGES.wrongParameter), callback);
    }

    if (!opts.hasOwnProperty("MerchantTradeNo")) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.requiredParameter, "MerchantTradeNo");
      return sendErrorResponse(errorMsg, callback);
    }
    if (opts.MerchantTradeNo.length > 20) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "MerchantTradeNo", 20);
      return sendErrorResponse(errorMsg, callback);
    }

    // 廠商編號
    data.MerchantID = _config.merchantID;

    // 廠商交易編號
    data.MerchantTradeNo = opts.MerchantTradeNo;

    // 驗證時間
    data.TimeStamp = Date.now();

    // 檢查碼
    data.CheckMacValue = opts.hasOwnProperty("CheckMacValue") ? opts.CheckMacValue : this.genCheckMacValue(data);

    sendRequest("POST", _ENDPOINTS.queryCreditCardPeriodInfo, data, callback);
  }

  /**
   * 信用卡關帳/退刷/取消/放棄
   *
   * @param {object} opts - 信用卡關帳/退刷/取消/放棄相關參數，請參考「全方位金流API介接技術文件」
   * @param {requestCallback} callback - 處理回應的 callback
   */
  doAction(opts, callback = undefined) {
    if (_config.mode === "test") {
      return sendErrorResponse(new Error(_ERROR_MESSAGES.notSupported), callback);
    }

    let data = {};

    // 參數檢查
    if (typeof opts !== "object") {
      return sendErrorResponse(new Error(_ERROR_MESSAGES.wrongParameter), callback);
    }

    if (!opts.hasOwnProperty("MerchantTradeNo")) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.requiredParameter, "MerchantTradeNo");
      return sendErrorResponse(errorMsg, callback);
    }
    if (opts.MerchantTradeNo.length > 20) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "MerchantTradeNo", 20);
      return sendErrorResponse(errorMsg, callback);
    }

    if (!opts.hasOwnProperty("TradeNo")) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.requiredParameter, "TradeNo");
      return sendErrorResponse(errorMsg, callback);
    }
    if (opts.TradeNo.length > 20) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "TradeNo", 20);
      return sendErrorResponse(errorMsg, callback);
    }

    if (!opts.hasOwnProperty("Action")) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.requiredParameter, "Action");
      return sendErrorResponse(errorMsg, callback);
    }
    if (opts.Action.length > 1) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "Action", 1);
      return sendErrorResponse(errorMsg, callback);
    }

    if (!opts.hasOwnProperty("TotalAmount")) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.requiredParameter, "TotalAmount");
      return sendErrorResponse(errorMsg, callback);
    }

    if (opts.hasOwnProperty("PlatformID") && opts.PlatformID.length > 10) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "PlatformID", 10);
      return sendErrorResponse(errorMsg, callback);
    }

    // 廠商編號
    data.MerchantID = _config.merchantID;

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

    sendRequest("POST", _ENDPOINTS.doAction, data, callback);
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
      return sendErrorResponse(new Error(_ERROR_MESSAGES.wrongParameter), callback);
    }

    if (!opts.hasOwnProperty("MerchantTradeNo")) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.requiredParameter, "MerchantTradeNo");
      return sendErrorResponse(errorMsg, callback);
    }
    if (opts.MerchantTradeNo.length > 20) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "MerchantTradeNo", 20);
      return sendErrorResponse(errorMsg, callback);
    }

    if (!opts.hasOwnProperty("TradeNo")) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.requiredParameter, "TradeNo");
      return sendErrorResponse(errorMsg, callback);
    }
    if (opts.TradeNo.length > 20) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "TradeNo", 20);
      return sendErrorResponse(errorMsg, callback);
    }

    if (!opts.hasOwnProperty("ChargeBackTotalAmount")) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.requiredParameter, "ChargeBackTotalAmount");
      return sendErrorResponse(errorMsg, callback);
    }

    if (opts.hasOwnProperty("Remark") && opts.Remark.length > 100) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "Remark", 100);
      return sendErrorResponse(errorMsg, callback);
    }

    if (opts.hasOwnProperty("PlatformID") && opts.PlatformID.length > 10) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "PlatformID", 10);
      return sendErrorResponse(errorMsg, callback);
    }

    // 廠商編號
    data.MerchantID = _config.merchantID;

    // 廠商交易編號
    data.MerchantTradeNo = opts.MerchantTradeNo;

    // AllPay 的交易編號
    data.TradeNo = opts.TradeNo;

    // 退款金額
    data.ChargeBackTotalAmount = opts.ChargeBackTotalAmount;

    // 備註欄位
    // if (opts.hasOwnProperty("Remark")) {
    //   data.Remark = opts.Remark;
    // }

    // 特約合作平台商代號
    if (opts.hasOwnProperty("PlatformID")) {
      data.PlatformID = opts.PlatformID;
    }

    // 檢查碼
    data.CheckMacValue = opts.hasOwnProperty("CheckMacValue") ? opts.CheckMacValue : this.genCheckMacValue(data);

    sendRequest("POST", _ENDPOINTS.aioChargeback, data, callback);
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
      return sendErrorResponse(new Error(_ERROR_MESSAGES.wrongParameter), callback);
    }

    if (!opts.hasOwnProperty("MerchantTradeNo")) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.requiredParameter, "MerchantTradeNo");
      return sendErrorResponse(errorMsg, callback);
    }
    if (opts.MerchantTradeNo.length > 20) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "MerchantTradeNo", 20);
      return sendErrorResponse(errorMsg, callback);
    }

    if (!opts.hasOwnProperty("CaptureAMT")) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.requiredParameter, "CaptureAMT");
      return sendErrorResponse(errorMsg, callback);
    }

    if (!opts.hasOwnProperty("UserRefundAMT")) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.requiredParameter, "UserRefundAMT");
      return sendErrorResponse(errorMsg, callback);
    }

    if (opts.hasOwnProperty("UserName") && opts.UserName.length > 20) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "UserName", 20);
      return sendErrorResponse(errorMsg, callback);
    }

    if (opts.hasOwnProperty("UserCellPhone") && opts.UserCellPhone.length > 20) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "UserCellPhone", 20);
      return sendErrorResponse(errorMsg, callback);
    }

    if (opts.hasOwnProperty("PlatformID") && opts.PlatformID.length > 10) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "PlatformID", 10);
      return sendErrorResponse(errorMsg, callback);
    }

    if (opts.hasOwnProperty("UpdatePlatformChargeFee") && opts.UpdatePlatformChargeFee.length > 1) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "UpdatePlatformChargeFee", 1);
      return sendErrorResponse(errorMsg, callback);
    }

    if (opts.hasOwnProperty("Remark") && opts.Remark.length > 30) {
      let errorMsg = genErrorMessage(_ERROR_MESSAGES.lengthLimitation, "Remark", 30);
      return sendErrorResponse(errorMsg, callback);
    }

    // 廠商編號
    data.MerchantID = _config.merchantID;

    // 廠商交易編號
    data.MerchantTradeNo = opts.MerchantTradeNo;

    // 廠商申請撥款金額
    data.CaptureAMT = opts.CaptureAMT;

    // 要退款給買方的金額
    data.UserRefundAMT = opts.UserRefundAMT;

    // 購買人姓名
    if (opts.hasOwnProperty("UserName")) {
      data.UserName = opts.UserName;
    }
    // 買方手機號碼
    if (opts.hasOwnProperty("UserCellPhone")) {
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
        if (opts.hasOwnProperty("PlatformChargeFee")) {
          data.PlatformChargeFee = opts.PlatformChargeFee;
        }
      }
    }

    // 備註
    if (opts.hasOwnProperty("Remark")) {
      data.Remark = opts.Remark;
    }

    // 檢查碼
    data.CheckMacValue = opts.hasOwnProperty("CheckMacValue") ? opts.CheckMacValue : this.genCheckMacValue(data);

    sendRequest("POST", _ENDPOINTS.capture, data, callback);
  }

  /**
   * 產生交易檢查碼
   *
   * @param {Object} data - 交易資料
   */
  genCheckMacValue(data, encryptType = "md5") {
    // 若有 CheckMacValue 則先移除
    if (data.hasOwnProperty("CheckMacValue")) {
      delete data.CheckMacValue;
    }

    let hashKey = data.hashKey || _config.hashKey;
    let hashIV = data.hashIV || _config.hashIV;

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
   * * @param {Object} data - 歐付寶回傳資料
   */
  isDataValid(data) {
    log("==================================================");
    log("Start to validate the following data");
    log("==================================================");
    log(data);

    let receivedCheckMacValue = data.CheckMacValue;
    let generatedCheckMacValue = this.genCheckMacValue(data);
    let isMatched = receivedCheckMacValue === generatedCheckMacValue;

    log(`Validation Result: ${isMatched ? "Match" : "Not match"}`)

    return isMatched;
  }
}

function urlEncode(data) {
  log("==================================================");
  log("Data before urlEncode");
  log("==================================================");
  log(data);

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
  if (!_config.isInitialized) {
    throw _ERROR_MESSAGES.initializeRequired;
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
    host: _config.host,
    port: _config.port,
    path: path,
    method: method,
    headers: headers
  };

  let request;
  if (!_config.useSSL) {
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
        if (_NON_JSON_RESPONSE_ENDPOINTS.indexOf(path) > -1) {
          if (response.statusCode === 200) {
            let responseArr;
            if (path === _ENDPOINTS.aioChargeback) {
              responseArr = buffer.split("|");
              responseData = {
                status: responseArr[0],
                message: responseArr[1]
              };
            } else {
              responseArr = buffer.split("&");
              responseData = {};
              for (let i in responseArr) {
                let key = responseArr[i].split("=")[0];
                let val = responseArr[i].split("=")[1];
                responseData[key] = val;
              }
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
 * @param {Object} - 訊息物件
 * @private
 */
function log(message) {
  if (message instanceof Error) {
    console.log(message.stack);
  }

  if (_config.debug) {
    if (typeof message === "object") {
      console.log(JSON.stringify(message, null, 2));
    } else {
      console.log(message);
    }
  }
}

/**
 * 格式化錯誤訊息
 */
function genErrorMessage(template, ...values) {
  return util.format(template, ...values)
}

module.exports = Allpay;

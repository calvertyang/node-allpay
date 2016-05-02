var Allpay = require("../lib/allpay");
var allpay = new Allpay({
  merchantID: "2000214",
  hashKey: "5294y06JbISpM5x9",
  hashIV: "v77hoKGq4kWxNNIS"
});

describe("Allpay", function() {
  describe("#aioCheckOut", function () {
    it("should return checkout form data", function(done) {
      allpay.aioCheckOut({
        "MerchantTradeNo": "TS20160502000001",
        "MerchantTradeDate": "2016/05/01 00:00:00",
        "TotalAmount": 120,
        "TradeDesc": "allpay 商城購物",
        "Items": [{
          "name": "商品一",
          "quantity": "1",
          "price": 80
        }, {
          "name": "商品二",
          "quantity": "2",
          "price": 10
        }],
        "ReturnURL": "http://localhost:3000",
        "ChoosePayment": "WebATM",
      }, function(err, result) {
        expect(err).to.be.undefined;
        expect(result).to.be.a("object");
        expect(result.url).to.be.a("string");
        expect(result.url).to.equal("https://payment-stage.allpay.com.tw/Cashier/AioCheckOut/V2");
        expect(result.data).to.be.a("object");

        var form_data = result.data;
        expect(form_data.MerchantID).to.be.a("string");
        expect(form_data.MerchantTradeNo).to.be.a("string");
        expect(form_data.MerchantTradeDate).to.be.a("string");
        expect(form_data.PaymentType).to.be.a("string");
        expect(form_data.TotalAmount).to.be.a("number");
        expect(form_data.TradeDesc).to.be.a("string");
        expect(form_data.ItemName).to.be.a("string");
        expect(form_data.ItemName).to.contain("#");
        expect(form_data.ItemName).to.contain("元");
        expect(form_data.ReturnURL).to.be.a("string");
        expect(form_data.ReturnURL).to.contain("http");
        expect(form_data.ChoosePayment).to.be.a("string");
        expect(form_data.CheckMacValue).to.be.a("string");

        done();
      });
    });

    it("should return checkout form data with e-invoice", function(done) {
      allpay.aioCheckOut({
        "MerchantTradeNo": "TS20160502000001",
        "MerchantTradeDate": "2016/05/01 00:00:00",
        "TotalAmount": 120,
        "TradeDesc": "allpay 商城購物",
        "Items": [{
          "name": "商品一",
          "quantity": "1",
          "price": 80
        }, {
          "name": "商品二",
          "quantity": "2",
          "price": 10
        }],
        "ReturnURL": "http://localhost:3000",
        "ChoosePayment": "WebATM",
        "InvoiceMark": "Y",
        "RelateNumber": "TS20160502000001",
        "CustomerEmail": "test@localhost.com",
        "TaxType": "1",
        "InvoiceItems": [{
          "name": "商品一",
          "count": "1",
          "word": "個",
          "price": "100",
          "taxType": "1"
        }],
        "InvType": "07",
      }, function(err, result) {
        expect(err).to.be.undefined;
        expect(result).to.be.a("object");

        expect(result.url).to.be.a("string");
        expect(result.url).to.equal("https://payment-stage.allpay.com.tw/Cashier/AioCheckOut/V2");
        expect(result.data).to.be.a("object");
        expect(result.html).to.be.a("string");

        var form_data = result.data;
        expect(form_data.MerchantID).to.be.a("string");
        expect(form_data.MerchantTradeNo).to.be.a("string");
        expect(form_data.MerchantTradeDate).to.be.a("string");
        expect(form_data.PaymentType).to.equal("aio");
        expect(form_data.TotalAmount).to.be.a("number");
        expect(form_data.TradeDesc).to.be.a("string");
        expect(form_data.ItemName).to.be.a("string");
        expect(form_data.ReturnURL).to.be.a("string");
        expect(form_data.ReturnURL).to.contain("http");
        expect(form_data.ChoosePayment).to.be.a("string");
        expect(form_data.NeedExtraPaidInfo).to.be.oneOf(["N", "Y"]);
        expect(form_data.DeviceSource).to.be.oneOf(["P", "M"]);
        expect(form_data.InvoiceMark).to.be.oneOf(["N", "Y"]);
        expect(form_data.RelateNumber).to.be.a("string");
        expect(form_data.CustomerID).to.be.a("string");
        expect(form_data.CustomerIdentifier).to.be.a("string");
        expect(form_data.CustomerName).to.be.a("string");
        expect(form_data.CustomerAddr).to.be.a("string");
        expect(form_data.CustomerEmail).to.be.a("string");
        expect(form_data.ClearanceMark).to.be.a("string");
        expect(form_data.TaxType).to.be.oneOf(["1", "2", "3", "9"]);
        expect(form_data.CarruerType).to.be.oneOf(["", "1", "2", "3"]);
        expect(form_data.CarruerNum).to.match(/^$|^[a-zA-Z]{2}\d{14}$|^\/{1}[0-9a-zA-Z+-.]{7}$/);
        expect(form_data.Donation).to.be.oneOf(["1", "2"]);
        expect(form_data.LoveCode).to.match(/^$|^([xX]{1}[0-9]{2,6}|[0-9]{3,7})$/);
        expect(form_data.Print).to.be.oneOf(["0", "1"]);
        expect(form_data.InvoiceItemName).to.be.equal("商品一");
        expect(form_data.InvoiceItemCount).to.be.equal("1");
        expect(form_data.InvoiceItemWord).to.be.equal("個");
        expect(form_data.InvoiceItemPrice).to.be.equal("100");
        expect(form_data.InvoiceItemTaxType).to.be.equal("1");
        expect(form_data.InvoiceRemark).to.be.a("string");
        expect(form_data.DelayDay).to.be.within(0, 15);
        expect(form_data.InvType).to.be.oneOf(["07", "08"]);
        expect(form_data.CheckMacValue).to.be.a("string");

        done();
      });
    });
  });

  describe("#queryTradeInfo", function() {
    it("should return trade information", function(done) {
      allpay.queryTradeInfo({
        "MerchantTradeNo": "TS20160429000001"
      }, function(err, result) {
        expect(err).to.be.undefined;
        expect(result).to.be.a("object");

        expect(result.HandlingCharge).to.be.a("string");
        expect(result.ItemName).to.be.a("string");
        expect(result.ItemName).to.contain("#");
        expect(result.ItemName).to.contain("元");
        expect(result.MerchantID).to.be.a("string");
        expect(result.MerchantTradeNo).to.be.a("string");
        expect(result.PayAmt).to.be.a("string");
        expect(result.PaymentDate).to.be.a("string");
        expect(result.PaymentType).to.be.a("string");
        expect(result.PaymentTypeChargeFee).to.be.a("string");
        expect(result.RedeemAmt).to.be.a("string");
        expect(result.TradeAmt).to.be.a("string");
        expect(result.TradeDate).to.be.a("string");
        expect(result.TradeNo).to.be.a("string");
        expect(result.TradeStatus).to.be.a("string");
        expect(result.CheckMacValue).to.be.a("string");
        expect(allpay.isDataValid(result)).to.be.true;

        done();
      });
    });

    it("should return extra trade information", function(done) {
      allpay.queryTradeInfo({
        "MerchantTradeNo": "TS20160429000002"
      }, function(err, result) {
        expect(err).to.be.undefined;
        expect(result).to.be.a("object");

        expect(result.AlipayID).to.be.a("string");
        expect(result.AlipayTradeNo).to.be.a("string");
        expect(result.amount).to.be.a("string");
        expect(result.ATMAccBank).to.be.a("string");
        expect(result.ATMAccNo).to.be.a("string");
        expect(result.auth_code).to.be.a("string");
        expect(result.card4no).to.be.a("string");
        expect(result.card6no).to.be.a("string");
        expect(result.eci).to.be.a("string");
        expect(result.ExecTimes).to.be.a("string");
        expect(result.Frequency).to.be.a("string");
        expect(result.gwsr).to.be.a("string");
        expect(result.HandlingCharge).to.be.a("string");
        expect(result.ItemName).to.be.a("string");
        expect(result.MerchantID).to.be.a("string");
        expect(result.MerchantTradeNo).to.be.a("string");
        expect(result.PayAmt).to.be.a("string");
        expect(result.PayFrom).to.be.a("string");
        expect(result.PaymentDate).to.be.a("string");
        expect(result.PaymentNo).to.be.a("string");
        expect(result.PaymentType).to.be.a("string");
        expect(result.PaymentTypeChargeFee).to.be.a("string");
        expect(result.PeriodAmount).to.be.a("string");
        expect(result.PeriodType).to.be.a("string");
        expect(result.process_date).to.be.a("string");
        expect(result.red_dan).to.be.a("string");
        expect(result.red_de_amt).to.be.a("string");
        expect(result.red_ok_amt).to.be.a("string");
        expect(result.red_yet).to.be.a("string");
        expect(result.RedeemAmt).to.be.a("string");
        expect(result.staed).to.be.a("string");
        expect(result.stage).to.be.a("string");
        expect(result.stast).to.be.a("string");
        expect(result.TenpayTradeNo).to.be.a("string");
        expect(result.TotalSuccessAmount).to.be.a("string");
        expect(result.TotalSuccessTimes).to.be.a("string");
        expect(result.TradeAmt).to.be.a("string");
        expect(result.TradeDate).to.be.a("string");
        expect(result.TradeNo).to.be.a("string");
        expect(result.TradeStatus).to.be.a("string");
        expect(result.WebATMAccBank).to.be.a("string");
        expect(result.WebATMAccNo).to.be.a("string");
        expect(result.WebATMBankName).to.be.a("string");
        expect(result.CheckMacValue).to.be.a("string");

        done();
      });
    });
  });

  describe("#queryCreditCardPeriodInfo", function() {
    it("should return credit card period information", function(done) {
      allpay.queryCreditCardPeriodInfo({
        "MerchantTradeNo": "TS20160429000003"
      }, function(err, result) {
        expect(err).to.be.undefined;
        expect(result).to.be.a("object");

        expect(result.ExecStatus).to.be.a("string");
        expect(result.MerchantID).to.be.a("string");
        expect(result.MerchantTradeNo).to.be.a("string");
        expect(result.TradeNo).to.be.a("string");
        expect(result.RtnCode).to.be.a("number");
        expect(result.PeriodType).to.be.a("string");
        expect(result.Frequency).to.be.a("number");
        expect(result.ExecTimes).to.be.a("number");
        expect(result.PeriodAmount).to.be.a("number");
        expect(result.amount).to.be.a("number");
        expect(result.gwsr).to.be.a("number");
        expect(result.process_date).to.be.a("string");
        expect(result.auth_code).to.be.a("string");
        expect(result.card4no).to.be.a("string");
        expect(result.card6no).to.be.a("string");
        expect(result.TotalSuccessTimes).to.be.a("number");
        expect(result.TotalSuccessAmount).to.be.a("number");
        expect(result.ExecLog).to.be.a("array");

        done();
      });
    })
  });

  describe("#doAction", function() {
    it("should return not supported error", function(done) {
      allpay.doAction({
        "MerchantTradeNo": "TS20160429000001",
        "TradeNo": "1604291411319292",
        "Action": "C",
        "TotalAmount": "100",
      }, function(err, result) {
        expect(err).to.be.an.instanceof(Error);
        expect(err.message).to.equal("This feature is not supported in test mode");
        expect(result).to.be.undefined;

        done();
      });
    });
  });

  describe.skip("#aioChargeback", function() {
    it("should return charge back information", function(done) {
      allpay.aioChargeback({
        "MerchantTradeNo": "TS20160429000001",
        "TradeNo": "1604291411319292",
        "ChargeBackTotalAmount": "100",
      }, function(err, result) {
        expect(err).to.be.undefined;
        expect(result).to.be.a("object");

        expect(result.status).to.be.oneOf(["0", "1"]);
        expect(result.message).to.be.a("string");

        done();
      });
    });
  });

  describe.skip("#capture", function() {
    it("should return capture information", function(done) {
      allpay.capture({
        "MerchantTradeNo": "TS20160429000001",
        "CaptureAMT": 500,
        "UserRefundAMT": 0,
      }, function(err, result) {
        expect(err).to.be.undefined;
        expect(result).to.be.a("object");

        expect(result.MerchantID).to.be.a("string");
        expect(result.MerchantTradeNo).to.be.a("string");
        expect(result.TradeNo).to.be.a("string");
        expect(result.RtnCode).to.be.a("string");
        expect(result.RtnMsg).to.be.a("string");
        expect(result.AllocationDate).to.be.a("string");

        done();
      });
    });
  });

  describe("#genCheckMacValue", function() {
    it("should generate CheckMacValue by MD5", function() {
      var checkMacValue = allpay.genCheckMacValue({
        "MerchantID": "2000214",
        "MerchantTradeNo": "20160501000001",
        "MerchantTradeDate": "2016/05/01 00:00:00",
        "TotalAmount": 120,
        "TradeDesc": "allpay 商城購物",
        "ItemName": "商品一 80 元 x1#商品二 10 元 x2",
        "ReturnURL": "http://localhost:3000",
        "ChoosePayment": "WebATM",
        "DeviceSource": "P",
        "NeedExtraPaidInfo": "N",
        "PaymentType": "aio",
      });

      expect(checkMacValue).to.be.a("string");
      expect(checkMacValue).to.equal("BB5B8D5F26BFAEAB6BD2D8501D3F6144");
    });

    it("should generate CheckMacValue by SHA256", function() {
      var checkMacValue = allpay.genCheckMacValue({
        "MerchantID": "2000214",
        "MerchantTradeNo": "20160501000001",
        "MerchantTradeDate": "2016/05/01 00:00:00",
        "TotalAmount": 120,
        "TradeDesc": "allpay 商城購物",
        "ItemName": "商品一 80 元 x1#商品二 10 元 x2",
        "ReturnURL": "http://localhost:3000",
        "ChoosePayment": "WebATM",
        "DeviceSource": "P",
        "NeedExtraPaidInfo": "N",
        "PaymentType": "aio",
      }, "SHA256");

      expect(checkMacValue).to.be.a("string");
      expect(checkMacValue).to.equal("3181C4F0F42EF67459275E83C7F2014F36D7FA3E22DAD26965BCA0A195216F26");
    });
  });

  describe("#isDataValid", function() {
    it("should do data validation", function() {
      var data = {
        "MerchantID": "2000214",
        "MerchantTradeNo": "20160501000001",
        "MerchantTradeDate": "2016/05/01 00:00:00",
        "PaymentType": "aio",
        "TotalAmount": 120,
        "TradeDesc": "allpay 商城購物",
        "ItemName": "商品一 80 元 x1#商品二 10 元 x2",
        "ReturnURL": "http://localhost:3000",
        "ChoosePayment": "WebATM",
        "NeedExtraPaidInfo": "N",
        "DeviceSource": "P",
        "CheckMacValue": "BB5B8D5F26BFAEAB6BD2D8501D3F6144"
       };

       expect(allpay.isDataValid(data)).to.be.true;
    });
  });
});

var Allpay = require("../lib/allpay");
var allpay;

beforeEach(function() {
  allpay = new Allpay({
    merchantID: "2000214",
    hashKey: "5294y06JbISpM5x9",
    hashIV: "v77hoKGq4kWxNNIS"
  });

  allpay.setHost({
    host: "payment-stage.allpay.com.tw",
    port: 443,
    useSSL: true
  });
});

describe("Allpay", function() {
  describe("#getConfig", function() {
    it("should return current config", function() {
      var config = allpay.getConfig();

      expect(config).to.be.a("object");
      expect(config.merchantID).to.equal("2000214");
      expect(config.hashKey).to.equal("5294y06JbISpM5x9");
      expect(config.hashIV).to.equal("v77hoKGq4kWxNNIS");
      expect(config.mode).to.equal("test");
      expect(config.debug).to.be.false;
      expect(config.host).to.equal("payment-stage.allpay.com.tw");
      expect(config.port).to.equal(443);
      expect(config.useSSL).to.be.true;
      expect(config.isInitialized).to.be.true;
    });
  });

  describe("#setHost", function() {
    it("should set host to http://localhost", function() {
      allpay.setHost({ host: "http://localhost" });

      var config = allpay.getConfig();

      expect(config.host).to.equal("http://localhost");
    });

    it("should set port to 9999", function() {
      allpay.setHost({ port: 9999 });

      var config = allpay.getConfig();

      expect(config.port).to.equal(9999);
    });

    it("should set useSSL to false", function() {
      allpay.setHost({ useSSL: false });

      var config = allpay.getConfig();

      expect(config.useSSL).to.be.false;
    });
  });

  describe("#aioCheckOut", function() {
    it("should return checkout form data", function(done) {
      allpay.aioCheckOut({
        MerchantTradeNo: "TS20160502000001",
        MerchantTradeDate: "2016/05/01 00:00:00",
        TotalAmount: 120,
        TradeDesc: "allpay 商城購物",
        Items: [{
          name: "商品一",
          price: 80,
          currency: "元",
          quantity: 1
        }, {
          name: "商品二",
          price: 10,
          currency: "元",
          quantity: 2
        }],
        ReturnURL: "http://localhost/receive",
        ChoosePayment: "WebATM"
      }, function(err, result) {
        expect(err).to.be.undefined;
        expect(result).to.be.a("object");

        expect(result.url).to.be.a("string");
        expect(result.url).to.equal("https://payment-stage.allpay.com.tw/Cashier/AioCheckOut/V2");
        expect(result.data).to.be.a("object");
        expect(result.html).to.be.a("string");
        expect(result.html).to.match(/^<form.+\/form>$/);

        var form_data = result.data;
        expect(form_data.MerchantID).to.be.a("string");
        expect(form_data.MerchantID).to.equal("2000214");
        expect(form_data.MerchantTradeNo).to.be.a("string");
        expect(form_data.MerchantTradeNo).to.equal("TS20160502000001");
        expect(form_data.MerchantTradeDate).to.be.a("string");
        expect(form_data.MerchantTradeDate).to.equal("2016/05/01 00:00:00");
        expect(form_data.PaymentType).to.be.a("string");
        expect(form_data.PaymentType).to.equal("aio");
        expect(form_data.TotalAmount).to.be.a("number");
        expect(form_data.TotalAmount).to.equal(120);
        expect(form_data.TradeDesc).to.be.a("string");
        expect(form_data.TradeDesc).to.equal("allpay 商城購物");
        expect(form_data.ItemName).to.be.a("string");
        expect(form_data.ItemName).to.equal("商品一 80 元 x 1#商品二 10 元 x 2");
        expect(form_data.ReturnURL).to.be.a("string");
        expect(form_data.ReturnURL).to.equal("http://localhost/receive");
        expect(form_data.ChoosePayment).to.be.a("string");
        expect(form_data.ChoosePayment).to.equal("WebATM");
        expect(form_data.CheckMacValue).to.be.a("string");
        expect(form_data.CheckMacValue).to.equal("1CE2EC77FF316D28F0B4BD746996E25F");

        done();
      });
    });

    it("should return checkout form data with e-invoice", function(done) {
      allpay.aioCheckOut({
        MerchantTradeNo: "TS20160502000001",
        MerchantTradeDate: "2016/05/01 00:00:00",
        TotalAmount: 120,
        TradeDesc: "allpay 商城購物",
        Items: [{
          name: "商品一",
          price: 80,
          currency: "元",
          quantity: 1
        }, {
          name: "商品二",
          price: 10,
          currency: "元",
          quantity: 2
        }],
        ReturnURL: "http://localhost/receive",
        ChoosePayment: "WebATM",
        InvoiceMark: "Y",
        RelateNumber: "TS20160502000001",
        CustomerEmail: "test@localhost.com",
        TaxType: "1",
        InvoiceItems: [{
          name: "商品一",
          count: 1,
          word: "個",
          price: 80,
          taxType: "1"
        }, {
          name: "商品二",
          count: 2,
          word: "個",
          price: 10,
          taxType: "1"
        }],
        InvType: "07"
      }, function(err, result) {
        expect(err).to.be.undefined;
        expect(result).to.be.a("object");

        expect(result.url).to.be.a("string");
        expect(result.url).to.equal("https://payment-stage.allpay.com.tw/Cashier/AioCheckOut/V2");
        expect(result.data).to.be.a("object");
        expect(result.html).to.be.a("string");
        expect(result.html).to.match(/^<form.+\/form>$/);

        var form_data = result.data;
        expect(form_data.MerchantID).to.be.a("string");
        expect(form_data.MerchantID).to.equal("2000214");
        expect(form_data.MerchantTradeNo).to.be.a("string");
        expect(form_data.MerchantTradeNo).to.equal("TS20160502000001");
        expect(form_data.MerchantTradeDate).to.be.a("string");
        expect(form_data.MerchantTradeDate).to.equal("2016/05/01 00:00:00");
        expect(form_data.PaymentType).to.be.a("string");
        expect(form_data.PaymentType).to.equal("aio");
        expect(form_data.TotalAmount).to.be.a("number");
        expect(form_data.TotalAmount).to.equal(120);
        expect(form_data.TradeDesc).to.be.a("string");
        expect(form_data.TradeDesc).to.equal("allpay 商城購物");
        expect(form_data.ItemName).to.be.a("string");
        expect(form_data.ItemName).to.equal("商品一 80 元 x 1#商品二 10 元 x 2");
        expect(form_data.ReturnURL).to.be.a("string");
        expect(form_data.ReturnURL).to.equal("http://localhost/receive");
        expect(form_data.ChoosePayment).to.be.a("string");
        expect(form_data.ChoosePayment).to.equal("WebATM");
        expect(form_data.InvoiceMark).to.be.a("string");
        expect(form_data.InvoiceMark).to.equal("Y");
        expect(form_data.RelateNumber).to.be.a("string");
        expect(form_data.RelateNumber).to.equal("TS20160502000001");
        expect(form_data.CustomerID).to.be.a("string");
        expect(form_data.CustomerID).to.equal("");
        expect(form_data.CustomerIdentifier).to.be.a("string");
        expect(form_data.CustomerIdentifier).to.equal("");
        expect(form_data.CustomerName).to.be.a("string");
        expect(form_data.CustomerName).to.equal("");
        expect(form_data.CustomerAddr).to.be.a("string");
        expect(form_data.CustomerAddr).to.equal("");
        expect(form_data.CustomerEmail).to.be.a("string");
        expect(form_data.CustomerEmail).to.equal("test%40localhost.com");
        expect(form_data.ClearanceMark).to.be.a("string");
        expect(form_data.ClearanceMark).to.equal("");
        expect(form_data.TaxType).to.be.a("string");
        expect(form_data.TaxType).to.equal("1");
        expect(form_data.CarruerType).to.be.a("string");
        expect(form_data.CarruerType).to.equal("");
        expect(form_data.CarruerNum).to.be.a("string");
        expect(form_data.CarruerNum).to.equal("");
        expect(form_data.Donation).to.be.a("string");
        expect(form_data.Donation).to.equal("2");
        expect(form_data.LoveCode).to.be.a("string");
        expect(form_data.LoveCode).to.equal("");
        expect(form_data.Print).to.be.a("string");
        expect(form_data.Print).to.equal("0");
        expect(form_data.InvoiceItemName).to.be.a("string");
        expect(form_data.InvoiceItemName).to.equal("%E5%95%86%E5%93%81%E4%B8%80|%E5%95%86%E5%93%81%E4%BA%8C");
        expect(form_data.InvoiceItemCount).to.be.a("string");
        expect(form_data.InvoiceItemCount).to.equal("1|2");
        expect(form_data.InvoiceItemWord).to.be.a("string");
        expect(form_data.InvoiceItemWord).to.equal("%E5%80%8B|%E5%80%8B");
        expect(form_data.InvoiceItemPrice).to.be.a("string");
        expect(form_data.InvoiceItemPrice).to.equal("80|10");
        expect(form_data.InvoiceItemTaxType).to.be.a("string");
        expect(form_data.InvoiceItemTaxType).to.equal("1|1");
        expect(form_data.InvoiceRemark).to.be.a("string");
        expect(form_data.InvoiceRemark).to.equal("");
        expect(form_data.DelayDay).to.be.a("number");
        expect(form_data.DelayDay).to.equal(0);
        expect(form_data.InvType).to.be.a("string");
        expect(form_data.InvType).to.equal("07");
        expect(form_data.CheckMacValue).to.be.a("string");
        expect(form_data.CheckMacValue).to.equal("E1BAFF4D913CDD3FEF2B43F67C5D2A35");

        done();
      });
    });
  });

  describe("#queryTradeInfo", function() {
    it("should return trade information", function(done) {
      allpay.queryTradeInfo({
        MerchantTradeNo: "TS20160429000001"
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
        MerchantTradeNo: "TS20160429000002"
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
        MerchantTradeNo: "TS20160429000003"
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
        MerchantTradeNo: "TS20160429000001",
        TradeNo: "1604291411319292",
        Action: "C",
        TotalAmount: 100
      }, function(err, result) {
        expect(err).to.be.an.instanceof(Error);
        expect(err.message).to.equal("This feature is not supported in test mode.");
        expect(result).to.be.undefined;

        done();
      });
    });
  });

  describe.skip("#aioChargeback", function() {
    it("should return charge back information", function(done) {
      allpay.aioChargeback({
        MerchantTradeNo: "TS20160429000001",
        TradeNo: "1604291411319292",
        ChargeBackTotalAmount: 100
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
        MerchantTradeNo: "TS20160429000001",
        CaptureAMT: 500,
        UserRefundAMT: 0
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
    it("should generate CheckMacValue via MD5", function() {
      var checkMacValue = allpay.genCheckMacValue({
        MerchantID: "2000214",
        MerchantTradeNo: "20160501000001",
        MerchantTradeDate: "2016/05/01 00:00:00",
        PaymentType: "aio",
        TotalAmount: 120,
        TradeDesc: "allpay 商城購物",
        ItemName: "商品一 80 元 x1#商品二 10 元 x2",
        ReturnURL: "http://localhost/receive",
        ChoosePayment: "WebATM",
        DeviceSource: "P",
        NeedExtraPaidInfo: "N"
      });

      expect(checkMacValue).to.be.a("string");
      expect(checkMacValue).to.equal("F27F5BC6A5A0E95AE3F5477774F938E2");
    });

    it("should generate CheckMacValue via SHA256", function() {
      var checkMacValue = allpay.genCheckMacValue({
        MerchantID: "2000214",
        MerchantTradeNo: "20160501000001",
        MerchantTradeDate: "2016/05/01 00:00:00",
        PaymentType: "aio",
        TotalAmount: 120,
        TradeDesc: "allpay 商城購物",
        ItemName: "商品一 80 元 x1#商品二 10 元 x2",
        ReturnURL: "http://localhost/receive",
        ChoosePayment: "WebATM",
        NeedExtraPaidInfo: "N",
        DeviceSource: "P"
      }, "SHA256");

      expect(checkMacValue).to.be.a("string");
      expect(checkMacValue).to.equal("33AB3EAFD997E848E5375273EFB91981C80DFD778E98537B81A687BEE71AF892");
    });
  });

  describe("#isDataValid", function() {
    it("should validate data via MD5", function() {
      var data = {
        MerchantID: "2000214",
        MerchantTradeNo: "20160501000001",
        MerchantTradeDate: "2016/05/01 00:00:00",
        PaymentType: "aio",
        TotalAmount: 120,
        TradeDesc: "allpay 商城購物",
        ItemName: "商品一 80 元 x1#商品二 10 元 x2",
        ReturnURL: "http://localhost/receive",
        ChoosePayment: "WebATM",
        NeedExtraPaidInfo: "N",
        DeviceSource: "P",
        CheckMacValue: "F27F5BC6A5A0E95AE3F5477774F938E2"
      };

      expect(allpay.isDataValid(data)).to.be.true;
    });

    it("should validate data via SHA256", function() {
      var data = {
        MerchantID: "2000214",
        MerchantTradeNo: "20160501000001",
        MerchantTradeDate: "2016/05/01 00:00:00",
        PaymentType: "aio",
        TotalAmount: 120,
        TradeDesc: "allpay 商城購物",
        ItemName: "商品一 80 元 x1#商品二 10 元 x2",
        ReturnURL: "http://localhost/receive",
        ChoosePayment: "WebATM",
        NeedExtraPaidInfo: "N",
        DeviceSource: "P",
        CheckMacValue: "33AB3EAFD997E848E5375273EFB91981C80DFD778E98537B81A687BEE71AF892"
      };

      expect(allpay.isDataValid(data, "SHA256")).to.be.true;
    });
  });
});

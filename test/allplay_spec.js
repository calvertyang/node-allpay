var allpay = new require('../lib/allpay')({
  merchantID: '2000132',
  hashKey: '5294y06JbISpM5x9',
  hashIV: 'v77hoKGq4kWxNNIS',
  debug: true
});

allpay.setHost({
  baseUrl: 'payment-stage.allpay.com.tw',
  port: 80,
});


describe('Allpay', function () {

  it('checkout shoulld success', function (done) {
    allpay.aioCheckOut({
      'MerchantTradeNo': 'nodeallplay' + ( parseInt(Math.random() * 10) + 1 ),
      'TotalAmount': 120,
      'TradeDesc': 'allpay 商城購物',
      'itemName': [
        {
          'name': 'testItem',
          'qty': '1',
          'price': 60
        },
        {
          'name': 'testItem2',
          'qty': '1',
          'price': 60
        }
      ],
      'ChoosePayment': 'WebATM',
      'ReturnURL': 'http://localhost:3000',
    }, function(data){
      console.log(data);
      expect(data).to.be.a('object');
      expect(data.url).to.be.a('string');

      var form_data = data.data;
      expect(form_data.MerchantID).to.be.a('string');
      expect(form_data.MerchantTradeNo).to.be.a('string');
      expect(form_data.MerchantTradeDate).to.be.a('string');
      expect(form_data.PaymentType).to.be.a('string');
      expect(form_data.TotalAmount).to.be.a('number');
      expect(form_data.TradeDesc).to.be.a('string');

      expect(form_data.itemName).to.be.a('string');
      expect(form_data.itemName).to.contain('#');
      expect(form_data.itemName).to.contain('元');

      expect(form_data.ReturnURL).to.be.a('string');
      expect(form_data.ReturnURL).to.contain('http');
      expect(form_data.ChoosePayment).to.be.a('string');
      expect(form_data.CheckMacValue).to.be.a('string');

      done();
    })
  });
});
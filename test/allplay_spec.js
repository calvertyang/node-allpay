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
      'MerchantTradeNo': 'node-allplay' + ( parseInt(Math.random() * 10) + 1 ),
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
    }, function(err, res){
      if(err){
        console.log('error :');
        console.log(err);
      }
      logger.debug(res);
      done();
    })
  });
});
## AllPay 全方位金流介接 SDK for Node.js

[![NPM version](https://badge.fury.io/js/allpay.svg)](https://npmjs.org/package/allpay)

[![NPM status](https://nodei.co/npm/allpay.png?downloads=true&stars=true)](https://npmjs.org/package/allpay)

## 安裝方式

建議使用 Node.js 套件管理工具 [npm](http://npmjs.org) 安裝。

```sh
$ npm install allpay
```

## 使用方式

#### 初始化

安裝完畢後，你可以使用 `require` 載入套件：

```js
var Allpay = require('allpay');
```

```js
var allpay = new Allpay({
  merchantID: 'YOUR_MERCHANT_ID',
  hashKey: 'YOUR_HASH_KEY',
  hashIV: 'YOUR_HASH_IV',
  debug: false
});
```

`merchantID`：**必填**，廠商編號（由 AllPay 提供）。

`hashKey`：**必填**，全方位金流介接的 HashKey。

`hashIV`：**必填**，全方位金流介接的 HashIV。

`debug`：**選填**，設為 true 可查看除錯訊息（預設為 false）。

#### 設定連線（非必要）

```js
allpay.setHost({
  baseUrl: 'payment-stage.allpay.com.tw',
  port: 80,
  useSSL: false
});
```

`baseUrl`：**選填**，介接網址（預設為 payment.allpay.com.tw）。

`port`：**選填**，連接埠（預設為 443）。

`useSSL`：**選填**，使用 SSL 連線（預設為 true）。

## 支援以下 API 介接

#### 訂單產生
 * allpay.[aioCheckOut](#aioCheckOut)(`options`, `callback`)

#### 訂單查詢
 * allpay.[queryTradeInfo](#queryTradeInfo)(`options`, `callback`)

#### 信用卡定期定額訂單查詢
 * allpay.[queryPeriodCreditCardTradeInfo](#queryPeriodCreditCardTradeInfo)(`options`, `callback`)

#### 信用卡關帳／退刷／取消／放棄
 * allpay.[creditDetailDoAction](#creditDetailDoAction)(`options`, `callback`)

#### 廠商通知退款
 * allpay.[aioChargeback](#aioChargeback)(`options`, `callback`)

---------------

<a name="aioCheckOut"></a>
#### 訂單產生

```js
allpay.queryTradeInfo(options, callback)
```

> options.`MerchantTradeNo`：**必填**，廠商交易編號，如：`Allpay20141209001`。
>
> options.`TotalAmount`：**必填**，交易金額，如：`5000`。
>
> options.`TradeDesc`：**必填**，交易描述，如：`allpay 商城購物`。
>
> options.`ItemName`：**必填**，商品名稱，使用陣列物件， 如：

```
'ItemName': [
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
]
```

> options.`ReturnURL`：**必填**，回傳網址，如：`http://www.allpay.com.tw/
receive.php`。
>
> options.`ChoosePayment`：**必填**，選擇預設付款方式，如：`WebATM`
>
> options.`CheckMacValue`: **選填**，交易檢查碼，未填寫則由程式自動產生。

<a name="queryTradeInfo"></a>
#### 訂單查詢

```js
allpay.queryTradeInfo(options, callback)
```

> options.`MerchantTradeNo`：**必填**，廠商交易編號，如：`Allpay20141209001`。
>
> options.`PlatformID`：**選填**，特約合作平台商代號（由 AllPay 提供）。
>
> options.`CheckMacValue`: **選填**，交易檢查碼，未填寫則由程式自動產生。

<a name="queryPeriodCreditCardTradeInfo"></a>
#### 信用卡定期定額訂單查詢

```js
allpay.queryPeriodCreditCardTradeInfo(options, callback)
```

> options.`MerchantTradeNo`：**必填**，廠商交易編號，如：`Allpay20141209001`。
>
> options.`CheckMacValue`: **選填**，交易檢查碼，未填寫則由程式自動產生。

<a name="creditDetailDoAction"></a>
#### 信用卡關帳／退刷／取消／放棄

```js
allpay.queryPeriodCreditCardTradeInfo(options, callback)
```

> options.`MerchantTradeNo`：**必填**，廠商交易編號，如：`Allpay20141209001`。
>
> options.`TradeNo`: **必填**，AllPay 的交易編號，如：`1234567890`。
>
> options.`Action`: **必填**，執行動作，如：`C`。
>
> options.`TotalAmount`: **必填**，金額，如：`1500`。
>
> options.`PlatformID`：**選填**，特約合作平台商代號（由 AllPay 提供）。
>
> options.`CheckMacValue`: **選填**，交易檢查碼，未填寫則由程式自動產生。

<a name="aioChargeback"></a>
#### 廠商通知退款

```js
allpay.aioChargeback(options, callback)
```

> options.`MerchantTradeNo`：**必填**，廠商交易編號，如：`Allpay20141209001`。
>
> options.`TradeNo`: **必填**，AllPay 的交易編號，如：`1234567890`。
>
> options.`ChargeBackTotalAmount`: **必填**，退款金額，如：`150`。
>
> options.`Remark`: **選填**，備註欄位。
>
> options.`PlatformID`：**選填**，特約合作平台商代號（由 AllPay 提供）。
>
> options.`CheckMacValue`: **選填**，交易檢查碼，未填寫則由程式自動產生。

---

#### Callback

Callback 會返回 2 個參數，分別為 error 和一個 JSON 物件。

以下為範例 callback 函數：

```js
function callback (err, response) {
  if (err) {
    console.log(err);
  } else {
    console.dir(response);
  }
}
```

---

詳細參數說明請參閱[全方位金流介接技術文件](https://www.allpay.com.tw/Content/files/allpay_011.pdf)。

## License

MIT

![Analytics](https://ga-beacon.appspot.com/UA-44933497-3/CalvertYang/allpay?pixel)

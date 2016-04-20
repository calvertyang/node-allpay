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

#### 付款結果通知
 * allpay.[checkOutResultNotify](#checkOutResultNotify)(`options`, `callback`)

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
>
> options.`ClientBackURL`: **選填**，Client 端返回廠商網址 。
```
此網址為付款完成後，
歐付寶會顯示付款完成
頁，該頁面上會有[返回
廠商]的按鈕，會員點選
按鈕後，會將頁面導回
到此設定的網址。
若未設定此參數，則歐
付寶的付款完成頁，不
會顯示[返回廠商]的按
鈕。
※頁面導回的時候，不會
帶付款結果到此網址，
只是將頁面導回而已。
```
>
> options.`ItemURL`: **選填**，商品銷售網址。
>
> options.`ChooseSubPayment`: **選填**，選擇預設付款子項目。
```
若正確設定此欄位，使
用者則無法看見金流選
擇頁，直接使用設定的
付款方式，但信用卡
(Credit)與儲值消費
(TopUpUsed)無此功能。
例如：ChoosePayment
設定 WebATM，
ChooseSubPayment 設定
TAISHIN，此次交易就會
以台新銀行的網路 ATM
付款。
```
>
> options.`OrderResultURL`: **選填**，選擇預設付款子項目。
```
此網址為付款完成後，
將頁面導回到此設定的
網址，並帶回付款結果
的參數，沒帶此參數則
會顯示歐付寶的顯示付
款完成頁。
如果要將付款結果頁顯
示在貴公司，請設定此
網址。
(有些銀行的 WebATM 在
交易成功後，會停留在
銀行的頁面，並不會導
回給歐付寶，所以歐付
寶也不會將頁面導回到
OrderResultURL的頁面。)
※設定了此參數值，會使
設定的 ClientBackURL 失
效。
```
>
> options.`NeedExtraPaidInfo`: **選填**，是否需要額外的付款資訊。
```
設定付款完成通知，及
訂單查詢的回覆資料，
是否需要額外的付款資
訊(回傳資訊請參考-額
外回傳的參數)。
預設為 N，表示不回傳額
外資料。若建立訂單
時，設定為 Y，表示要回
傳額外資料。
```
>
> options.`DeviceSource`: **選填**，裝置來源。
```
此參數會因為設定的值
不同，而顯示不同 layout
的付款方式選擇頁面。
參數值如下:
P:桌機版頁面(此為預設
值)。
M:行動裝置版頁面。若
是要使用在手機 APP 付
款時，請帶此參數值，
且 ChoosePayment 請帶
ALL 給歐付寶
```
>
> options.`IgnorePayment`: **選填**，隱藏付款方式。
```
當ChoosePayment為ALL
時，可隱藏不需要的付
款方式，多筆請以井號
分隔(#)。
可用的參數值：
Credit:信用卡
WebATM:網路 ATM
ATM:自動櫃員機
CVS:超商代碼
BARCODE:超商條碼
Alipay:支付寶
Tenpay:財付通
TopUpUsed:儲值消費
```
>
> options.`PlatformID`: **選填** 特約合作平台商代號(由allpay 提供)。
```
此參數為專案合作的平
台商使用，一般廠商介
接請放空值。
若為專案合作的平台商
使用時，MerchantID 請
帶賣家所綁定的
MerchantID。
```

>
> options.`HoldTradeAMT`: **選填** 是否延遲撥款
```
是否延遲撥款。否-請帶
0(預設值)，是-請帶 1。
參數值如下:
0:買方付款完成後，歐付
寶依合約約定之時間，
撥款給廠商(此為預設
值)。
1:買方付款完成後，需再
呼叫「廠商申請撥款／
退款」API，讓歐付寶撥
款給廠商，或退款給買
方。倘若廠商一直不申
請撥款，此筆訂單款項
會一直放在歐付寶，直
到廠商申請撥款。
※延遲撥款不適用「信用
卡」、「財付通」之付款
方式。
```
>
> options.`EncryptType`: **選填** CheckMacValue 加密類型
```
0:MD5(預設)
1:SHA256
```

>
> options.`UseRedeem`: **選填** 是否可以使用購物金/紅包折抵
```
用來設定此筆交易是否
可以使用購物金/紅包折
抵。
參數設定：
Y：可使用，
N：不可使用(預設為 N)
註 1：折抵方式可於「廠
商後台／紅包折抵設
定」功能新增您的折抵
條件，若已開啟折抵設
定，需再配合此參數，
來決定此筆交易是否可
以使用購物金/紅包折
抵。
註 2：折抵的購物金/紅
包金額，需由廠商自行
負擔。
註 3：若可使用購物金/
紅包折抵時，需注意接
收付款結果通知時，請
以 TradeAmt 做訂單金額
的檢查。
註 4：於 V1.1.30 新增此
欄位。
```



<a name="checkOutResultNotify"></a>
#### 付款結果通知 (實作中)

```js
allpay.checkOutResultNotify(options, callback)
```

> options 直接將歐付寶伺服器端 POST 過來的資料帶入來驗證資料是否正確


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

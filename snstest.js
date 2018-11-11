var AWS = require('aws-sdk');
var sns = new AWS.SNS({
    apiVersion: '2010-03-31',
    region: 'ap-northeast-1'
});
var dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

exports.handler = function send(filename, recordkey, phone){
  var params = {
      Message: '領収証の発行準備が整いました。' + "https://invoice.kvitanco.biz/?invoiceid=" + recordkey, /* required */
      PhoneNumber: '+81' + parseInt(phone).toString(),
      Subject: '領収証発行サービスkvitancoからのお知らせ'
    };
    
  sns.publish(params, function(err, data){
      if(err){ throw err; }
      console.log(data);
      var param1 = {
        ExpressionAttributeNames: {
         "#Y": "Year"
        }, 
        ExpressionAttributeValues: {
         ":y": {
           S: filename
          }
        }, 
        Key: { 
         "id": {
           S: recordkey
          }
        }, 
        TableName: "InvoiceData-gfglar3thfeapcqr4ytskpf23a", 
        UpdateExpression: "SET #Y = :y"
       };
      dynamodb.updateItem(param1, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else     console.log(data);  
      })
  })
}
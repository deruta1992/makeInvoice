const PDFDocument = require('pdfkit');
const fs = require('fs');
const AWS = require('aws-sdk');
var Promise = require('promise');
const s3 = new AWS.S3({"api-version": "2006-03-01"});
const sns = new AWS.SNS({
    apiVersion: '2010-03-31',
    region: 'ap-northeast-1'
});
var ses = new AWS.SES({apiVersion: '2010-12-01'});
const dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
const co = require('co');
var exec = require('child_process').exec;
/*let event = {
    Records: [ { eventID: '9ad7cae670cd03c7523633ddf6fd49f5',
        eventName: 'INSERT',
        eventVersion: '1.1',
        eventSource: 'aws:dynamodb',
        awsRegion: 'ap-northeast-1',
        //dynamodb: [Object],
        eventSourceARN: 'arn:aws:dynamodb:ap-northeast-1:684022786653:table/InvoiceData-gfglar3thfeapcqr4ytskpf23a/stream/2018-10-27T15:07:09.914'
    }]
};*/
exports.handler = function (event, context, callback) {

    var filename = "invoice" + Date.now().toString() + '_' + (Math.random(5) * 10).toString() + '.pdf';
    console.log(filename);
    //var fileDir = filename;
    var fileDir = '/tmp/' + filename;
        
    co(function*(){
        let record = event.Records[0];
        console.log(event); 
        
        if (record.eventName == 'INSERT') {

        const promise = yield new Promise(function(resolve, reject){
                    
            doc = new PDFDocument
            
            const fsStream = fs.createWriteStream(fileDir);
            
            doc.pipe(fsStream);
            
            doc.fontSize(30)
            
            doc.font('./font/GenShinGothic-Medium.ttf')
            .text('領収書', 50, 10)
            
            doc.rect(170,30,380,5)
            .lineWidth(5)
            .stroke('#b4b4b4')
            
            doc.fontSize(15)
            doc.fillColor("black")
        
            let company = record.dynamodb.NewImage.company;
            let atena = record.dynamodb.NewImage.name;
            //fromCompany for debug
            let fromCompany = "Kvitanco";
            if(record.dynamodb.NewImage.fromCompany){
                fromCompany = record.dynamodb.NewImage.fromCompany;
            }
            let fromAddress = "東京都品川区北品川1-9-7-1015";
            if(record.dynamodb.NewImage.fromAddress){
                fromAddress = record.dynamodb.NewImage.fromAddress;
            }
            let fromPhone = "050-5273-5810";
            if(record.dynamodb.NewImage.fromPhone){
                fromPhone = record.dynamodb.NewImage.fromPhone;
            }
            
            let from = {
                company: fromCompany,
                address: fromAddress,
                tel: fromPhone
            }
            //console.log(company)
            if(!company){ company = ""; }
            let border_length = company.length * 20;
            if(border_length < atena.length * 20){
                border_length = atena.length * 20;
            }
            doc.text(company, 50, 60)
            doc.text(atena, 50, 80)
            doc.lineWidth(1)
            doc.moveTo(50, 80)
            .lineTo(50 + border_length, 80)
        
            doc.fontSize(10)
            doc.text(from.company, 50, 100, {align: "right"})
            doc.text(from.address, 50, 120, {align: "right"})
            doc.image('./images/clickstamper_R.png', 490, 110,  {width: 50, align: "right"})
            doc.rect(60,167,250,20)
            .lineWidth(20)
            .stroke('#b4b4b4')
            
            doc.fontSize(10)
            .text('下記の通り領収しました', 50, 140)
            
            doc.fontSize(15)
            
            doc.text('ご請求金額', 50, 170)
            
            let kingaku = event.kingaku + "円";
            doc.text(kingaku, 200, 170)
            
            doc.rect(50,220,500,500)
            .lineWidth(1)
            .stroke('#b4b4b4')
            
            doc.fontSize(10)
            
            doc.text('品番・品名', 51, 230)
                .stroke()
            
            doc.text('単価', 251, 230)
                .stroke()
            
            doc.text('数量', 351, 230)
                .stroke()
            
            doc.text('金額', 451, 230)
                .stroke()
            
            let row_origin = 260;//商品名
            doc.moveTo(50,250)
            .lineTo(550,250)
            .stroke('#b4b4b4')

            if(record.dynamodb.NewImage.count > 0){
            
                for(let i = 0; i < record.dynamodb.NewImage.count; i++){
                    doc.text(record.dynamodb.NewImage.Items[i].name, 51, row_origin)
                        .stroke()
                    
                    doc.text(record.dynamodb.NewImage.Items[i].tanka, 251, row_origin)
                        .stroke()
                    
                    doc.text(record.dynamodb.NewImage.Items[i].amount, 351, row_origin)
                        .stroke()
                    
                    doc.text(record.dynamodb.NewImage.Items[i].kingaku, 451, row_origin)
                        .stroke()

                    row_origin = row_origin + 20;
                    doc.moveTo(50,row_origin)
                    .lineTo(550,row_origin)
                    .stroke('#b4b4b4')
                }
            }
            
            //Finalize PDF file
            doc.end();
        
            let fileInfo = {
                fileDir: fileDir,
                filename: filename
            }
            resolve(fileInfo);
        });
        console.log(promise);
        const checkFile = yield new Promise(function(resolve, reject){
            
            var cmd = "ls -lah /tmp/"; //ここを変更する
            var child = exec(cmd, function(error, stdout, stderr) {
                if (!error) {
                    console.log('standard out: ' + stdout);
                    console.log('standard error: ' + stderr);
                    resolve(stdout);
                } else {
                    console.log("error code: " + err.code + "err: " + err);
                    resolve(stdout);
                }
            });
        })
        const fileData = yield new Promise(function(resolve, reject){
            setTimeout(function(){
                resolve(fs.readFileSync(fileDir));
            }, 100);
        });
        const fileUpload = yield new Promise(function(resolve, reject){
            
            var params = {
                Body: fileData,//data, 
                Bucket: "kvitanco.invoice.data", 
                Key: filename, 
                //ServerSideEncryption: "AES256", 
                //StorageClass: "STANDARD_IA"
            };
            console.log(params);
            // const upload = await Promise(function(){
            s3.putObject(params, function(err, data) {
                
                if (err) { reject(err);}// an error occurred
                else     {
                    console.log(data);
                    console.log(record.dynamodb.NewImage)
                //snssend(filename, record.dynamodb.Keys.id, record.dynamodb.NewImage.phone);

                switch(record.dynamodb.NewImage.method){
                    case 'sms':
                        var params_sns = {
                            Message: '領収証の発行準備が整いました。' + "https://invoice.kvitanco.biz/confirm/" + record.dynamodb.NewImage.id.S + "/", 
                            PhoneNumber: '+81' + parseInt(record.dynamodb.NewImage.phone.S).toString(),
                            Subject: '領収証発行サービスkvitancoからのお知らせ'
                        };
                        sns.publish(params_sns, function(err, data){
                            if(err){ throw err; }
                            console.log(data);
                            var param1 = {
                                ExpressionAttributeNames: {
                                "#Y": "smsStatus"
                                }, 
                                ExpressionAttributeValues: {
                                ":y": {
                                    S: filename
                                }
                                }, 
                                Key: { 
                                "id": {
                                    S: record.dynamodb.Keys.id
                                }
                                }, 
                                TableName: "InvoiceData-gfglar3thfeapcqr4ytskpf23a", 
                                UpdateExpression: "SET #Y = :y"
                                };
                            dynamodb.updateItem(param1, function(err, data) {
                                if (err) reject(err); // an error occurred
                                else     resolve(data);  
                            })
                        })
                        break;
                    case 'email':
                        var params = {
                            Destination: {
                                ToAddresses: [
                                    record.dynamodb.NewImage.email
                                ]
                            }, 
                            Message: {
                            Body: {
                            /*Html: {
                            Charset: "UTF-8", 
                            Data: "This message body contains HTML formatting. It can, for example, contain links like this one: <a class=\"ulink\" href=\"http://docs.aws.amazon.com/ses/latest/DeveloperGuide\" target=\"_blank\">Amazon SES Developer Guide</a>."
                            }, */
                            Text: {
                                Charset: "UTF-8", 
                                Data: "領収証の発行準備が整いました。" + "https://invoice.kvitanco.biz/confirm/" + record.dynamodb.NewImage.id.S + "/よりダウンロードしてください。"
                            }
                            }, 
                            Subject: {
                            Charset: "UTF-8", 
                            Data: "領収証発送代行「kvitancoInvoice」からのお知らせ"
                            }
                            }, 
                            ReplyToAddresses: [
                                "info@kvitanco.biz"
                            ], 
                            Source: "invoice@kvitanco.biz"
                        };
                        ses.sendEmail(params, function(err, data) {
                            if (err) console.log(err, err.stack); // an error occurred
                            else     console.log(data);           // successful response
                            if(err){ throw err; }
                            console.log(data);
                            var param1 = {
                                ExpressionAttributeNames: {
                                "#Y": "smsStatus"
                                }, 
                                ExpressionAttributeValues: {
                                ":y": {
                                    S: filename
                                }
                                }, 
                                Key: { 
                                "id": {
                                    S: record.dynamodb.Keys.id
                                }
                                }, 
                                TableName: "InvoiceData-gfglar3thfeapcqr4ytskpf23a", 
                                UpdateExpression: "SET #Y = :y"
                                };
                            dynamodb.updateItem(param1, function(err, data) {
                                if (err) reject(err); // an error occurred
                                else     resolve(data);  
                            })
                        });
                        break;
                } //end of switch method
                } //end of S3 method
            });
        });    
    }
    
});
}
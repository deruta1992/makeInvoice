const PDFDocument = require('pdfkit');
const fs = require('fs');
const AWS = require('aws-sdk');
const s3 = new AWS.S3({"api-version": "2006-03-01"});
const sns = new AWS.SNS({
    apiVersion: '2010-03-31',
    region: 'ap-northeast-1'
});
const dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

const async = require('async');

exports.handler = (event, context, callback) => {
    //
    function snssend(filename, recordkey, phone){
        var params_sns = {
            Message: '領収証の発行準備が整いました。' + "https://invoice.kvitanco.biz/?invoiceid=" + recordkey, /* required */
            PhoneNumber: '+81' + parseInt(phone).toString(),
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
                    S: recordkey
                }
                }, 
                TableName: "InvoiceData-gfglar3thfeapcqr4ytskpf23a", 
                UpdateExpression: "SET #Y = :y"
                };
            dynamodb.updateItem(param1, function(err, data) {
                if (err) console.log(err, err.stack); // an error occurred
                else     console.log(data);  
                callback(data);
            })
        })
    }

    function uploadPDF(filename, fileDir){
                    
        fs.readFileSync(fileDir,{}, function(err, data){
            var params = {
                Body: data, 
                Bucket: "kvitanco.invoice", 
                Key: filename, 
                ServerSideEncryption: "AES256", 
                StorageClass: "STANDARD_IA"
            };
            console.log(params);
            s3.putObject(params, function(err, data) {
                if (err) {console.log(err, err.stack); throw err;}// an error occurred
                else     {
                    console.log(data);
                    snssend(filename, record.dynamodb.Keys.id, record.dynamodb.NewImage.phone);
                }        // successful response
            });
        })
    }
        function createPDFDoc(event, record){

            console.log(JSON.stringify(event));
            //Create a document
            doc = new PDFDocument
            let filename = Date.now().toString() + '_' + (Math.random(5) * 10).toString() + '.pdf';
            console.log(filename);
            //let fileDir = filename;
            let fileDir = '/tmp/' + filename;
            doc.pipe(fs.createWriteStream(fileDir))
            
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
            console.log(company)
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
            
            for(let i = 0; i < 3; i++){
                doc.text('研究設備', 51, row_origin)
                    .stroke()
                
                doc.text('¥200,000,000', 251, row_origin)
                    .stroke()
                
                doc.text('一式', 351, row_origin)
                    .stroke()
                
                doc.text('¥200,000,000', 451, row_origin)
                    .stroke()

                row_origin = row_origin + 20;
                doc.moveTo(50,row_origin)
                .lineTo(550,row_origin)
                .stroke('#b4b4b4')
            }
            //Finalize PDF file
            doc.end();
        
            uploadPDF(filename, fileDir);
        }
    //
    event.Records.forEach((record) => {
        console.log('Stream record: ', JSON.stringify(record, null, 2));
        
        if (record.eventName == 'INSERT') {
 //           async.waterfall([
                createPDFDoc(event, record);
//            ]);
        }
    });
    callback(null, `Successfully processed ${event.Records.length} records.`);
    
}
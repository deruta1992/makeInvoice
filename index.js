const PDFDocument = require('pdfkit');
const fs = require('fs');
const AWS = require('aws-sdk');
const s3 = new AWS.S3({"api-version": "2006-03-01"});

const async = require('async');
exports.handler = (event, context, callback) => {
    async.waterfall([
        function createPDFDoc(event){
            //Create a document
            doc = new PDFDocument
            let filename = '領収証' + Math.random(5) + '.pdf';
            console.log(filename);
            doc.pipe(fs.createWriteStream(filename))
            
            doc.fontSize(30)
            
            doc.font('./font/GenShinGothic-Medium.ttf')
            .text('領収書', 50, 10)
            
            doc.rect(170,30,380,5)
            .lineWidth(5)
            .stroke('#b4b4b4')
            
            doc.fontSize(15)
            doc.fillColor("black")
        
            let company = event.company;
            let atena = event.name;
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
            doc.text('Kvitanco', 50, 100, {align: "right"})
            doc.text('東京都品川区北品川1-9-7', 50, 120, {align: "right"})
            doc.image('./images/clickstamper_R.png', 490, 110,  {width: 50, align: "right"})
            doc.rect(60,167,250,20)
            .lineWidth(20)
            .stroke('#b4b4b4')
            
            doc.fontSize(10)
            .text('下記の通りご請求申し上げます', 50, 140)
            
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
        
            return (doc,filename);
        },
        function uploadPDF(generated_pdf, filename){
            var params = {
                Body: generated_pdf, 
                Bucket: "kvitanco.invoice", 
                Key: filename, 
                ServerSideEncryption: "AES256", 
                StorageClass: "STANDARD_IA"
            };
            s3.putObject(params, function(err, data) {
                if (err) {console.log(err, err.stack); throw err;}// an error occurred
                else     {console.log(data); return params;   }        // successful response
            });
        }
        //最後の通知の部分はs3のアップロードをトリガーにして実行するようにする
    ]);
}
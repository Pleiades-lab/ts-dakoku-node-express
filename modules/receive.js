"use strict";

let auth = require("./slack-salesforce-auth"),
    force = require("./force"),
    ts = require("./ts"),
    VERIFICATION_TOKEN = process.env.VERIFICATION_TOKEN;

exports.execute = (req, res) => {
    
    // ../node_modules/botkit/lib/SlackBot.jsを参考
    var payload = req.body;
    var payloadactions;
    if (payload.payload) {
        payload = JSON.parse(payload.payload);
    }

    if (payload.token != VERIFICATION_TOKEN) {
        console.log("Invalid token");
        res.send("Invalid token");
        return;
    }
    let slackUserId = payload.user.id;

    //payload.callback_idにアクションで設定したIDが入る
    if(payload.callback_id == 'ts1'){ //ts.js のボタンアクションにふったID
        var params = {};
        params.method = 'PUT'; // @Httpputを呼び出すのでPUT
        var bodys = {}; //パラメータを渡す場合は連想配列にして渡す必要がある
        // payload.actions[0].name に押したボタンのnameが入っている
        if(payload.actions[0].name == 'attend'){//出勤ボタン
            bodys.attendance = 1; //出勤ボタンを押した場合は attendance: 1 として送信
        }else if(payload.actions[0].name == 'leave'){
            bodys.attendance = 0; //退勤ボタンを押した場合は attendance: 0 として送信
        }else if(payload.actions[0].name == 'cancel'){//キャンセルボタンを押した場合は、その旨をslackで通知して終了
            res.send("キャンセルしました");
            return;
        }
        params.body = bodys; //bodyに作った連想配列を追加

        //実行 
        auth.getOAuthObject(slackUserId).then((oauthObj) => getTSButtonReturn(oauthObj,params,req,res,slackUserId));
    }else{
        //違うcallback_idによる処理を入れる場合は新しいfunction作って追加する
        //auth.getOAuthObject(slackUserId).then((oauthObj) => anotherFunction(oauthObj,params,req,res,slackUserId));
    }
};

function getTSButtonReturn(oauthObj,params,req,res,slackUserId){
    return new Promise(resolve => {
        force.apexrest(oauthObj,'Dakoku',params)
        .then(data => {
            if(data == 'OK'){ // dataにこちらのレスポンス( OK or NG)が入る https://github.com/ngs/ts-dakoku/blob/8582bff49165692f7a4a0979b20bf62449662c88/apex/src/classes/TSTimeTableAPIController.cls#L32
                resolve(res.json({text: '打刻完了 :smile:'}));
            }else{
                resolve(res.json({text: '打刻失敗 :scream: もう一度 /ts コマンドを打ってやり直してください'}));                
            }
        })
        .catch(error => {
            if (error.code == 401) {
                resolve(res.send(`Visit this URL to login to Salesforce: https://${req.hostname}/login/` + slackUserId));
            } else {
                resolve(res.send("An error as occurred"));
            }
        });
    });
}
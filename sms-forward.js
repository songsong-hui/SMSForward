/*
脚本: SMSForward
作者: songsong
版本: 2.2.0
仓库: https://github.com/ChinaTelecomOperators/SMSForward
*/

const version = 'v2.2.0';
const name = 'SMSForward';
const key = '@smsforward';
const key1 = '@smsforward1';
var config, config1;

const num = $prefs.valueForKey(key) || "";
const num1 = $prefs.valueForKey(key1) || "";

if (num) {
    config = JSON.parse($prefs.valueForKey(key + '_config'));
    if (config.enable) {
        forward(config, num);
    }
}

if (num1) {
    config1 = JSON.parse($prefs.valueForKey(key1 + '_config'));
    if (config1.enable) {
        forward(config1, num1);
    }
}

$done();

function forward(config, num) {
    const url = 'https://sms.forward.cat/v'
    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
    }
    const data = `type=${config.type}&num=${num}`;

    $httpClient.post({
        url: url,
        headers: headers,
        body: data
    }, (error, response, res) => {
        if (error) {
            console.log(error);
            return;
        }

        const data = JSON.parse(res);
        if (data.success) {
            let info = data.info;
            let from = info.from;
            let text = info.text;

            if (filter(config, from, text)) {
                let code = getCode(config, text);
                gotify(config, from, text, code);
            }
        }
    });
}

function filter(config, from, text) {
    let sender_allow = config.sender_allow;
    let sender_deny = config.sender_deny;
    let text_allow = config.text_allow;
    let text_deny = config.text_deny;

    if (sender_allow) {
        let allow = sender_allow.split('\n');
        let pass = false;
        for (let i = 0; i < allow.length; i++) {
            if (new RegExp(allow[i]).test(from)) {
                pass = true;
                break;
            }
        }
        if (!pass) return false;
    }

    if (sender_deny) {
        let deny = sender_deny.split('\n');
        for (let i = 0; i < deny.length; i++) {
            if (new RegExp(deny[i]).test(from)) {
                return false;
            }
        }
    }

    if (text_allow) {
        let allow = text_allow.split('\n');
        let pass = false;
        for (let i = 0; i < allow.length; i++) {
            if (new RegExp(allow[i]).test(text)) {
                pass = true;
                break;
            }
        }
        if (!pass) return false;
    }

    if (text_deny) {
        let deny = text_deny.split('\n');
        for (let i = 0; i < deny.length; i++) {
            if (new RegExp(deny[i]).test(text)) {
                return false;
            }
        }
    }

    return true;
}

function getCode(config, text) {
    let code_test = config.code_test;
    let code_get = config.code_get;

    if (new RegExp(code_test).test(text)) {
        let code = text.match(new RegExp(code_get));
        if (code) {
            return code[0];
        }
    }
    return '';
}

function gotify(config, from, text, code) {
    let name_from = config.name_from;
    let name_diy = config.name_diy;
    let gotify_title = config.gotify_title;
    let gotify_subtitle = config.gotify_subtitle;
    let gotify_msg = config.gotify_msg;

    let name = name_from === 'name' ? from : name_diy;
    let title = gotify_title.replace(/\$name\$/g, name).replace(/\$text\$/g, text).replace(/\$code\$/g, code);
    let subtitle = gotify_subtitle.replace(/\$name\$/g, name).replace(/\$text\$/g, text).replace(/\$code\$/g, code);
    let msg = gotify_msg.replace(/\$name\$/g, name).replace(/\$text\$/g, text).replace(/\$code\$/g, code);

    // bark
    if (config.bark_url) {
        $httpClient.post({
            url: config.bark_url,
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify({
                title: title,
                body: msg,
                group: 'smsforward',
                ...subtitle && { subTitle: subtitle }
            })
        }, (error, response, data) => {
            if (!error) {
                console.log('Bark 推送成功');
            }
        });
    }

    // pushdeer
    if (config.pushdeer_url) {
        $httpClient.post({
            url: config.pushdeer_url,
            body: {
                pushkey: config.pushdeer_url.split('/').pop(),
                text: title,
                desp: msg,
                type: 'markdown'
            }
        }, (error, response, data) => {
            if (!error) {
                console.log('PushDeer 推送成功');
            }
        });
    }

    // pushplus
    if (config.pushplus_url) {
        $httpClient.post({
            url: config.pushplus_url,
            body: {
                token: config.pushplus_url.split('/').pop(),
                title: title,
                content: msg,
                template: 'markdown'
            }
        }, (error, response, data) => {
            if (!error) {
                console.log('PushPlus 推送成功');
            }
        });
    }

    // telegram
    if (config.telegram_url) {
        $httpClient.post({
            url: config.telegram_url,
            body: {
                chat_id: new URL(config.telegram_url).searchParams.get('chat_id'),
                text: `*${title}*\n\n${msg}`,
                parse_mode: 'Markdown'
            }
        }, (error, response, data) => {
            if (!error) {
                console.log('Telegram 推送成功');
            }
        });
    }

    // gotify
    if (config.gotify_url) {
        $httpClient.post({
            url: config.gotify_url,
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify({
                title: title,
                message: msg,
                priority: 5
            })
        }, (error, response, data) => {
            if (!error) {
                console.log('Gotify 推送成功');
            }
        });
    }

    // igot
    if (config.igotor_url) {
        $httpClient.post({
            url: config.igotor_url,
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify({
                title: title,
                content: msg,
                url: ''
            })
        }, (error, response, data) => {
            if (!error) {
                console.log('iGot 推送成功');
            }
        });
    }
    
    // ==================== 新增自定义 Webhook 推送逻辑 开始 ====================
    if (config.custom_webhook_url) {
        const webhook_url = config.custom_webhook_url;
        const webhook_method = config.custom_webhook_method || 'POST';
        const webhook_headers_str = config.custom_webhook_headers || '{}';
        const webhook_body_template = config.custom_webhook_body || '{}';

        // 替换body中的变量
        const webhook_body_processed = webhook_body_template
            .replace(/\$name\$/g, JSON.stringify(name).slice(1, -1)) // 处理JSON字符串中的特殊字符
            .replace(/\$text\$/g, JSON.stringify(text).slice(1, -1))
            .replace(/\$code\$/g, JSON.stringify(code).slice(1, -1));

        let webhook_headers;
        try {
            webhook_headers = JSON.parse(webhook_headers_str);
        } catch (e) {
            console.log('自定义Webhook请求头 (Headers) 格式错误, 请检查JSON格式: ' + e);
            webhook_headers = { 'Content-Type': 'application/json' }; // 格式错误时使用默认值
        }
        
        const request_config = {
            url: webhook_url,
            headers: webhook_headers,
            body: webhook_body_processed
        };

        const callback = (error, response, data) => {
            if (error) {
                console.log('自定义Webhook 推送失败: ' + error);
            } else {
                if (response.statusCode === 200 || response.statusCode === 201) {
                    console.log('自定义Webhook 推送成功');
                } else {
                    console.log(`自定义Webhook 推送返回异常状态码: ${response.statusCode}`);
                }
            }
        };

        if (webhook_method.toUpperCase() === 'POST') {
            $httpClient.post(request_config, callback);
        } else if (webhook_method.toUpperCase() === 'GET') {
            // 对于GET请求，通常不发送body，但此处为保持灵活性，URL可能已包含参数
            delete request_config.body;
            $httpClient.get(request_config, callback);
        } else {
             console.log(`不支持的自定义Webhook请求方法: ${webhook_method}`);
        }
    }
    // ==================== 新增自定义 Webhook 推送逻辑 结束 ====================

}

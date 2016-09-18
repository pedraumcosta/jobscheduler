var dynamo    = require('./dynamo');
var jobModule = require('./jobModule')

console.log('Carregando o JobRestService ...');

/**
 * Recebe eventos vindo do API Gateway, isto e, 
 * REST requests, com os seguintes dados nas keys:
 *
 *   - operation: uma operacao REST
 *   - payload: objeto usado na dada operacao
 */
exports.RESTHandler = function(event, context, callback) {
    console.log('Recebi um evento:', JSON.stringify(event, null, 2));

    var operation = event.operation;
    var payload   = event.payload;

    switch (operation) {
        case 'schedule':
            dynamo.addJob(payload, function(err,data) {
                if (err) {
                    //retorna erro 500
                    console.log('Erro ao chamar a op /schedule');
                    callback('Erro ao chamar a op /schedule' + err);
                } else {
                    var objResposta = {
                        "status": "OK",
                        "mensagem": "Job agendado com sucesso"
                    }
                    callback(null, objResposta);
                }
            });
            break;
        case 'list':
            dynamo.getJobs(function(err, jobs) {
                if (err) {
                    //retorna erro 500
                    console.log('Erro ao chamar a op /list');
                    callback('Erro ao chamar a op /list' + err);
                } else {
                    callback(null, jobs);
                }
            });
            break;
        case 'status':
            dynamo.getJobStatus(payload.imageName, payload.dateToRun, function(err, job) {
                if (err) {
                    //retorna erro 500
                    console.log('Erro ao chamar a op /status');
                    callback('Erro ao chamar a op /status' + err);
                } else {
                    callback(null, job);
                }
            });
            break;
        case 'callback':
            dynamo.getJob(payload.imageName, payload.dateToRun, function(err, data) {
                jobModule.jobFinishedCallback(function callbackForCallbackRequest() {
                    var objResposta = {
                        "status": "OK",
                        "mensagem": "Finalização do Job requisitada"
                    }
                    callback(null, objResposta);
                }, err, data);
            });
            break;
        default:
            callback('Operação desconhecida: ${operation}');
    }
};

// var obj = {
//     "operation": "callback",
//     "payload": {
//         "dateToRun": "2016-09-06T19:22:48.986Z",
//         "imageName": "ubuntu"
//     }
// };

// exports.RESTHandler(obj,null, function (err, data) {
//     if (err) console.log(err);
//     else console.log(data, null, 2);
// });
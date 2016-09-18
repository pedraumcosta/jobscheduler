var moment    = require('moment');
var jobModule = require('./jobModule');

console.log('Carregando o eventReceiver ...');

/*
 * Funcao que lida com o recebimento de eventos de uma regra que os emite em um determinado 
 * intervalo de tempo.
 */
exports.handler = function(event, context) {
    console.log('Recebi uma notificação de evento');
    //console.log('Evento:', JSON.stringify(event, null, 2));
    
    //console.log('Agora são: ' + event.time);

    var dateAsMoment = moment(event.time);

    //console.log('Data convertida do moment: ' + dateAsMoment.format('YYYY-MM-DD HH:mm Z'));    

    jobModule.processScheduledJobs(dateAsMoment, context);

    jobModule.processFinishedJobs(context);

    jobModule.processRequestedJobs(context);

};

// var event = {
//     "version": "0",
//     "id": "95ee7a84-f41f-4116-8873-a16432e72d33",
//     "detail-type": "Scheduled Event",
//     "source": "aws.events",
//     "account": "381247262190",
//     "time": "2016-09-18T18:47:00Z",
//     "region": "us-west-2",
//     "resources": [
//         "arn:aws:events:us-west-2:381247262190:rule/OneMinuteRule"
//     ],
//     "detail": {}
// }

// exports.handler(event, null);
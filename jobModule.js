var moment = require('moment');
var async  = require('async');
var dynamo = require('./dynamo');
var ec2    = require('./ec2');

/*
 * Evoca a finalizacao da instancia de um dado job e aplica o callback.
 */
function terminateJobInstance(job, asyncCallback, callback) {
    //vamos terminá-la
    instanceArray = [];
    instanceArray.push(job.instanceId);

    ec2.terminateEC2Instance(instanceArray, function(err, data) {
        callback(job, asyncCallback, err, data);
    });
}

/*
 * Esse callback para uma finalizacao de instancia atualiza o status do job 
 * para Terminated.
 */
function terminateInstanceCallbackChangingStatus(job, callback, err, data) {
    //console.log(this.request.httpRequest);
    if (err) { 
        console.log("Nao consegui terminar a instancia", err);
        callback();  
    } else {
        console.log('Instancia do Job ' + job.imageName + ' de data ' + job.dateToRun + ' extinta\n');                    

        //prepare new status
        var newStatus;
        if (job.jobStatus == 'FinishedOK') {
            newStatus = 'TerminatedOK';
        } else if (job.jobStatus == 'FinishedNOK') {
            newStatus = 'TerminatedNOK'
        }
        
        dynamo.changeJobStatus(job.imageName, job.dateToRun, newStatus, function(err, data) {
            if (err) {
                console.log('Erro ao mudar status para Terminated: ' + err);
            }
            callback();
        });
    }
}

/*
 * Inspeciona a requisicao de instancia e aplica um callback.
 */
function inspectSpotInstanceRequest(job, asyncCallback, callback) {
    ec2.describeSpotInstanceRequest(job.spotInstanceRequestId, function(err, data) {
        callback(job, asyncCallback, err, data);
    });
}

/*
 * Esse callback para uma finalizacao de instancia atualiza o status do job 
 * para Terminated e o valor da instanceId.
 */
function terminateInstanceCallbackChangingStatusAndInstanceId(job, callback, err, data) {
    if (err) {
        console.log("Nao consegui terminar a instancia", err);
        callback(); 
    } else {
        console.log('Instancia do Job ' + job.imageName + ' de data ' + job.dateToRun + ' extinta\n');                    

        //prepare new status
        var newStatus;
        if (job.jobStatus == 'FinishedOK') {
            newStatus = 'TerminatedOK';
        } else if (job.jobStatus == 'FinishedNOK') {
            newStatus = 'TerminatedNOK'
        }

        dynamo.changeJobStatusAndSetInstanceId(job.imageName, job.dateToRun, 
                                               newStatus, job.instanceId,
                                               function(err, data) {
            if (err) {
                console.log('Erro ao mudar status para Terminated: ' + err);
            }
            callback();
        });  
    }
}

/*
 * Esse callback para uma requisição de instancia atualiza a instanceId no job
 * e aciona a finalicação da instancia..
 */
function inspectRequestInstanceCallback(job, callback, err, data) {
    if (err) {
        console.log('Erro ao consultar spot request: ' + err);
        callback();
    } else {
        //console.log('Resposta: ' + JSON.stringify(data, null, 2));
        if (data && data.SpotInstanceRequests[0] && data.SpotInstanceRequests[0].InstanceId) {
            var instanceId = data.SpotInstanceRequests[0].InstanceId;
            job.instanceId = instanceId;
            console.log('Code: ' + data.SpotInstanceRequests[0].Status.Code + ' InstanceId: ' + instanceId);

            terminateJobInstance(job, callback, terminateInstanceCallbackChangingStatusAndInstanceId);
        } else {
            callback();
        }
    }
}

/*
 * Percorre a lista de jobs finalizados, se houver a instanceId do job, finalizado
 * a intancia, se nao houver, vou buscar esse id na requsicao de instancia.
 */
function jobsFinishedCallback(context, err, data) {
    if (err) {
        console.log('Erro ao buscar jobs finalizados: ' + err);
        if (context != null) {
            context.succeed('Ready');
        }
    } else {
        //vamos inspecionar todos os jobs
        async.each(data, function(job, callback) {
            if (job.instanceId != null) {//se eu já sei a instância

                //termina a instancia com o devido job
                terminateJobInstance(job, callback, terminateInstanceCallbackChangingStatus);

            } else { //se eu ainda naum tenho a instancia, preciso pegá-la com a requisicao da instancia
                //console.log('O job finalizado nao tem instanceId, temos que olhar a requisicao');
                inspectSpotInstanceRequest(job, callback, inspectRequestInstanceCallback);
            }
        }, function(err) {
            if (context != null) {
                context.succeed('Ready');
            }            
        });
    }
}

function jobFinishedCallback(callback, err, data) {
    if (err) {
        console.log('Erro ao buscar job finalizado: ' + err);
        callback();
    } else {
        var job = data;
        //vamos inspecionar o job
        if (job && job.jobStatus != 'TerminatedOK' && job.jobStatus != 'TerminatedNOK') {
            if (job.instanceId != null) {//se eu já sei a instância

                //termina a instancia com o devido job
                terminateJobInstance(job, callback, terminateInstanceCallbackChangingStatus);

            } else { //se eu ainda naum tenho a instancia, preciso pegá-la com a requisicao da instancia
                console.log('O job finalizado nao tem instanceId, temos que olhar a requisicao');
                inspectSpotInstanceRequest(job, callback, inspectRequestInstanceCallback);
            }
        } else {
            callback();
        }
    }
}

/*Percorre a lista de jobs que foram requisitados e inspeciona a requsicao da Spot Instance
 *para executá-lo, passsando o callback de verificação de cancelamento..  
 */
function jobsRequestedCallback(context, err, data) {
    if (err) {
        console.log('Erro ao buscar jobs pedidos: ' + err);
        if (context != null) {
            context.succeed('Ready');
        }
    } else {
        //vamos inspecionar todos os jobs
        async.forEach(data, function(job, callback) {
            if (job.spotInstanceRequestId != null) {//se eu tenho uma requisicao, vou consulta-la
                // a requisicao da instancia
                inspectSpotInstanceRequest(job, callback, checkIfClosedCallback);
            }
        }, function(err) {
            if (context != null) {
                context.succeed('Ready');
            }            
        });
    }
}

/*Callback de verificação de cancelamento de um requisicao de instancia
 *Se o status for closed, relanca a requisicao.
 *Se o status for ativo, atualiza a instanceId no Job para permitir futuras manipulacoes  
 */
function checkIfClosedCallback(job, callback, err, data) {
    if (err) {
        console.log('Erro ao consultar spot request: ' + JSON.stringify(err, null, 2));
        callback();
    } else {
        //console.log('Resposta: ' + JSON.stringify(data, null, 2));
        var state = data.SpotInstanceRequests[0].State;
        console.log('Code: ' + data.SpotInstanceRequests[0].Status.Code + ' State: ' + state);
        if (state == 'closed') { //se a requisicao foi cancelada devemos relanca-la
            requestJobInstance(job, callback, requestInstanceCallbackChangingStatusAndInstanceRequestId);
        } else if (state == 'active' && job.instanceId == null) { //a requisicao foi aceita, vamos aproveitar e atualiar as instancesId
            dynamo.setInstanceId(job.imageName, job.dateToRun, 
                                 data.SpotInstanceRequests[0].InstanceId, function(err, data) {
                if (err) {
                    console.log('Erro ao definir instanceId: ' + err);
                }

                callback();
            });             
        }
    }
}

/*
 * Requisita uma instancia para o dado job e aplica o callback.
 */
function requestJobInstance(job, asyncCallback, callback) {

    //lanca a requisicao de instancia instancia com o devido job
    ec2.requestSpotInstance(job.imageName, job.dateToRun, 
                            job.environmentVariablesList, function(err, data) {
       callback(job, asyncCallback, err, data);
    });
}

/*
 * Esse callback para um requisição de instancia atualiza o status do job 
 * para Requested e o valor da requsicao de spot instance.
 */
function requestInstanceCallbackChangingStatusAndInstanceRequestId(job, callback, err, data) {
    //console.log(this.request.httpRequest);

    if (err) { 
        console.log("Nao consegui fazer a requisicao de instancia", err);
        callback();
    } else {
        var spotInstanceRequestId = data.SpotInstanceRequests[0].SpotInstanceRequestId
        console.log("Criei a requisicao de instancia " + spotInstanceRequestId + 
                    " para o Job " + job.imageName + " de data " + job.dateToRun);

        dynamo.changeJobStatusAndSetSpotInstanceRequest(job.imageName, job.dateToRun, 
                                                        'Requested', spotInstanceRequestId, 
                                                        function(err, data) {
            if (err) {
                console.log('Erro ao mudar status para Requested: ' + err);
            }

            callback();
        });
    }
}

/*Percorre a lista de jobs que foram agendados e requisita uma Spot Instance
 *para executá-lo. Os parametros e detalhes do job estão no proprio JSON
 *do job.  
 */
function jobScheduledCallback(dateNow, context, err, data) {
    if (err) {
        console.log('Erro ao buscar jobs agendados: ' + err);
        if (context != null) 
            context.succeed('Ready');
    } else {
        //e lança-los, um de cada vez
        async.each(data, function(job, callback) {
            
            //console.log('O job: ' + job.imageName + ' ' + job.dateToRun + ' de status ' + job.jobStatus + ' vai ser inspecionado');
            var jobDate = moment(job.dateToRun);
            //console.log('Data as moment ' + jobDate.format('YYYY-MM-DD HH:mm Z'));
            
            //se a data de rodar jah chegou
            if (dateNow.isAfter(jobDate)) {
                //console.log('Agora estamos a frente do Job, por isso vamos executá-lo\n');
                requestJobInstance(job, callback, requestInstanceCallbackChangingStatusAndInstanceRequestId);
            } else {
                console.log('Data do Job ' + job.imageName + ' de data ' + job.dateToRun + ' ainda não chegou\n');
                callback();
            }
        }, function(err) {
            if (context != null)
                context.succeed('Ready');
        });
    }
}

/*
 * Processa os jobs finalizados, vou busca-los no banco e finalizar suas intancias
 * atualiando as informações dos jobs no banco
 */
function processFinishedJobs(context) {
    //vamos trazer os jobs com status de finalizado OK e finaliar suas instancias
    dynamo.getJobsWithStatus('FinishedOK', function (err, data) {
        jobsFinishedCallback(context, err, data);
    });

    //vamos trazer os jobs com status de finalizado nao OK e finaliar suas instancias
    dynamo.getJobsWithStatus('FinishedNOK', function (err, data) {
        jobsFinishedCallback(context, err, data);
    });
}

/*
 * Processa os jobs requisitados, ou seja, com instancias requisitadas
 */
function processRequestedJobs(context) {
    //temos que ver se a request morreu e re-lançar, eventualmente atualizar 
    //a instanceId caso o job seja disparado
    dynamo.getJobsWithStatus('Requested', function(err, data) {
        jobsRequestedCallback(context, err, data);
    });
}

/*
 * Processa os jobs ue foram agendados de acordo com a data corrente.
 */
function processScheduledJobs(currentDateAsMoment, context) {
    //vamos trazer os jobs com status agendado e lancar suas instancias
    dynamo.getJobsWithStatus('Scheduled', function(err, data) {
        jobScheduledCallback(currentDateAsMoment, context, err, data);
    });
}

module.exports = {
    processFinishedJobs,
    processScheduledJobs,
    processRequestedJobs,
    jobFinishedCallback
}
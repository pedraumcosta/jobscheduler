var AWS = require("aws-sdk");

AWS.config.update({
  region: "us-west-2"
});

AWS.config.dynamodb = {
    endpoint: "https://dynamodb.us-west-2.amazonaws.com"
}


var dynamodb = new AWS.DynamoDB();
var docClient = new AWS.DynamoDB.DocumentClient();

var createParams = {
    TableName : "Jobs",
    KeySchema: [       
        { AttributeName: "imageName", KeyType: "HASH"},  //Partition key
        { AttributeName: "dateToRun", KeyType: "RANGE" }  //Sort key
    ],
    AttributeDefinitions: [       
        { AttributeName: "imageName",     AttributeType: "S" },
        { AttributeName: "dateToRun",     AttributeType: "S" }
    ],
    ProvisionedThroughput: {       
        ReadCapacityUnits: 10, 
        WriteCapacityUnits: 10
    }
};

function initJobScheduleTables(callback) {
    const params = {
        TableName: 'Jobs'
    };

    dynamodb.describeTable(params, function(err, data) {

        if (err) {
            
            if (err.code == 'ResourceNotFoundException') {// se a tabela não existe
                console.log('Tabela de Jobs inexistente no Dynamo');
                //vamos criar a tabela do dynamo
                    dynamodb.createTable(createParams, function(err, data) {
                    if (err) {
                        console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
                        callback(err);
                    } else {
                        console.log("Created table.");

                        dynamodb.waitFor('tableExists', params, function(err, data) {
                            if (err)  {
                                console.log(err, err.stack); // an error occurred
                                callback(err);
                            }
                            else {
                                //console.log(data);
                                callback(null);
                            }
                        });
                    }
                });
            } else { //ocorreu um erro que não é a tabela nao existe
                callback(err);
            }
        }
        else { //tabela já existe   
            //console.log(data);
            callback(null);
        }
    });
}

function addJob(job, callback) {

    //define o valor para agendado
    job.jobStatus = 'Scheduled';

    var params = {
        TableName: "Jobs",
        Item: job
    };

    docClient.put(params, function(err, data) {
        if (err) {
            console.log('Erro ao adicionar job: ' + err);
            callback('Erro ao adicionar job');
        } else {
            callback(null, data);
        }
    });
}

function getJob(imageName, dateToRun, callback) {
    var table = "Jobs";
    var params = {
        TableName: table,
        Key:{
            "imageName": imageName,
            "dateToRun": dateToRun
        }
    };

    docClient.get(params, function(err, data) {
        callback(err, data.Item);    
    });
}

function getJobStatus(imageName, dateToRun, callback) {
    getJob(imageName, dateToRun, function(err, job) {
        if (job != null) {
            //console.log("getJobStatus:", JSON.stringify(job, null, 2));
            callback(err, job);
        } else {
            callback('Job não encontrado', null);
        } 
    });
}

function changeJobStatus(imageName, dateToRun, status, callback) {
    var table = "Jobs";
    var params = {
        TableName: table,
        Key:{
            "imageName": imageName,
            "dateToRun": dateToRun
        },
        UpdateExpression: "set jobStatus = :r",
        ConditionExpression: "imageName = :im and dateToRun = :date",
        ExpressionAttributeValues:{
            ":r":status,
            ':im': imageName,
            ':date': dateToRun
        },
        ReturnValues:"UPDATED_NEW"
        };

    docClient.update(params, function(err, data) {
        //console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
        if (data == null) {
            callback('Mudança de status falhou ou não existe esse Job', null);
        } else {
            callback(err, data.Attributes);
        }    
    });
}

function changeJobStatusAndSetInstanceId(imageName, dateToRun, status, instanceId, callback) {
    var table = "Jobs";
    var params = {
        TableName: table,
        Key:{
            "imageName": imageName,
            "dateToRun": dateToRun
        },
        UpdateExpression: "set jobStatus = :r, instanceId = :i",
        ConditionExpression: "imageName = :im and dateToRun = :date",
        ExpressionAttributeValues:{
            ":r"   :status,
            ':im'  : imageName,
            ':date': dateToRun,
            ':i'   : instanceId
        },
        ReturnValues:"UPDATED_NEW"
    };

    docClient.update(params, function(err, data) {
        //console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
        if (data == null) {
            callback('Mudança de status e definição de instancia falhou ou não existe esse Job', null);
        } else {
            callback(err, data.Attributes);
        }    
    });
}

function changeJobStatusAndSetSpotInstanceRequest(imageName, dateToRun, status, spotInstanceRequestId, callback) {
    var table = "Jobs";
    var params = {
        TableName: table,
        Key:{
            "imageName": imageName,
            "dateToRun": dateToRun
        },
        UpdateExpression: "set jobStatus = :r, spotInstanceRequestId = :i",
        ConditionExpression: "imageName = :im and dateToRun = :date",
        ExpressionAttributeValues:{
            ":r"   :status,
            ':im'  : imageName,
            ':date': dateToRun,
            ':i'   : spotInstanceRequestId
        },
        ReturnValues:"UPDATED_NEW"
    };

    docClient.update(params, function(err, data) {
        //console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
        if (data == null) {
            callback('Mudança de status e definição de requisicao de instancia falhou ou não existe esse Job', null);
        } else {
            callback(err, data.Attributes);
        }    
    });
}

function defineCallback(imageName, dateToRun, callbackToRun, callback) {
    var table = "Jobs";
    var params = {
        TableName: table,
        Key:{
            "imageName": imageName,
            "dateToRun": dateToRun
        },
        UpdateExpression: "set callback = :r",
        ConditionExpression: "imageName = :im and dateToRun = :date",
        ExpressionAttributeValues:{
            ":r": callbackToRun,
            ':im': imageName,
            ':date': dateToRun
        },
        ReturnValues:"UPDATED_NEW"
        };

    docClient.update(params, function(err, data) {
        //console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
        if (data == null) {
            callback('Definição de callback falhou ou não existe esse Job', null);
        } else {
            callback(err, data.Attributes);
        }    
    });
}

function getJobs(callback) {
    var jobs = []; 

    var table = "Jobs";
    var params = {
        TableName: table
    };

    docClient.scan(params, onScan);

    function onScan(err, data) {
        if (err) {
            callback(err, null);
        } else {
            // put items returned in the response array
            //console.log("Scan succeeded.");
            data.Items.forEach(function(job) {
                jobs.push(job);
            });

            // continue scanning if we have more movies
            if (typeof data.LastEvaluatedKey != "undefined") {
                //console.log("Scanning for more...");
                params.ExclusiveStartKey = data.LastEvaluatedKey;
                docClient.scan(params, onScan);
            } else {
                callback(null, jobs)
            }
        }
    }
}

function getJobsWithStatus(status, callback) {
    var jobs = []; 

    var table = "Jobs";
    var params = {
        TableName: table,
        FilterExpression: "#s = :status",
        ExpressionAttributeNames:{
            "#s" : "jobStatus"
        },
        ExpressionAttributeValues: {
            ":status" : status
        }
    };

    docClient.scan(params, onScan);

    function onScan(err, data) {
        if (err) {
            callback(err, null);
        } else {
            // put items returned in the response array
            //console.log("Scan succeeded.");
            data.Items.forEach(function(job) {
                jobs.push(job);
            });

            // continue scanning if we have more movies
            if (typeof data.LastEvaluatedKey != "undefined") {
                //console.log("Scanning for more...");
                params.ExclusiveStartKey = data.LastEvaluatedKey;
                docClient.scan(params, onScan);
            } else {
                callback(null, jobs)
            }
        }
    }
}

function deleteTable(callback) {
    const params = {
        TableName: 'Jobs'
    };

    dynamodb.deleteTable(params, function(err, data) {
        callback(err, data);
    });    
}

function setInstanceId(imageName, dateToRun, instanceId, callback) {
    var table = "Jobs";
    var params = {
        TableName: table,
        Key:{
            "imageName": imageName,
            "dateToRun": dateToRun
        },
        UpdateExpression: "set instanceId = :i",
        ConditionExpression: "imageName = :im and dateToRun = :date",
        ExpressionAttributeValues:{
            ':im'  : imageName,
            ':date': dateToRun,
            ':i'   : instanceId
        },
        ReturnValues:"UPDATED_NEW"
    };

    docClient.update(params, function(err, data) {
        //console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
        if (data == null) {
            callback('Definição de instancia falhou ou não existe esse Job', null);
        } else {
            callback(err, data.Attributes);
        }    
    });
}

module.exports = {
    initJobScheduleTables,
    addJob,
    getJob,
    getJobStatus,
    changeJobStatus,
    defineCallback,
    getJobs,
    deleteTable,
    getJobsWithStatus,
    changeJobStatusAndSetInstanceId,
    changeJobStatusAndSetSpotInstanceRequest,
    setInstanceId
}
var AWS = require('aws-sdk');

AWS.config.update({
  region: "us-west-2",
  endpoint: 'https://ec2.us-west-2.amazonaws.com'
});

const imageId = 'ami-2d1bce4d';
const apiId = 'who7xqyt7k';
const instanceType = 'm3.medium';
const keyName = 'TemporeKeyPair_US_WEST_2';
const securityGroupId = 'sg-99dd1efd';
const instanceProfile = 'Arn=arn:aws:iam::381247262190:instance-profile/dynamodb-instanceprofile-for-ec2';
const spotPrice = '0.05';


var EC2 = new AWS.EC2({apiVersion: 'latest'});


function requestSpotInstance(imageName, dateToRun, environmentVariables, callback) {
    
    var environmentVariablesAsCmd = '';
    //Para transformar a lista de env var em strings
    if (environmentVariables != null) {
        environmentVariables.forEach(function(variable) {
            environmentVariablesAsCmd = environmentVariablesAsCmd + ' -e ' + variable;
        });
    }

    var cmd = '#!/bin/bash -x \n\
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>\&1\n\
echo BEGIN\n\
date \'+%Y-%m-%d %H:%M:%S\'\n\
curl -O https://bootstrap.pypa.io/get-pip.py\n\
sudo python get-pip.py\n\
sudo /usr/local/bin/pip install awscli\n\
export DATETORUN=\\"' + dateToRun + '\\"\n\
export IMAGENAME=\\"' + imageName + '\\"\n\
eval docker run ' + environmentVariablesAsCmd + ' ' + imageName + ' \n\
ret_code=$?\n\
if [ $ret_code != 0 ]; then\n\
        /usr/local/bin/aws dynamodb update-item --table-name Jobs --key \'{\"imageName\": {\"S\": \'$IMAGENAME\'}, \"dateToRun\": {\"S\": \'$DATETORUN\'}}\' --attribute-updates \'{\"jobStatus\": {\"Value\": {\"S\":\"FinishedNOK\"} } }\' --return-values UPDATED_NEW --region us-west-2\n\
else\n\
        /usr/local/bin/aws dynamodb update-item --table-name Jobs --key \'{\"imageName\": {\"S\": \'$IMAGENAME\'}, \"dateToRun\": {\"S\": \'$DATETORUN\'}}\' --attribute-updates \'{\"jobStatus\": {\"Value\": {\"S\":\"FinishedOK\"} } }\' --return-values UPDATED_NEW --region us-west-2\n\
fi\n\
curl -X POST -d \'{\"operation\":\"callback\",\"payload\":{\"imageName\":\'$IMAGENAME\', \"dateToRun\":\'$DATETORUN\'}}\' https://' + apiId + '.execute-api.us-west-2.amazonaws.com/prod/JobScheduler\n\
date \'+%Y-%m-%d %H:%M:%S\'\n\
echo END\n';

    var params = {
        InstanceCount: 1, 
        SpotPrice: spotPrice,
        Type: 'one-time',
        LaunchSpecification: {
            ImageId: imageId,
            InstanceType: instanceType,
            KeyName: keyName,
            SecurityGroupIds: [
                securityGroupId
            ],
            IamInstanceProfile: {
                Arn: instanceProfile
            },
            UserData: new Buffer(cmd).toString('base64')
        }
    };

    //console.log('Userdata: \n' + cmd + '\nImage: ' + imageName + ' EnvList: ' + environmentVariablesAsCmd);

    // Create the instance
    EC2.requestSpotInstances(params, callback);
}

function describeSpotInstanceRequest(spotInstanceRequestId, callback) {
    var params = {
        SpotInstanceRequestIds: [
            spotInstanceRequestId
        ]
    };

    EC2.describeSpotInstanceRequests(params, callback);        
}

function launchEC2Instance(imageName, dateToRun, environmentVariables, callback) {
    
    var environmentVariablesAsCmd = '';
    //Para transformar a lista de env var em strings
    if (environmentVariables != null) {
        environmentVariables.forEach(function(variable) {
            environmentVariablesAsCmd = environmentVariablesAsCmd + ' -e ' + variable;
        });
    }

    var cmd = '#!/bin/bash -x \n\
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>\&1\n\
echo BEGIN\n\
date \'+%Y-%m-%d %H:%M:%S\'\n\
curl -O https://bootstrap.pypa.io/get-pip.py\n\
sudo python get-pip.py\n\
sudo /usr/local/bin/pip install awscli\n\
export DATETORUN=\\"' + dateToRun + '\\"\n\
export IMAGENAME=\\"' + imageName + '\\"\n\
eval docker run ' + environmentVariablesAsCmd + ' ' + imageName + ' \n\
ret_code=$?\n\
if [ $ret_code != 0 ]; then\n\
        /usr/local/bin/aws dynamodb update-item --table-name Jobs --key \'{\"imageName\": {\"S\": \'$IMAGENAME\'}, \"dateToRun\": {\"S\": \'$DATETORUN\'}}\' --attribute-updates \'{\"jobStatus\": {\"Value\": {\"S\":\"FinishedNOK\"} } }\' --return-values UPDATED_NEW --region us-west-2\n\
else\n\
        /usr/local/bin/aws dynamodb update-item --table-name Jobs --key \'{\"imageName\": {\"S\": \'$IMAGENAME\'}, \"dateToRun\": {\"S\": \'$DATETORUN\'}}\' --attribute-updates \'{\"jobStatus\": {\"Value\": {\"S\":\"FinishedOK\"} } }\' --return-values UPDATED_NEW --region us-west-2\n\
fi\n\
curl -X POST -d \'{\"operation\":\"callback\",\"payload\":{\"imageName\":\'$IMAGENAME\', \"dateToRun\":\'$DATETORUN\'}}\' https://' + apiId + '.execute-api.us-west-2.amazonaws.com/prod/JobScheduler\n\
date \'+%Y-%m-%d %H:%M:%S\'\n\
echo END\n';

    var params = {
        ImageId: imageId,
        InstanceType: instanceType,
        MinCount: 1, 
        MaxCount: 1,
        KeyName: keyName,
        SecurityGroups: [
            securityGroupId
        ],
        IamInstanceProfile: {
            Arn: instanceProfile
        },
        Monitoring: {
            Enabled: false
        },
        UserData: new Buffer(cmd).toString('base64')    
    };

    //console.log('Userdata: \n' + cmd + '\nImage: ' + imageName + ' EnvList: ' + environmentVariablesAsCmd);

    // Create the instance
    EC2.runInstances(params, callback);
}

function terminateEC2Instance(instanceIdList, callback) {
    if (instanceIdList != null && instanceIdList.length > 0 ) {

        var params = {
            InstanceIds: instanceIdList
        };

        EC2.terminateInstances(params, callback);
    }
}

module.exports = {
    launchEC2Instance,
    terminateEC2Instance,
    requestSpotInstance,
    describeSpotInstanceRequest
}
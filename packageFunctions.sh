#!/bin/bash
rm jobRESTService.zip eventReceiver.zip
zip -r eventReceiver.zip node_modules/moment node_modules/async dynamo.js ec2.js eventReceiver.js jobModule.js
zip -r jobRESTService.zip node_modules/moment node_modules/async dynamo.js ec2.js jobRESTService.js jobModule.js
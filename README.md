# jobscheduler
Restful service that launches a Docker-based job in an AWS EC2 Spot Instance and automatically terminate it when the job is finished.

# Solution Design

Jobscheduler has 2 mains components which are AWS lambda functions.

1. eventReceiver: This function is called periodically to inspect the job's datasource and take the appropriate action in accordance with job's status:

   - Scheduled: if a job is scheduled with a earlier timestamp in face of the current time the function will launch a spot instance request for that job and update the job status to Requested.
   - Requested: check the spot instance request. If has a pending status just wait, if is canceled, launch the request again, if it is fullfiled update the job with the instanceId.
   - FinishedOK or FinishedNOK: terminates the ec2 instance for the job.
   - TerminatedOK or Terminated: nothing, job's done.

For the proof of concept and to check the results faster, I usually call this function with one minuto interval, but this could and should be tunned.   

2. jobRESTService: This function implements the API and it has 4 operations:
	
   - schedule:  Given a Docker image, the desired date-time and a list of ENV Variables, schedule the provisioning of a docker container for that image at the time.
   - list: list the scheduled jobs
   - status: show the status for one job
   - callback: to be called by the scheduled application when it finishes processing	
  
The solution uses AWS DynamoDB as a datasource with a Table called Jobs. For examples on data format, please check "input" folder. Note that same JSONs are also used in API body requests.

# Deploy

In order to deploy the solution follow instructions on aws_deploy.txt.

# Tests

The solution can be tested with mocha.

# Improvements

To improve the PoC is possible to automate the script deploy obtaining the output for some commands and give as input for others if one desires to still use shell scripts. Another possibility is the create a CloudFormation stack to provision the solution. Additionally, using Github and AWS (or other tools like Jenkins or CircleCI) is possible to automate the code updates, including checks in the existent tests. It's also possible to gather the API logs using Cloud Trail.

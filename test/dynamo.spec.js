const assert = require('assert')
const expect = require('chai').expect;

const dyn    = require('../dynamo');

const jobsToInsert = [
    {
        imageName: 'wordpress',
        dateToRun: '2016-09-06T19:22:48.986Z',
        environmentVariablesList: ['ENV=1', 'ENV=2']
    },
    {
        imageName: 'mysql',
        dateToRun: '2016-09-16T19:22:48.986Z',
        environmentVariablesList: ['ENV=3', 'ENV=4']
    },
    {
        imageName: 'postgres',
        dateToRun: '2016-09-26T19:22:48.986Z',
        environmentVariablesList: ['ENV=3', 'ENV=4']
    },
    {
        imageName: 'node',
        dateToRun: '2016-10-06T19:22:48.986Z',
        environmentVariablesList: ['ENV=10', 'ENV=65']
    },
    {
        imageName: 'mongodb',
        dateToRun: '2016-11-06T19:22:48.986Z',
        environmentVariablesList: ['ENV=3', 'ENV=4']
    },
    {
        imageName: 'postgres',
        dateToRun: '2016-12-06T19:22:48.986Z',
        environmentVariablesList: ['ENV=8', 'ENV=4']
    }
];

describe('The Job Scheduler Module', function() {
    it ('initilize module', function (done) {
        dyn.initJobScheduleTables(function(err) {
            if (err) done(err);
            else done();
        });
    });
    
    it ('schedule a job', function (done) {
        
        dyn.addJob(jobsToInsert[0], function(err,data) {
           done(err);
        });
    });

    it ('schedule a second job', function (done) {
        dyn.addJob(jobsToInsert[1], function(err,data) {
           done(err);
        });
    });

    it ('schedule a second job', function (done) {
        dyn.addJob(jobsToInsert[2], function(err,data) {
           done(err);
        });
    });

    it ('schedule a third job', function (done) {
        dyn.addJob(jobsToInsert[3], function(err,data) {
           done(err);
        });
    });

    it ('schedule a fourth job', function (done) {
        dyn.addJob(jobsToInsert[4], function(err,data) {
           done(err);
        });
    });

    it ('schedule a fifth job', function (done) {
        dyn.addJob(jobsToInsert[5], function(err,data) {
           done(err);
        });
    });

    it ('retrieve all the jobs', function (done) {        
        dyn.getJobs(function(err, jobs) {
            if (err) done(err);
            assert.equal(jobs.length,6);
            done();
        });
    });

    it ('get a specific job,a existing none', function (done) {        
        dyn.getJob(jobsToInsert[0].imageName, jobsToInsert[0].dateToRun, function(err, job) {
            if (err) return done(err);

            assert.equal(jobsToInsert[0].imageName, job.imageName);
            done();
        });
    });
    
    it ('get a specific job, a non-existing none', function (done) {        
        dyn.getJob('treta','2017', function(err, job) {
            if (err) done(err);
            assert.equal(job, undefined);
            done();
        });
    });

    it ('inspect the status for a given job', function (done) {        
        dyn.getJobStatus(jobsToInsert[0].imageName, jobsToInsert[0].dateToRun, function(err, status) {
            if (err) done(err);
            assert.equal(status,'Scheduled');
            done();
        });
    });

    it ('inspect the status for a non-existing given job', function (done) {        
        dyn.getJobStatus('treta','2017', function(err, status) {
            assert.equal(err,'Job não encontrado');
            done();
        });
    });

    it ('change the status for a given job', function (done) {        
        dyn.changeJobStatus(jobsToInsert[0].imageName, jobsToInsert[0].dateToRun,'Running', function(err, job) {
            if (err) done(err);
            assert.equal(job.jobStatus,'Running');
            done();
        });
    });

    it ('change the status for a non-existent given job', function (done) {        
        dyn.changeJobStatus('treta','2017','Running', function(err, job) {
            assert.equal(err, 'Mudança de status falhou ou não existe esse Job', null);
            done();
        });
    });

    it ('inspect the just changed status for a given job', function (done) {        
        dyn.getJobStatus(jobsToInsert[0].imageName, jobsToInsert[0].dateToRun, function(err, status) {
            if (err) done(err);
            assert.equal(status,'Running');
            done();
        });
    });

    it ('define a callback for a given job', function (done) {        
        dyn.defineCallback(jobsToInsert[3].imageName, jobsToInsert[3].dateToRun, 'funcao de callback', function(err, job) {
            if (err) done(err);
            assert.equal(job.callback,'funcao de callback');
            done();
        });
    });

    it ('define a callback for a non-existent given job', function (done) {        
        dyn.defineCallback('treta','2017', 'funcao de callback', function(err, job) {
            assert.equal(err, 'Definição de callback falhou ou não existe esse Job', null);
            done();
        });
    });

    it ('delete the table on database', function (done) {        
        dyn.deleteTable(function(err, data) {
            if (err) done(err);
            assert.equal(data.TableDescription.ItemCount, 6);
            done();
        });
    });

    it ('try to delete the non existing table on database', function (done) {        
        dyn.deleteTable(function(err, data) {
            assert.equal(err, 'ResourceNotFoundException: Cannot do operations on a non-existent table');
            done();
        });
    });
});
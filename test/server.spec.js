var should = require('should'); 
var assert = require('assert');
var request = require('supertest');  
var winston = require('winston');

const dynamo = require('../dynamo');

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

describe('Rest Module for JobScheduler', function() {
  var url = 'http://localhost:3000';
  // within before() you can run all the operations that are needed to setup your tests. In this case
  // I want to create a connection with the database, and when I'm done, I call done().
  before(function(done) {
    dynamo.initJobScheduleTables(function(err) {
        if (err) done(err);
        else done();
    });
  });

  after(function(done) {
    // dynamo.deleteTable(function(err, data) {
    //     done();
    // });

    done();
  });
  // use describe to give a title to your test suite, in this case the tile is "Account"
  // and then specify a function in which we are going to declare all the tests
  // we want to run. Each test starts with the function it() and as a first argument 
  // we have to provide a meaningful title for it, whereas as the second argument we
  // specify a function that takes a single parameter, "done", that we will use 
  // to specify when our test is completed, and that's what makes easy
  // to perform async test!
  
  it ('schedule a job', function (done) {
        request(url)
            .post('/schedule')
            .send(jobsToInsert[0])
            // end handles the response
            .end(function(err, res) {
                if (err) {
                    throw err;
                }
                // this is should.js syntax, very clear
                res.status.should.be.equal(200);
                var body = res.body;
                //console.log('Lista de jobs recebidos ' + JSON.stringify(body, null, 2));
                body.mensagem.should.be.equal("Job agendado com sucesso");
                done();
            });
    });

    it('should return all jobs scheduled', function(done) {
        request(url)
            .get('/list')
            .send()
            // end handles the response
            .end(function(err, res) {
                if (err) {
                    throw err;
                }
                // this is should.js syntax, very clear
                res.status.should.be.equal(200);
                var body = res.body;
                //console.log('Lista de jobs recebidos ' + JSON.stringify(body, null, 2));
                body.length.should.be.equal(1);
                done();
            });
    });

    it ('check a job status', function (done) {
        request(url)
            .post('/status')
            .send(jobsToInsert[0])
            // end handles the response
            .end(function(err, res) {
                if (err) {
                    throw err;
                }
                // this is should.js syntax, very clear
                res.status.should.be.equal(200);
                var body = res.body;
                //console.log('Lista de jobs recebidos ' + JSON.stringify(body, null, 2));
                body.status.should.be.equal("Scheduled");
                done();
            });
    });

    it ('define a callback for a Job', function (done) {
        jobsToInsert[0].callback = 'Funcao de callback';
        request(url)
            .post('/callback')
            .send(jobsToInsert[0])
            // end handles the response
            .end(function(err, res) {
                if (err) {
                    throw err;
                }
                // this is should.js syntax, very clear
                res.status.should.be.equal(200);
                var body = res.body;
                body.mensagem.should.be.equal("Callback definido com sucesso");
                done();
            });
    });
});
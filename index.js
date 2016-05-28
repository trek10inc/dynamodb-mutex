'use strict';

const aws = require('aws-sdk');

class Mutex {

    constructor(opts) {
        aws.config.update({

            region : opts.awsConfig.region,
            apiVersions: {
                dynamodb: '2012-08-10'
            },

            credentials: new aws.Credentials({
                accessKeyId: opts.awsConfig.accessKeyId,
                secretAccessKey: opts.awsConfig.secretAccessKey
            })

        });

        this._db = new aws.DynamoDB();
        this._dbc = new aws.DynamoDB.DocumentClient();

        this._db.describeTable({ TableName : opts.awsConfig.tableName }, err => {
            if(err && err.code === 'ResourceNotFoundException') {

                this._db.createTable({
                    TableName : opts.awsConfig.tableName,
                    AttributeDefinitions : [
                        { AttributeName : 'key', AttributeType : 'S' },
                        { AttributeName : 'expire', AttributeType : 'N' }
                    ],
                    KeySchema : [
                        { AttributeName : 'key', KeyType : 'HASH' },
                        { AttributeName : 'expire', KeyType : 'RANGE' }
                    ],
                    ProvisionedThroughput: {
                        ReadCapacityUnits: 1,
                        WriteCapacityUnits: 1
                    }
                });
            }
        });
    }

    lock() {

    }

    unlock() {

    }
}

let a = new Mutex({    awsConfig : {
    accessKeyId : '',
    secretAccessKey : '',
    region : 'us-west-2',
    tableName : 'mutex'
}});


module.exports = Mutex;
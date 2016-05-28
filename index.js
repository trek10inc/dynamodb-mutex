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
        this._tableName = opts.awsConfig.tableName;

        this._db.describeTable({ TableName : this._tableName }, err => {
            if(err && err.code === 'ResourceNotFoundException') {

                this._db.createTable({
                    TableName : this._tableName,
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

    lock(key, timeout, callback) {

        let config = {
          TableName : this._tableName,
              AttributesToGet : ['expire'],
          Key : {
              key : key
          }
        };

        let newMutex = {
            TableName : this._tableName,
            Item : {
                key : key,
                expire : 0
            }
        };

            this._dbc.get(config, (err, result) => {

                if(!result.Item) {
                    newMutex.Item.expire = Date.now() + timeout;
                    this._dbc.put(newMutex, (err) => console.log(err));
                    this._unlock(key);
                }
                else {

                    let expire = result.Item.expire;
                    if(Date.now() >= expire) {
                        newMutex.Item.expire = Date.now() + timeout;
                        this._dbc.put(newMutex, err => console.log(err));
                        this._unlock(key);
                    }

                }

            });

    }

    _unlock(key) {

    }
}

let a = new Mutex({    awsConfig : {
    accessKeyId : '',
    secretAccessKey : '',
    region : 'us-west-2',
    tableName : 'mutex'
}});

a.lock('asd', 10000);

module.exports = Mutex;
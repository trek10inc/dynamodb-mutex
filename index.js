'use strict';

const aws = require('aws-sdk');

class Mutex {

    /**
     * Mutex class constructor
     * @param {Object} opts AWS configuration parameters
     *
     */

    constructor(opts) {
        
        if(opts.awsConfig) {
            aws.config.update({
                region : opts.awsConfig.region,
                apiVersions: {
                    dynamodb: '2012-08-10'
                },
                credentials: new aws.Credentials({
                    accessKeyId:  opts.awsConfig.accessKeyId,
                    secretAccessKey: opts.awsConfig.accessKey
                })
            });
        }
        this._db = new aws.DynamoDB();
        this._dbc = new aws.DynamoDB.DocumentClient();

        this._tableName = opts.tableName || 'mutex-table';
        this._retryIntervalTime = opts.retryInterval || 1000;

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
                }, (err) => err);
            }
        });
    }

    /**
     * Write Lock
     * @access private
     * @param {string} key
     * @param {number} timeout
     * @param {number} retryInterval
     * @param {function} callback
     */

    _writeLock(key, timeout, retryInterval, callback) {
      let now = Date.now();
      let item = {
          key : key,
          expire : now + timeout
      };
        this._dbc.put({
            TableName : this._tableName,
            Item: item,
            ConditionExpression: '#key <> :key OR (#key = :key AND #expire < :expire)',
            ExpressionAttributeNames: {
                '#key': 'key',
                '#expire': 'expire'
            },
            ExpressionAttributeValues: {
                ':key': item.key,
                ':expire': now
            }
        }, err => {
            if(!err) clearInterval(retryInterval);
            callback(!err);
        });
    }

    /**
     * Lock
     * @access public
     * @param {string} key
     * @param {number} timeout
     * @param {function} callback
     */

    lock(key, timeout, callback) {


        let retryInterval = setInterval( () => {
            this._writeLock(key, timeout, retryInterval, (success) => {
                if(success) callback(() => this._unlock(key));
            });

        }, this._retryIntervalTime);

    }

    /**
     * Unlock
     * @access private
     * @param {string} key
     */

    _unlock(key) {
        let params = {
            TableName : this._tableName,
            Key: {
                key: key
            }
        };
        this._dbc.delete(params, err => err);
    }
}

module.exports = Mutex;
'use strict';

const mutex = require('./index.js');
const chai = require('chai');
const expect = chai.expect;

let config = {

    tableName : 'mutex',
    timeout : 1000,

    awsConfig : {
        accessKeyId : '123',
        secretAccessKey : '123'
    }

};

describe('mutex object creating', function () {

    it('should be an object', function () {
        expect(new mutex(config)).is.an('object');
    });

});
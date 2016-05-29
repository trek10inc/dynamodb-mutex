# mutex-dynamodb

## Installation : 

```
npm install mutex-dynamodb
```


## How to use
```js
const mutex = require( 'mutex-dynamodb' );

let awsConfig = {
        accessKeyId : 'ACCESS_KEY',
        secretAccessKey : 'SECRET_KEY',
        region : 'REGION',
        tableName : 'TABLE_NAME'
};


let timeout = 2000;

const sampleMutex = new mutex(awsConfig);


sampleMutex.acquireLock('keyName', timeout, (unlock) => {
  // DO AWESOME STUFF HERE
  unlock();
});


## License

MIT

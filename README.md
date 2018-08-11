# turtleDB

![alt text](https://path-to-logo.png)

Some short description of our project. For example: An offline-first JSON document database built using IndexedDB with out of the box versioning and sync.

## Install

Install

```javascript
npm i turtledb
```

## Usage

```javascript
import TurtleDB from 'turtledb';
// or
const TurtleDB = require('turtledb');
```

```javascript
// Create a new database
const mydb = new TurtleDB('example');
// Link a remote database to sync to
mydb.setRemote('http://remoteDBURL.com');

// CRUD Operations - all promise based
mydb.create({ _id: 'firstTurtle', species: 'Sea Turtle' });
mydb.read('firstTurtle').then((doc) => console.log(doc));
mydb.update('firstTurtle', { species: 'Giant Turtle' });
mydb.delete('firstTurtle');

// Sync
mydb.sync();
```

## Features

- Many features
- So many
- The best


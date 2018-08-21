# turtleDB

![turtleDB logo](https://turtle-db.github.io/images/logo_full.png)

turtleDB is a JavaScript framework for developers to build offline-first, collaborative web applications. It provides a developer-friendly API to access to an in-browser database using IndexedDB.

It comes with built in document versioning and automatic server synchronization when paired with the back-end package [tortoiseDB](https://github.com/turtle-DB/tortoiseDB), as well as flexible conflict resolution for any potential document conflicts while collaborating.

You can check out our [getting started guide](link), check out our [API docs](https://turtle-db.github.io/api), and read more about the project itself [here](https://turtle-db.github.io/about).

Note: for the best user experience we strongly recommend using Chrome.

![todo app demo](https://path-to-demo.gif)

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
mydb.setRemote('http://1.1.1.1:3000');

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



class TurtleDB {
  constructor(dbName) {
    this.dbPromise = this.createDB(dbName);
  }

  createDB(dbName) {
    //idb API returns a promise from open()
    return idb.open(dbName, 1);//, upgradeDB => {
      // upgradeDB.createObjectStore('todos', { keyPath: 'id' });
      //example - var objectStore = db.createObjectStore("toDoList", { keyPath: "taskTitle" });
  }

  createStore(storeName) {
    //IDB API - promise resolves to IDBDatabase object
    this.dbPromise.then(db => {
      console.log(db);
      this.dbPromise = db.open(db.name, db.version + 1, upgradeDB => {
        upgradeDB.createObjectStore(storeName, { keyPath: 'id' });
      });

      //try using transaction to add object store
      // let transaction = db.transaction([], 'versionchange');
      // let objectStore = transaction.createObjectStore(storeName);
    });
  }

  create(obj) {
    return this.dbPromise.then((db) => {
      //IDB API
      const transaction = db.transaction('todos', 'readwrite');
      const todos = transaction.objectStore('todos');

      //native API - put([object], [key])
      todos.put(obj);
      return transaction.complete;
    });
  }

  read(id) {

  }

  update(id, val) {

  }

  delete(id) {

  }
}

const db = new TurtleDB('turtleDB');
db.createStore('todos');
// let doc = {
//     id: 123456,
//     todo: "Finish Project"
// };
// db.create(doc);
// db.delete(123456);



var dbName = "sampleDB";
var dbVersion = 2;
var request = indexedDB.open(dbName, dbVersion);

request.onupgradeneeded = function(e) {
  var db = request.result;
  if (e.oldVersion < 1) {
    db.createObjectStore("store1");
  }

  if (e.oldVersion < 2) {
    db.deleteObjectStore("store1");
    db.createObjectStore("store2");
  }

  // etc. for version < 3, 4...
};




// function UpgradeDB(db, oldVersion, transaction) {
//   this._db = db;
//   this.oldVersion = oldVersion;
//   this.transaction = new Transaction(transaction);
// }
//
// open: function(name, version, upgradeCallback) {
//   var p = promisifyRequestCall(indexedDB, 'open', [name, version]);
//   var request = p.request;
//
//   if (request) {
//     request.onupgradeneeded = function(event) {
//       if (upgradeCallback) {
//         upgradeCallback(new UpgradeDB(request.result, event.oldVersion, request.transaction));
//       }
//     };
//   }
//
//   return p.then(function(db) {
//     return new DB(db);
//   });
// },


class TurtleDB {
  constructor(dbName) {
    this.dbPromise = this.createDB(dbName);
  }

  createDB(dbName) {
    return idb.open('turtleDB', 1, upgradeDB => {
      upgradeDB.createObjectStore('todos', { keyPath: 'id' });
      //example - var objectStore = db.createObjectStore("toDoList", { keyPath: "taskTitle" });
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
let doc = {
    id: 123456,
    todo: "Finish Project"
};
db.create(doc);
db.delete(123456);

import uuidv4 from 'uuid/v4';

class TurtleDB {
  constructor(name) {
    this._store = 'store';
    this.ready = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(name);

      request.onupgradeneeded = e => {
        console.log('on upgrade needed fired!')
        console.log(e.target)
        this.db = e.target.result;
        this.db.createObjectStore(this._store);
      };

      request.onsuccess = e => {
        console.log('on success fired!')
        console.log(e.target.result)
        this.db = e.target.result; // IDBDatabase object
        resolve();
      };

      request.onerror = e => {
        this.db = e.target.result;
        reject(e);
      };
    });
  }
  // ****************************************************
  // ****************************************************
  // Schema Operations
  // var myIDBIndex = objectStore.createIndex(indexName, keyPath);
  // var myIDBIndex = objectStore.createIndex(indexName, keyPath, objectParameters);
  addIndex(field) {
    this.ready = new Promise((resolve, reject) => {
      this.db.close();
      const request = window.indexedDB.open("turtleDB", this.db.version + 1);
      request.onupgradeneeded = e => {
        this.db = e.target.result;
        // Version change transaction:
        const transaction = e.target.transaction;
        try {
          transaction.objectStore('store').createIndex(field, field);
          resolve(`Index: ${field} created successfully.`);
        } catch(err) {
          reject(err);
        }
      };
    });
    return this.ready;
  }

  // try {
  //   transaction.objectStore('store').createIndex(field, field);
  // } catch {
  //   reject()
  // }

  // getStore(store) {
  //   if (this.hasStoreName(store)) {
  //     return this.db
  //       .transaction([store], 'readwrite')
  //       .objectStore(store)
  //   } else {
  //     console.log(`Store <${store}> does not exist!`);
  //     return null;
  //   }
  // }


// ****************************************************
// ****************************************************
// BASIC CRUD OPERATIONS
  _crud(op, { key, data }) {
    return this.ready.then(() => {
      return new Promise((resolve, reject) => {
        let request = this.getStore(this._store, op === 'read' ? 'readonly' : 'readwrite');
        if (request) {
          switch(op) {
            case "create":
              request = request.add(data, key);
              break;
            case "read":
              request = request.get(key);
              break;
            case "update":
              request = request.put(data, key);
              break;
            case "delete":
              request = request.delete(key);
              break;
          }
        }
        request.onsuccess = e => {
          console.log(e.target.result);
          console.log(`${op} success:`, e.target.result);
          resolve(e.target.result);
        }
        request.onerror = e => {
          console.log(`${op} error:`, e);
          reject(e);
        }
      })
    })
  }

  create(key, data) {
    if (typeof data === 'object' && !Array.isArray(data)) {
      data.id = uuidv4();
      return this._crud('create', { key: data.id, data });
    } else {
      console.log('Please pass in a valid object.')
    }
  }

  read(key) {
    return this._crud('read', { key });
  }

  update(key, data) {
    return this._crud('update', { key, data });
  }

  delete(key) {
    return this._crud('delete', { key });
  }
// ****************************************************
// ****************************************************
// Bulk OPERATIONS

  // Read All
  readAllValues() {
    return this.ready.then(() => {
      return new Promise((resolve, reject) => {
        const request = this.getStore(this._store).getAll();
        request.onsuccess = () => {
          resolve(request.result);
        }
        request.onerror = e => {
          console.log("readAllValues error:", e);
          reject(e);
        }
      })
    })
  }

  // Read Between Range
  readValuesBetweenKeys(x, y) {
    return this.ready.then(() => {
      return new Promise((resolve, reject) => {
        const request = this.getStore(this._store)
                            .getAll(IDBKeyRange.bound(x, y));
        request.onsuccess = () => {
          resolve(request.result);
        }
      })
    })
  }

// ****************************************************
// ****************************************************
// Store Operations
  getStore(store, op) {
    if (this.hasStoreName(store)) {
      return this.db
        .transaction([store], op)
        .objectStore(store)
    } else {
      console.log(`Store <${store}> does not exist!`);
      return null;
    }
  }

// *** NEED THIS TO RETURN ARRAY ***
  getAllKeysFromStore(store) {
    return new Promise((resolve, reject) => {
      const request = this.getStore(store).getAllKeys();
      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  getLengthOfStore(store) {
    const request = this.getStore(store).count();
    request.onsuccess = () => {
      console.log(request.result);
    }
  }

  getAllStoreNames() {
    return Array.prototype.slice.call(this.db.objectStoreNames);
  }

  hasStoreName(store) {
    return this.getAllStoreNames().includes(store);
  }

  deleteWithinRange() {

  }

  //IDBCURSOR operations - advance(num), continue(), continuePrimaryKey(), delete(), update()
  //IDBCURSOR properties - source, direction, key, primaryKey
  deleteAllData() {
    this.getStore(this._store).openCursor().onsuccess = (e) => {
      let cursor = e.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        console.log('Cursor finished');
      }
    }
  }
  //
  // db.find({
  //   selector: {name: 'Mario'},
  //   // fields: ['_id', 'name'],
  //   // sort: ['name']
  // }).then(function (result) {
  //   // handle result
  // }).catch(function (err) {
  //   console.log(err);
  // });

  // ****************************************************
  // ****************************************************
  // Filtering
  filterBy(selector) { // selector format: {eyeColor: 'green', gender: 'male'}
    let fields = Object.keys(selector);
    return this.readAllValues()
      .then(vals => vals.filter((doc) => {
        return fields.every(field => doc[field] === selector[field])
      })
    );
  }



  //
  // filterByKey(lower, upper) {
  //   var keyRangeValue = IDBKeyRange.bound(lower, upper);
  //
  //   this.getStore(this._store).openCursor(keyRangeValue).onsuccess = (e) => {
  //     let cursor = e.target.result;
  //     if (cursor) {
  //       let value = cursor.value;
  //       console.log(value);
  //       cursor.continue();
  //     } else {
  //       console.log('Cursor finished');
  //     }
  //   }
  // };

  // ****************************************************
  // ****************************************************
  // Database Operations

  dropDB() {
    const deleteRequest = window.indexedDB.deleteDatabase('turtleDB');
    deleteRequest.onsuccess = () => console.log('turtleDB was deleted successfully.');
    deleteRequest.onerror = () => console.log('Error deleting database...');
    deleteRequest.onblocked = e => {
      console.log('blocked:', e);
      this.db.close();
    }
  }
}

const turtleDB = new TurtleDB('turtleDB');
// fakeData.forEach((data, idx) => {
//   turtleDB.create(idx, data);
// })
export default turtleDB;

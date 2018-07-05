class TurtleDB {
  constructor(name) {
    this.ready = new Promise((resolve, reject) => {
      var request = window.indexedDB.open(name);

      request.onupgradeneeded = e => {
        this.db = e.target.result;
        this.db.createObjectStore('store');
      };

      request.onsuccess = e => {
        this.db = e.target.result;
        resolve();
      };

      request.onerror = e => {
        this.db = e.target.result;
        reject(e);
      };
    });
  }
}

TurtleDB.prototype.get = function(key) {
  return this.ready.then(() => {
    return new Promise((resolve, reject) => {
      var request = this.getStore().get(key);
      request.onsuccess = e => resolve(e.target.result);
      request.onerror = reject;
    });
  });
};

TurtleDB.prototype.getStore = function() {
  return this.db
    .transaction(['store'], 'readwrite')
    .objectStore('store');
};

TurtleDB.prototype.set = function(obj) {
  return this.ready.then(() => {
    return new Promise((resolve, reject) => {
      var request = this.getStore();
      request.put(obj, obj._id);
      request.onsuccess = resolve;
      request.onerror = reject;
    });
  });
};

TurtleDB.prototype.delete = function(key, value) {
  window.indexedDB.deleteDatabase(location.origin);
}

TurtleDB.prototype.allDocs = function() {
  return this.ready.then(() => {
    return new Promise((resolve, reject) => {
      var request = this.getStore().getAll();
      request.onsuccess = e => resolve(e.target.result);
    });
  });
}

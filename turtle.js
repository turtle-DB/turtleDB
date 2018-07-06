// Use like so:
// const turtle = new TurtleDB(dbName);

class TurtleDB {
  constructor(name) {
    this.name = name;
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

  get(key) {
    return this.ready.then(() => {
      return new Promise((resolve, reject) => {
        var request = this.getStore().get(key);
        request.onsuccess = e => resolve(e.target.result);
        request.onerror = reject;
      });
    });
  }

  getStore() {
    return this.db
      .transaction(['store'], 'readwrite')
      .objectStore('store');
  }

  set(obj) {
    return this.ready.then(() => {
      return new Promise((resolve, reject) => {
        var request = this.getStore();
        request.put(obj, obj.id);
        request.onsuccess = resolve;
        request.onerror = reject;
      });
    });
  }

  delete() {
    window.indexedDB.deleteDatabase(this.name);
  }

  allDocs() {
    return this.ready.then(() => {
      return new Promise((resolve, reject) => {
        var request = this.getStore().getAll();
        request.onsuccess = e => resolve(e.target.result);
        request.onerror = reject;
      });
    });
  }
}

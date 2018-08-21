import md5 from 'md5';

const debug = require('debug');
var logTo = debug('turtleDB:syncToSummary');
var logFrom = debug('turtleDB:syncFromSummary');

// turtleDB specific
import developerAPI from './developerAPI';
import SyncTo from './syncTo';
import SyncFrom from './syncFrom';
import IDBShell from './IDBShell';

class TurtleDB {
  constructor(dbName = 'default') {
    this.idb = new IDBShell(`turtleDB-${dbName}`);
    this.syncInProgress = false;
    this.batchLimit = 1000;

    for (const prop in developerAPI) {
      if (typeof developerAPI[prop] === 'function') {
        this[prop] = developerAPI[prop];
      }
    }
  }

  _printRevTree(_id) {
    this._readMetaDoc(_id).then(metaDoc => {
      console.log('-----');
      console.log(`Revision Tree for ${_id}:`, JSON.stringify(metaDoc._revisions, undefined, 2));
      console.log('-----');
    });
  }

  _readMetaDoc(_id) {
    return this.idb.command(this.idb._meta, 'READ', { _id })
      .then(meta => meta);
  }

  _readRevFromIndex(_id, rev) {
    const _id_rev = _id + "::" + rev;
    return this.idb.command(this.idb._store, "INDEX_READ", { data: { indexName: '_id_rev', key: _id_rev } });
  }

  _readWithoutDeletedError(_id) {
    let metaDoc;
    let doc = {};

    return this._readMetaDoc(_id)
      .then(returnedMetadoc => {
        if (!returnedMetadoc._winningRev) { return Promise.resolve(false); }
        metaDoc = returnedMetadoc;

        return this._readRevFromIndex(_id, returnedMetadoc._winningRev);
      })
      .then(returnedDoc => {
        if (!returnedDoc) { return false; }
        return this._packageUpDoc(metaDoc, returnedDoc)
      })
      .then(doc => {
        return doc;
      })
      .catch(err => console.log("Read error:", err));
  }

  _packageUpDoc(metaDoc, docData) {
    let doc = Object.assign({}, docData);
    [doc._id, doc._rev] = doc._id_rev.split('::');
    delete doc._id_rev;

    return new Promise((resolve, reject) => {
      if (metaDoc._leafRevs.length > 1) {
        doc._conflicts = true;
        doc._conflictVersions = [];

        let conflictRevs = metaDoc._leafRevs.filter(rev => rev !== doc._rev);
        let promises = conflictRevs.map(rev => {
          return this._readRevFromIndex(metaDoc._id, rev)
            .then(version => {
              [version._id, version._rev] = version._id_rev.split('::');
              delete version._id_rev;
              doc._conflictVersions.push(version);
            });
        });

        Promise.all(promises)
          .then(() => {
            resolve(doc);
          });

      } else {
        resolve(doc);
      }
    })
  }

  _deleteAllOtherLeafRevs(metaDoc, _rev) {
    const leafRevsToDelete = metaDoc._leafRevs.filter(rev => rev !== _rev);

    let result = Promise.resolve();
    leafRevsToDelete.forEach(rev => {
      result = result.then(() => this.delete(metaDoc._id, rev));
    });

    return result;
  }

  _generateNewDoc(_id, oldRev, newProperties) {
    const oldRevNumber = parseInt(oldRev.split('-')[0], 10);
    const newDoc = Object.assign({}, newProperties);

    delete newDoc._rev;
    delete newDoc._id;
    delete newDoc._conflicts;
    delete newDoc._conflictVersions;

    const newRev = `${oldRevNumber + 1}-` + md5(oldRev + JSON.stringify(newDoc));
    newDoc._id_rev = _id + "::" + newRev;
    return newDoc;
  }

  _mergeDocs(oldDoc, newProperties) {
    const [_id, oldRev] = oldDoc._id_rev.split('::');
    const oldRevNumber = parseInt(oldRev.split('-')[0], 10);
    const oldDocCopy = JSON.parse(JSON.stringify(oldDoc));
    const newDoc = Object.assign(oldDocCopy, newProperties);

    delete newDoc._rev;
    delete newDoc._id;
    delete newDoc._conflicts;
    delete newDoc._conflictVersions;

    const newRev = `${oldRevNumber + 1}-` + md5(oldRev + JSON.stringify(newDoc));
    newDoc._id_rev = _id + "::" + newRev;
    return newDoc;
  }

  _getLastStoreKey(turtleHistoryDoc) {
    if (turtleHistoryDoc.history.length === 0) {
      return 0;
    } else {
      return turtleHistoryDoc.history[0].lastKey;
    }
  }

  _getWinningRev(leafRevs) {
    return leafRevs.sort((a, b) => {
      let [revNumA, revHashA] = a.split('-');
      let [revNumB, revHashB] = b.split('-');
      revNumA = parseInt(revNumA, 10);
      revNumB = parseInt(revNumB, 10);

      if (revNumA > revNumB) {
        return -1;
      } else if (revNumA < revNumB) {
        return 1;
      } else {
        if (revHashA > revHashB) {
          return -1;
        } else {
          return 1;
        }
      }
    })[0];
  }

  _updateMetaDocRevisionTree(tree, newRev, oldRev, _deleted) {
    this._insertNewRev(tree, newRev, oldRev, _deleted);
  }

  _insertNewRev(node, newRev, oldRev, _deleted) {
    if (node[0] === oldRev) {
      if (_deleted) {
        return node[2].push([newRev, { _deleted: true }, []]);
      } else {
        return node[2].push([newRev, {}, []]);
      }
    }

    for (let i = 0; i < node[2].length; i++) {
      this._insertNewRev(node[2][i], newRev, oldRev, _deleted);
    }
  }

  makeRevWinner(doc) {
    const { _id, _rev } = doc;

    return this._readMetaDoc(_id)
      .then(metaDoc => {
        const leafRevsToDelete = metaDoc._leafRevs.filter(rev => rev !== _rev);

        let result = Promise.resolve();
        leafRevsToDelete.forEach(rev => {
          result = result.then(() => this.delete(_id, rev));
        });

        return result;
      })
      .then(() => this.update(_id, doc, _rev))
      .catch(err => console.log("makeRevWinner error:", err));
  }

  sizeOf(bytes) {
    if (bytes == 0) { return "0.00 B"; }
    var e = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, e)).toFixed(2) + ' ' + ' KMGTP'.charAt(e) + 'B';
  }

  // Sync

  syncTo() {
    logTo('\n ------- NEW Turtle ==> Tortoise SYNC ------');
    const syncTo = new SyncTo(this.remoteUrl, this.batchLimit);
    syncTo.idb = this.idb;
    return syncTo.start()
      .then(() => logTo('\n ------- Turtle ==> Tortoise sync complete ------'));
  }

  syncFrom() {
    logFrom('\n ------- NEW Tortoise ==> Turtle SYNC ------');
    const syncFrom = new SyncFrom(this.remoteUrl);
    syncFrom.idb = this.idb;
    return syncFrom.start()
      .then(() => logFrom('\n ------- Tortoise ==> Turtle sync complete ------'));
  }

  editNDocumentsMTimes(docs, times) {
    let result = Promise.resolve();
    for (let i = 0; i < times; i += 1) {
      //create promise chain
      result = result.then(() => this.editFirstNDocuments(docs));
    }

    result.then(() => console.log('finished editing'));
  }

  readAllMetaDocsAndDocs() {
    const result = {};

    return this.idb.command(this.idb._meta, "READ_ALL", {})
      .then(metaDocs => {
        result.metaDocs = metaDocs.filter(doc => doc._winningRev);
        let promises = metaDocs.map(metaDoc => this._readWithoutDeletedError(metaDoc._id));
        return Promise.all(promises);
      })
      .then(docs => {
        result.docs = docs.filter(doc => !!doc);
        return result;
      })
      .catch(err => console.log("readAllMetaDocsAndDocs error:", err));
  }

  deleteBetweenNumbers(start, end) {
    return new Promise((resolve, reject) => {
      let deletePromises = [];
      let counter = 0;
      this.idb.getStore(this._meta, 'readonly').openCursor().onsuccess = e => {
        const cursor = e.target.result;
        if (!cursor) {
          console.log("cursor finished!");
          resolve(Promise.all(deletePromises));
        } else {
          if (!!e.target.result.value._winningRev && counter >= start && counter < end) {
            const _id = e.target.result.value._id;
            deletePromises.push(this.delete(_id));
            counter += 1;
          }
          cursor.continue()
        }
      }
    })
  }

  editFirstNDocuments(n) {
    return new Promise((resolve, reject) => {
      let updatePromises = [];
      let counter = 0;
      this.idb.getStore(this.idb._meta, 'readonly').openCursor().onsuccess = e => {
        const cursor = e.target.result;
        if (!cursor) {
          console.log('Cursor finished!');
          resolve(Promise.all(updatePromises));
        } else {
          if (!!e.target.result.value._winningRev && counter < n) {
            const _id = e.target.result.value._id;
            updatePromises.push(
              this.read(_id)
                .then(doc => {
                  let newDoc = Object.assign(doc, { age: Math.floor(Math.random() * 100000000000 + 1) });
                  return this.update(_id, newDoc);
                })
            );
          }
          counter++;
          cursor.continue();
        }
      }
    })
  }
}



export default TurtleDB;

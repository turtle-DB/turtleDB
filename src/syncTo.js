import uuidv4 from 'uuid/v4';
import axios from 'axios';
const debug = require('debug');

var log = debug('turtleDB:syncTo');

class SyncTo {
  constructor(targetUrl, batchLimit) {
    this.targetUrl = targetUrl;
    this.sessionID = new Date().toISOString();
    this.revIdsFromTortoise = [];
    this.batchLimit = batchLimit;
  }

  start() {
    return this.checkServerConnection('/connect')
      .then(() => this.getSyncToTortoiseDoc())
      .then(() => this.getHighestTurtleKey())
      .then(() => this.sendRequestForLastTortoiseKey('/_last_tortoise_key'))
      .then(() => this.getChangedMetaDocsForTortoise())
      .then(() => this.batchSendChangedMetaDocsToTortoise('/_missing_rev_ids'))
      .then(() => this.getStoreDocsForTortoise())
      .then(() => this.createNewSyncToTortoiseDoc())
      .then(() => this.batchSendTurtleDocsToTortoise('/_insert_docs'))
      .then(() => this.updateSyncToTortoiseDoc())
      .catch(err => console.log('Sync To Error:', err));
  }

  // #0 HTTP GET '/connect'

  checkServerConnection(path) {
    return axios.get(this.targetUrl + path)
      .then(res => {
        log(`\n #0 HTTP <==> Tortoise connection checked`);
        return res.status === 200 ? true : false;
      })
      .catch((error) => {
        if (!error.response) {
          // network error
          return Promise.reject('Failed to connect to server');
        } else {
          console.log('Sync To Error:', err)
        }
      });
  }

  // #1 - #2 HTTP POST '/_last_tortoise_key'

  getSyncToTortoiseDoc() {
    return this.idb.command(this.idb._syncToStore, "READ_ALL", {})
      .then(syncRecords => this.syncToTortoiseDoc = syncRecords[0])
      .then(() => log('\n getSyncToTortoiseDoc() - Get record of previous syncs to Tortoise'))
  }

  getHighestTurtleKey() {
    return this.idb.command(this.idb._store, "GET_ALL_KEYS", {})
      .then(keys => {
        const lastKey = keys[keys.length - 1];
        this.highestTurtleKey = lastKey ? lastKey : 0;
        log(`\n getHighestTurtleKey() - Get highest primary key in the Turtle store (${this.highestTurtleKey})`)
      });
  }

  sendRequestForLastTortoiseKey(path) {
    log('\n #1 HTTP ==> to Tortoise requesting checkpoint from last sync');
    return axios.post(this.targetUrl + path, this.syncToTortoiseDoc)
      .then(res => {
        this.lastTortoiseKey = res.data;
        log(`\n #2 HTTP <== receive response from Tortoise with checkpoint (${this.lastTortoiseKey})`);
      })
  }

  // #3 - 4 HTTP POST '/_missing_rev_ids'

  getChangedMetaDocsForTortoise() {
    if (this.lastTortoiseKey === this.highestTurtleKey) {
      return Promise.reject("No sync needed - last key and highest key are equal");
    } else {
      return this.getMetaDocsBetweenStoreKeys(this.lastTortoiseKey, this.highestTurtleKey)
        .then(metaDocs => this.changedTurtleMetaDocs = metaDocs)
        .then(() => {
          log(`\n getChangedMetaDocsForTortoise() - Get metadocs for all records between ${this.lastTortoiseKey} - ${this.highestTurtleKey} in the store`);
          log(`\n getChangedMetaDocsForTortoise() - Found ${this.changedTurtleMetaDocs.length} metadocs to send to Tortoise`);
        })
    }
  }

  batchSendChangedMetaDocsToTortoise(path) {
    if (this.changedTurtleMetaDocs.length === 0) {
      log(`\n finished sending all batches of metadocs to Tortoise`);
      return;
    }
    let currentBatch = this.changedTurtleMetaDocs.splice(0, this.batchLimit);

    return this.sendBatchOfMetaDocs(path, currentBatch)
      .then(() => {
        return this.batchSendChangedMetaDocsToTortoise(path);
      });
  }

  sendBatchOfMetaDocs(path, batch) {
    log(`\n #3 HTTP ==> Sending batch of ${batch.length} metadocs to Tortoise`);

    return axios.post(this.targetUrl + path, { metaDocs: batch })
      .then((revIdsFromTortoise) => {
        log(`\n #4 HTTP <== Response from Tortoise requesting ${revIdsFromTortoise.data.length} leaf revs/docs`);
        this.revIdsFromTortoise.push(...revIdsFromTortoise.data);
      });
  }

  // #5 - 6 HTTP POST '/_insert_docs'

  getStoreDocsForTortoise() {
    const promises = this.revIdsFromTortoise.map(_id_rev => {
      return this.idb.command(this.idb._store, "INDEX_READ", { data: { indexName: '_id_rev', key: _id_rev } });
    });
    return Promise.all(promises)
      .then(docs => this.storeDocsForTortoise = docs)
      .then(() => log(`\n getStoreDocsForTortoise() - Get ${this.storeDocsForTortoise.length} changed records for Tortoise`))
  }

  createNewSyncToTortoiseDoc() {
    let newHistory = { lastKey: this.highestTurtleKey, sessionID: this.sessionID };
    this.newSyncToTortoiseDoc = Object.assign(
      this.syncToTortoiseDoc, { history: [newHistory].concat(this.syncToTortoiseDoc.history) }
    );
    log('\n createNewSyncToTortoiseDoc() - prepare updated record of sync history with Tortoise');
  }

  batchSendTurtleDocsToTortoise(path) {
    let currentBatch = this.storeDocsForTortoise.splice(0, this.batchLimit);

    if (this.storeDocsForTortoise.length === 0) {
      return this.sendBatchOfDocs(path, currentBatch, true)
        .then(() => log(`\n finished sending all batches of metadocs to Tortoise`));
    } else {
      return this.sendBatchOfDocs(path, currentBatch)
        .then(() => {
          return this.batchSendTurtleDocsToTortoise(path);
        });
    }
  }

  sendBatchOfDocs(path, batch, lastBatch = false) {
    let payload = { docs: batch };

    if (lastBatch) {
      payload.newSyncToTortoiseDoc = this.newSyncToTortoiseDoc;
      payload.lastBatch = lastBatch;
    }

    log(`\n #5 HTTP ==> Sending batch of ${batch.length} docs to Tortoise ${lastBatch ? 'with sync history' : ''}`);
    return axios.post(this.targetUrl + path, payload);
  }

  updateSyncToTortoiseDoc() {
    log('\n #6 HTTP <== receive confirmation from Tortoise, update sync history');
    return this.idb.command(this.idb._syncToStore, "UPDATE", { data: this.newSyncToTortoiseDoc });
  }

  // Utility Methods

  getMetaDocsBetweenStoreKeys(lastTortoiseKey, highestTurtleKey) {
    return this.idb.command(this.idb._store, "READ_BETWEEN", { x: lastTortoiseKey, y: highestTurtleKey })
      .then(docs => this.getUniqueIDs(docs))
      .then(ids => this.getMetaDocsByIDs(ids))
  }

  getUniqueIDs(docs) {
    let ids = {};
    for (let i = 0; i < docs.length; i++) {
      const id = docs[i]._id_rev.split("::")[0];
      if (ids[id]) continue;
      ids[id] = true;
    }
    const uniqueIDs = Object.keys(ids);
    return uniqueIDs;
  }

  getMetaDocsByIDs(ids) {
    let promises = [];
    ids.forEach(_id => promises.push(this.idb.command(this.idb._meta, "READ", { _id })))
    return Promise.all(promises);
  }
}

export default SyncTo;

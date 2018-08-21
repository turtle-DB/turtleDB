import axios from 'axios';

const debug = require('debug');
var log = debug('turtleDB:syncFrom');

class SyncFrom {
  constructor(targetUrl) {
    this.targetUrl = targetUrl;
    this.sessionID = new Date().toISOString();
    this.metaDocsFromTortoise = [];

    this.updatedMetaDocs = [];
    this.newTortoiseMetaDocs = [];

    this.docsFromTortoise = [];
  }

  start() {
    return this.checkServerConnection('/connect')
      .then(() => this.getTurtleID())
      .then(() => this.getLastTurtleKey())
      .then(() => this.sendRequestForTortoiseMetaDocs('/_changed_meta_docs'))
      .then(() => this.findMissingRevIds())
      .then(() => this.sendRequestForTortoiseDocs('/_changed_docs'))
      .then(() => this.insertUpdatedMetaDocs())
      .then(() => this.insertNewDocsIntoStore())
      .then(() => this.updateSyncFromTortoiseDoc())
      .then(() => this.sendSuccessConfirmation('/_confirm_sync'))
      .catch((err) => console.log('Sync From Error:', err));
  }

  checkServerConnection(path) {
    return axios.get(this.targetUrl + path)
      .then((res) => {
        log(`\n #0 HTTP <==> Tortoise connection checked`);
        return res.status === 200 ? true : false;
      })
      .catch((error) => {
        if (!error.response) {
          // network error
          return Promise.reject('Failed to connect to server');
        } else {
          // http status code
          const code = error.response.status
          // response data
          const response = error.response.data
        }
      });
  }

  getTurtleID() {
    return this.idb.command(this.idb._turtleDBMeta, "READ_ALL", {})
      .then(docs => {
        log(`\n getTurtleID()`);
        return this.turtleID = docs[0]._id;
      });
  }

  getLastTurtleKey() {
    return this.idb.command(this.idb._syncFromStore, "READ_ALL", {})
      .then(docs => {
        log(`\n getLastTurtleKey()`);
        const syncFromTortoiseDoc = docs[0];
        this.lastTurtleKey = syncFromTortoiseDoc.history.length === 0 ? '0' : syncFromTortoiseDoc.history[0].lastKey;
        log(`\n Get TurtleDBs ID and local checkpoint (${this.lastTurtleKey}) from previous sync session`);
      })
  }

  // #1 - #2 HTTP POST '/_changed_meta_docs'

  sendRequestForTortoiseMetaDocs(path) {
    return this.sendInitialMetaDocRequest(path)
      .then(({ data }) => {
        log(`\n #2 HTTP <== from Tortoise with ${data.metaDocs.length} changed metadocs`);
        if (data.metaDocs.length === 0) {
          return Promise.reject("0 metadocs recieved from Tortoise - no sync needed");
        } else {
          this.metaDocsFromTortoise.push(...data.metaDocs);

          if (!data.lastBatch) {
            return this.sendNextMetaDocRequest(path);
          } else {
            log(`\n Recieved all metadocs from Tortoise`);
            return;
          }
        }
      });
  }

  sendInitialMetaDocRequest(path) {
    log('\n #1 HTTP ==> Initial request to Tortoise requesting any changed metadocs');
    return axios.post(this.targetUrl + path, { turtleID: this.turtleID, lastTurtleKey: this.lastTurtleKey, initial: true });
  }

  sendNextMetaDocRequest(path) {
    log('\n #1 HTTP ==> NEXT request to Tortoise requesting any changed metadocs');
    return axios.post(this.targetUrl + path, { initial: false })
      .then(({ data }) => {
        log(`\n #2 HTTP <== from Tortoise with ${data.metaDocs.length} changed metadocs`);
        this.metaDocsFromTortoise.push(...data.metaDocs);

        if (!data.lastBatch) {
          return this.sendNextMetaDocRequest(path);
        } else {
          log(`\n Recieved all metadocs from Tortoise`);
          return;
        }
      });
  }


  findMissingRevIds() {
    // returns a list of all tortoise leaf nodes that turtle doesn't have
    const missingLeafNodes = [];

    const promises = this.metaDocsFromTortoise.map(tortoiseMetaDoc => {
      return this.idb.command(this.idb._meta, "READ", { _id: tortoiseMetaDoc._id })
        .then(turtleMetaDoc => {

          if (turtleMetaDoc) {
            if (JSON.stringify(turtleMetaDoc._revisions) === JSON.stringify(tortoiseMetaDoc._revisions)) {
              return;
            } else {
              return this.findMissingLeafRevs(tortoiseMetaDoc)
                .then((idRevs) => {
                  missingLeafNodes.push(...idRevs);
                  // Probably/definitely shouldn't do this here...probably should wait until we recieve all the docs from Tortoise as well
                  // So we don't end up with half the meta docs inserted and none of the docs...
                  // Do this somewhere later? Save them up to an array? Like this:
                  this.updatedMetaDocs.push(tortoiseMetaDoc);

                  // Instead of this:
                  // return this.idb.command(this.idb._meta, "UPDATE", { data: tortoiseMetaDoc });
                });
            }
          } else {
            let revs = this.collectAllLeafRevs(tortoiseMetaDoc._revisions);
            let idRevs = revs.map(rev => tortoiseMetaDoc._id + '::' + rev);
            missingLeafNodes.push(...idRevs);
            // Probably/definitely shouldn't do this here...probably should wait until we recieve all the docs from Tortoise as well
            // So we don't end up with half the meta docs inserted and none of the docs...
            // Do this somewhere later? Save them up to an array? Like this:
            this.newTortoiseMetaDocs.push(tortoiseMetaDoc);

            // Instead of this:
            // return this.idb.command(this.idb._meta, "CREATE", { data: tortoiseMetaDoc });
          }
        })
    });

    return Promise.all(promises)
      .then(() => this.missingRevIds = missingLeafNodes)
      .then(() => log(`\n findMissingRevIds() - Turtle requires ${this.missingRevIds.length} missing leaf revisions from Tortoise`));
  }

  findMissingLeafRevs(tortoiseMetaDoc) {
    const leafRevs = this.collectAllLeafRevs(tortoiseMetaDoc._revisions);
    const docId = tortoiseMetaDoc._id;
    const leafIdRevs = leafRevs.map(rev => docId + '::' + rev);

    return this.idb.getStoreDocsByIdRevs(leafIdRevs)
      .then((turtleDocs) => {
        // note: here returns an array w/ some undefined, some docs
        const existingTurtleIdRevs = turtleDocs.filter(d => d).map(doc => doc._id_rev);
        return leafIdRevs.filter(idRev => !existingTurtleIdRevs.includes(idRev));
      });
  }

  collectAllLeafRevs(node, leafRevs = []) {
    if (node[2].length === 0) {
      leafRevs.push(node[0]);
    }

    for (let i = 0; i < node[2].length; i++) {
      this.collectAllLeafRevs(node[2][i], leafRevs);
    }

    return leafRevs;
  }

  // #3 - #4 HTTP POST '/_changed_docs'

  sendRequestForTortoiseDocs(path) {
    return this.sendInitialDocsRequest(path)
      .then((res) => this.handleTortoiseDocsResponse(res, path));
  }

  sendInitialDocsRequest(path) {
    log(`\n #3 HTTP ==> to Tortoise initial request for ${this.missingRevIds.length} missing store docs`);
    return axios.post(this.targetUrl + path, { revIds: this.missingRevIds, initial: true });
  }

  sendNextDocsRequest(path) {
    log('\n #3 HTTP ==> to Tortoise follow up request for more store docs');
    return axios.post(this.targetUrl + path, { initial: false })
      .then((res) => this.handleTortoiseDocsResponse(res, path));
  }

  handleTortoiseDocsResponse(response, path) {
    const data = response.data;
    log(`\n #4 HTTP <== from Tortoise with ${data.docs.length} store docs`);

    this.docsFromTortoise.push(...data.docs);

    if (!data.lastBatch) {
      return this.sendNextDocsRequest(path);
    } else {
      this.syncToTurtleDoc = data.newSyncToTurtleDoc;
      log(`\n Recieved all docs from Tortoise`);
      return;
    }
  }

  // Insert and Update All Documents

  insertUpdatedMetaDocs() {
    const updatePromises = this.updatedMetaDocs.map((metaDoc) => {
      return this.idb.command(this.idb._meta, "UPDATE", { data: metaDoc });
    });

    const createPromises = this.newTortoiseMetaDocs.map((metaDocs) => {
      return this.idb.command(this.idb._meta, "CREATE", { data: metaDocs });
    });

    const metadocPromises = [...updatePromises, ...createPromises];

    return Promise.all(metadocPromises)
      .then(() => log('\n all recieved metadocs inserted into Turtle metastore'));
  }


  insertNewDocsIntoStore() {
    const promises = this.docsFromTortoise.map((doc) => {
      return this.idb.command(this.idb._store, "CREATE", { data: doc });
    });

    return Promise.all(promises)
      .then(() => log('\n all recieved docs inserted into Turtle store'));
  }


  updateSyncFromTortoiseDoc() {
    return this.idb.command(this.idb._syncFromStore, "UPDATE", { data: this.syncToTurtleDoc })
      .then(() => log('\n new sync from history document inserted'));
  }

  // #5 HTTP GET '/_confirm_sync'

  sendSuccessConfirmation(path) {
    log('\n #5 HTTP ==> to Tortoise with confirmation of sync');
    return axios.get(this.targetUrl + path);
  }
}


export default SyncFrom;

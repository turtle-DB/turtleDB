import md5 from 'md5';
import uuidv4 from 'uuid/v4';

const developerAPI = {
  setRemote(remoteUrl) {
    this.remoteUrl = remoteUrl;
  },

  sync() {
    if (!this.syncInProgress) {
      this.syncInProgress = true;
      return this.syncTo()
        .then(() => this.syncFrom())
        .then(() => this.syncInProgress = false)
        .catch((err) => console.log(err));
    } else {
      return Promise.reject('Sync already in progress');
    }
  },

  create(data) {
    if (typeof data === 'object' && !Array.isArray(data)) {
      let newDoc = Object.assign({}, data);

      let _id;
      if (!newDoc._id && newDoc._id !== 0) {
        _id = uuidv4();
      } else {
        _id = newDoc._id;
        delete newDoc._id;
      }

      const _rev = '1-' + md5(JSON.stringify(newDoc));
      newDoc._id_rev = _id + '::' + _rev;

      let metaDoc = {
        _id,
        _winningRev: _rev,
        _revisions: [_rev, {}, []],
        _leafRevs: [_rev]
      };

      return this.idb.command(this.idb._meta, "CREATE", { data: metaDoc })
        .then(() => this.idb.command(this.idb._store, "CREATE", { data: newDoc }))
        .catch(err => console.log("Create error:", err));
    } else {
      console.log('Please pass in a valid object.');
    }
  },

  read(_id, revId = null) {
    return this._readMetaDoc(_id)
      .then(metaDoc => {
        let rev;

        if (!metaDoc._winningRev) {
          throw new Error("This document has been deleted.");
        } else if (!revId) {
          rev = metaDoc._winningRev;
        } else {
          if (metaDoc._leafRevs.includes(revId)) {
            rev = revId;
          } else {
            throw new Error("Invalid Revision Id");
          }
        }

        return this._readRevFromIndex(_id, rev);
      })
      .then(doc => {
        const data = Object.assign({}, doc);
        [data._id, data._rev] = data._id_rev.split('::');
        delete data._id_rev;
        return data;
      })
      .catch(err => console.log("Read error:", err));
  },

  //requires a full document. will not append updates.
  update(_id, newProperties, revId = null) {
    let metaDoc;
    let newDoc;
    let rev;

    return this._readMetaDoc(_id)
      .then(doc => {
        // save metaDoc to be used later
        metaDoc = doc;

        if (!metaDoc._winningRev) {
          throw new Error("This document has been deleted.");
        } else if (!revId) {
          rev = metaDoc._winningRev;
        } else {
          if (metaDoc._leafRevs.includes(revId)) {
            rev = revId;
          } else {
            throw new Error("Invalid Revision Id");
          }
        }

        // return this._readRevFromIndex(_id, rev);
        return rev;
      })
      .then(oldRev => {
        newDoc = this._generateNewDoc(_id, oldRev, newProperties);
        this.idb.command(this.idb._store, "CREATE", { data: newDoc });

        return {
          newRev: newDoc._id_rev.split('::')[1],
          oldRev: rev
        };
      })
      .then(({ newRev, oldRev }) => {
        // updating the meta doc:
        this._updateMetaDocRevisionTree(metaDoc._revisions, newRev, oldRev, newProperties._deleted);

        if (newProperties._deleted) {
          metaDoc._leafRevs.splice(metaDoc._leafRevs.indexOf(oldRev), 1);
        } else {
          metaDoc._leafRevs[metaDoc._leafRevs.indexOf(oldRev)] = newRev;
        }

        metaDoc._winningRev = this._getWinningRev(metaDoc._leafRevs) || null;

        return this.idb.command(this.idb._meta, "UPDATE", { data: metaDoc });
      })
      .then(() => {
        const data = Object.assign({}, newDoc);
        [data._id, data._rev] = data._id_rev.split('::');
        delete data._id_rev;
        return data;
      })
      .catch(err => console.log("Update error:", err));
  },

  delete(_id, revId = null) {
    return this.update(_id, { _deleted: true }, revId);
  },


  autoSyncOn() {
    this.intervalId = setInterval(this.sync.bind(this), 3000);
  },

  autoSyncOff() {
    clearInterval(this.intervalId);
  },

  compactStore() {
    const allLeafIdRevs = [];

    return this.idb.command(this.idb._meta, "READ_ALL", {})
      .then((metaDocs) => {
        metaDocs.forEach(metaDoc => {
          let idRevs = metaDoc._leafRevs.map(rev => metaDoc._id + '::' + rev);
          allLeafIdRevs.push(...idRevs);
        });

        this.idb.getStore(this.idb._store, 'readwrite').openCursor().onsuccess = (e) => {
          let cursor = e.target.result;

          if (cursor) {
            let doc = cursor.value;
            // If document is not a leaf rev
            if (!allLeafIdRevs.includes(doc._id_rev) && !doc._deleted) {
              var request = cursor.delete();
            }
            cursor.continue();
          } else {
            console.log('Compation deletion finished!');
          }
        }
      })
  },

  getStorageInfo() {
    return navigator.storage.estimate()
      .then(({ quota, usage }) => {
        return {
          // Quota here is total/shared temporary storage space available for all Chrome apps
          // Technically, one app/origin (like localhost) only has access to 20% of this value
          appUsage: this.sizeOf(usage),
          appQuota: this.sizeOf(quota * 0.2),
          totalQuota: this.sizeOf(quota)
        };
      });
  },

  // BULK OPERATIONS

  filterBy(selector) {
    return this.idb.filterBy(selector);
  },

  deleteAll() {
    return this.idb.command(this.idb._store, "DELETE_ALL", {});
  },

  dropDB() {
    return this.idb.dropDB();
  },
}

export default developerAPI;

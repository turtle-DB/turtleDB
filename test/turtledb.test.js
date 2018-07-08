const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const turtleDBTest = require('./src/turtleDB/turtle');

const expect = chai.expect;
chai.use(chaiAsPromised);

describe('simple CRUD operations', function() {
  before(function() {
    // turtleDBTest.deleteAllData();

  });

  it('should create a document in store', function() {
    const newItem = { name: 'mocha', type: 'drink' };
    const tx = turtleDBTest.db.transaction(['store'], 'create');
    const store = tx.objectStore('store');

    const result = turtleDBTest
      .create({ data: sample })
      .then((uuid) => {
        newId = uuid;
        const request = store.getAll();
        request.onsuccess = () => Promise.resolve(request.result);
      });

    expect(result[0]).to.eventually.have.property('name', 'mocha');
    expect(result[0]).to.eventually.have.property('type', 'drink');
  });

  // it('should read a document with uuid', function() {
  //   let doc = turtleDBTest.read(newId);
  //
  //   return expect(doc).to.eventually
  // });
});



// describe('Array', function() {
//   it('should start empty', function() {
//     // Test implementation goes here
//   });
//
//   // We can have more its here
// });


//deep obj comparison
// return expect(value).to.eventually.become(obj)

let dbName = 'turtleDB';

const turtle = new TurtleDB(dbName);

function setHeader() {
  var dbHeader = document.getElementById("db-name");
  dbHeader.innerHTML = dbName;
}

function eventListeners() {
  document.getElementById("insert-form")
    .addEventListener("submit", (event) => {
      event.preventDefault();
      addDocWithID(event.target);
      renderAllDocs();
    });

  document.getElementById("all-docs")
    .addEventListener("click", (event) => {
      event.preventDefault();
      consoleLogDocs();
    });

  document.getElementById("fetch-form")
    .addEventListener("submit", (event) => {
      event.preventDefault();
      fetchWithID(event.target.id.value);
    });

  document.getElementById('update-form')
    .addEventListener("", (event) => {
      updateDoc(event.target);
    });

  document.getElementById('delete-db')
    .addEventListener('click', (event) => {
      event.preventDefault();
      deleteDatabase();
    });

  renderAllDocs();
  setHeader();
}

function addDocWithID(form) {
  turtle.set({
    id: form.id.value,
    title: form.title.value
  })
    .then(function (res) {
      console.log(res);
      form.id.value = '';
      form.title.value = '';
    })
    .catch(function (err) {
      console.error(err);
    });
}

function renderAllDocs() {
  turtle.allDocs()
    .then((res) => {
      renderDocs(res);
    })
    .catch(function (err) {
      console.error(err);
    });
}

function renderDocs(docs) {
  var ul = document.getElementById("docs");
  ul.innerHTML = "";
  docs.forEach((doc) => {
    ul.appendChild(renderDoc(doc));
  });
}

function renderDoc(doc) {
  var li = document.createElement("li");
  li.classList.add("list-group-item");
  li.innerHTML = `ID: ${doc.id}, Title: ${doc.title}`;
  return li;
}

function consoleLogDocs() {
  turtle.allDocs()
    .then((res) => {
      console.log(res);
    }).catch((err) => {
      console.log(err);
    });
}

function fetchWithID(id) {
  turtle.get(id)
    .then((res) => {
      console.log(res);
    }).catch((err) => {
      console.log(err);
    });
}

function updateDoc(form) {
  // turtle.update?
}

function deleteDatabase() {
  turtle.delete()
    .then((res) => {
      console.log(res);
    }).catch((err) => {
      console.log(err);
    });
}

window.addEventListener("DOMContentLoaded", eventListeners);
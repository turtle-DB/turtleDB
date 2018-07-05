////2nd file

const turtle = new TurtleDB('turtleDB');

function eventListeners() {
  document.getElementById("insert-form")
    .addEventListener("submit", function (event) {
      // event.preventDefault();
      addDocWithID(event.target);
    });

  document.getElementById("all-docs")
    .addEventListener("click", (event) => {
      event.preventDefault();
      consoleLogDocs();
    });

  document.getElementById("fetch-form")
    .addEventListener("submit", function (event) {
      event.preventDefault();
      fetchWithID(event.target.id.value);
    });

  renderAllDocs();
}

function consoleLogDocs() {
  turtle.allDocs()
    .then((res) => {
      console.log(res);
    }).catch((err) => {
      console.log(err);
    });
}

function renderDoc(doc) {
  console.log(doc);
  var li = document.createElement("li");
  li.classList.add("list-group-item");
  li.innerHTML = `ID: ${doc._id}, Title: ${doc.title}`;
  return li;
}

function renderDocs(docs) {
  var ul = document.getElementById("docs");
  ul.innerHTML = "";
  docs.forEach((doc) => {
    ul.appendChild(renderDoc(doc));
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

function addDocWithID(form) {
  turtle.set({
    title: form.title.value,
    _id: form.id.value,
    done: false
  })
    .then(function (res) {
      console.log(res);
      form.title.value = "";
      form.title.id = "";
      form.title.focus();
      renderAllDocs();
    })
    .catch(function (err) {
      console.error(err);
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

window.addEventListener("DOMContentLoaded", eventListeners);

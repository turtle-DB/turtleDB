import React, { Component } from 'react';

class App extends Component {
  render() {
    return (
      <div className="container">
        <h4>DB Name: <span id="db-name"></span></h4>
        <button className="btn btn-danger" id="delete-db">Delete This Database</button>

        <h2>(CREATE) Insert A Document</h2>
        <form className="form-inline" id="insert-form">
          <div className="form-group">
            <input className="form-control" type="text" name="id" placeholder="Id" />
            <input className="form-control" type="text" name="title" placeholder="Title" />
            <input className="btn btn-primary" type="submit" value="Add" />
          </div>
        </form>

        <h2>(READ) Fetch A Document By Id</h2>
        <form className="form-inline" id="fetch-form">
          <div className="form-group">
            <input className="form-control" type="text" name="id" placeholder="Id" />
            <input className="btn btn-primary" type="submit" value="Fetch" />
          </div>
        </form>

        <h2>UPDATE A Document</h2>
        <form className="form-inline" id="update-form">
          <div className="form-group">
            <input className="form-control" type="text" name="id" placeholder="Id" />
            <input className="form-control" type="text" name="title" placeholder="New Title" />
            <input className="btn btn-primary" type="submit" value="Update" />
          </div>
        </form>

        <h2>DELETE A Document</h2>
        <form className="form-inline" id="delete-form">
          <div className="form-group">
            <input className="form-control" type="text" name="id" placeholder="Id" />
            <input className="btn btn-primary" type="submit" value="Delete" />
          </div>
        </form>

        <hr />

        <h2>Console Log All Docs</h2>
        <button className="btn btn-primary" id="all-docs">Console Log All Docs</button>

        <hr />

        <h2>All Documents</h2>
        <ul id="docs" className="list-group"></ul>
      </div>
    )
  }
}

export default App;

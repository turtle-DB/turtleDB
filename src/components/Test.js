import React, { Component } from 'react';

export default class Test extends React.Component {
  render() {
    return (
      <div>
        <div className="container">
          <h2>Insert Documents</h2>

          <form className="form-inline" id="insert-form">
            <div className="form-group">
              <input className="form-control" type="text" name="title" placeholder="Title"/>
              <input className="form-control" type="text" name="id" placeholder="Id"/>
              <input className="btn btn-primary" type="submit" value="Add"/>
            </div>
          </form>

          <h2>Console Log All Docs</h2>
          <button className="btn btn-primary" id="all-docs">Console Log All Docs</button>

          <h2>Fetch A Document By Id</h2>
          <form className="form-inline" id="fetch-form">
            <div className="form-group">
              <input className="form-control" type="text" name="id" placeholder="Id"/>
              <input className="btn btn-primary" type="submit" value="Fetch"/>
            </div>
          </form>

          <h2>All Documents</h2>
          <ul id="docs" className="list-group"></ul>
        </div>
      </div>
    )
  }
}

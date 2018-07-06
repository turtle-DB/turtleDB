import React, { Component } from 'react';
import About from './components/About'
import Header from './components/Header'

class App extends Component {
  render() {
    return (
      <div>
        <Header/>
        <About/>
      </div>
    );
  }
}

export default App;

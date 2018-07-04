import React from 'react';
// import logo from '../assets/images/logo.svg';

const Header = () => (
  <header>
    <div className='container'>
      <div className='five columns'>
        <div id='logo-text'>
          {/* <FilterLink filter='home'> */}
            <h1>
              {/* <img
                alt='O'
                className='logo'
                src={logo}
              /> */}
            TurtleDB</h1>
          {/* </FilterLink> */}
        </div>
      </div>
      <nav className='label seven columns'>
        {/* <FilterLink exact filter='home'>Home</FilterLink>
        <FilterLink filter='play'>Play</FilterLink>
        <FilterLink exact filter='about'>About</FilterLink>
        <FilterLink exact filter='Help'>Help</FilterLink> */}
        <a href=''>About</a>
        <a href=''>Team</a>
        <a href=''>GitHub</a>
      </nav>
    </div>
  </header>
);

export default Header;

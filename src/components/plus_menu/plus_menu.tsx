import { useState } from 'react';
import './plus_menu.css';
import { PlusMenuExtension } from './plus_menu_extension';

const PlusMenu = () => {
  const [showExtension,setShoewExtension]=useState(false);
  const extensionController=()=>{
    setShoewExtension(prev=>!prev);
  }
  return (
    <div className="plus_menu">
      <div>Add photos & files</div>
      <div>Create image</div>
      <div>Thinking</div>
      <div>Deep research</div>
      <div onClick={extensionController}>More</div>
      {showExtension && <div className='plus_menu_ext_wrapper'><PlusMenuExtension/></div>}
    </div>
  );
};

export default PlusMenu;
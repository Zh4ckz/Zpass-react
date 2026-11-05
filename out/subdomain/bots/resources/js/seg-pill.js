(function(){
  function setup(seg){
    var pill=document.createElement('i');pill.className='seg-pill';seg.prepend(pill);
    function move(){
      var a=seg.querySelector('button.active');if(!a)return;
      pill.style.width=a.offsetWidth+'px';
      pill.style.transform='translateX('+a.offsetLeft+'px)';
    }
    seg.addEventListener('click',function(){setTimeout(move,0)});
    window.addEventListener('resize',move);
    window.addEventListener('zpass:languagechange',function(){setTimeout(move,200)});
    setTimeout(move,50);setTimeout(move,500);
    if(document.fonts&&document.fonts.ready)document.fonts.ready.then(move);
  }
  document.querySelectorAll('.segmented').forEach(setup);
})();

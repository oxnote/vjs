//고유한 ID를 가진 tweenable 객체를 생성한다.
//생성기 ani.queue에 보관되었다가 finish/stop 될때 생성하고 큐에서 제거한다.
//Element에 적용되는 경우 el.aniId에 id를 보관해둔다.
// Element의 Animation 상태는 queue[aniId]를 참조해 알아내고 stop/pause/resume 중에서 선택한다.
// Animation이 끝나면 promise 성공 또는 실패시 delete el.aniId
v.ani = function(duration, easing, delay){

  this.id = v.uniqueId('A');  //A0 A1으로 Element의 aniId 속서에 부착한다.

  var prom = v.promise();
  this.prom = prom;
  this.tweenable = new Tweenable();

  var onfinish = function(state){
    delete v.ani.queue[this.id];
    this.tweenable.dispose();
    prom(true, [state]);
  }.bind(this);

  this.options = {
    from : {},
    to : {},
    duration : duration || 400,
    delay : delay || 0,
    step : undefined,
    finish : onfinish,
    easing : easing || 'easeOutQuad'
  };

  v.ani.queue[this.id] = this;
  
};

v.ani.queue = {};

v.ani.prototype.from = function(pos){
  this.options.from = pos;
  return this;
}

v.ani.prototype.to = function(pos){
  this.options.to = pos;
  return this;
}

v.ani.prototype.step = function(func){
  this.options.step = func;
  return this;
}

v.ani.prototype.start = function(){
  this.tweenable.tween(this.options);
  return this.prom;
}

v.ani.moveX = function(el, from, to, duration){
  if (typeof el !== 'object') return;
  var ani;
  if (el.ani && el.ani.tweenable.isPlaying()){
      el.ani.tweenable.stop();
      ani = el.ani;
  } else {
      ani = new v.ani(duration);
      el.ani = ani;
  }
  ani.from({x:from});
  ani.to({x:to});
  ani.step(function(d){
    el.transform("translateX(" + d.x + "%)", "left",  d.x + "%")}
  );
  return ani.start();
}

v.ani.moveY = function(el, from, to, duration){
  if (typeof el !== 'object') return;
  var ani;
  if (el.ani && el.ani.tweenable.isPlaying()){
      el.ani.tweenable.stop();
      ani = el.ani;
  } else {
      ani = new v.ani(duration);
      el.ani = ani;
  }

  ani.from({y:from});
  ani.to({y:to});
  ani.step(function(d){el.transform("translateY(" + d.y + "%)", "top", d.y + "%")});
  return ani.start();
}

/**
  v.ani.swiper($('.swiper-container), 
  {
    slides    : '
    pagination : '.swiper-pagination',
  })
 */
v.ani.swiper = function(container, options){
  var opt = options || {};
  var size = v.css.getSize(container);
  var pages = container.$$('.swiper-slide');
  var curIndex = 0;
  var pagination = opt.pagination ? container.$(opt.pagination) : null;
  var curPos;
  
  function paginateButtonClick(el){
    curIndex = this.index;
    rearrange(0, this.index);
  }
  
  if (pagination){
    for(var i = 0; i<pages.length; i++){
      var btn = document.createElement('span');
      btn.className = 'swiper-pagination-bullet';
      btn.onclick = paginateButtonClick.bind({index:i});
      pagination.appendChild(btn);
    }
  }

  
  var sObj = new ListenTouchEvent(container);
  sObj.down = function(data){
    curPos = v.css.getPos(pages[curIndex]);
  };
  
  function rearrange(offset, index)
  {
    for(var i = 0; i< pages.length; i++)
    {
      if (i===index) pagination.children[i].css('active', 'active');
      else  pagination.children[i].css('active', '');
      
      var x = (i - index) * size[0];
      if (v.transform.name)  pages[i].style[v.transform.name] = 'translate('+(x+offset)+'px, 0px)';
      else pages[i].style['left'] = (x+offset)+'px';
    }
  }
  
  rearrange(0, curIndex);
  
  sObj.up = function(data){
    if (curIndex === 0 && data.dx > 0) return;
    if (curIndex === pages.length-1 && data.dx < 0 ) return;
        
    //from Right 
    var auto = new v.ani(data.t);
    //현재 위치와 방향으로 새 인덱스 페이지를 로드할지 결정한다.
    var finalX = curPos.x + data.dx;
    var centerX = size[0] * 0.5;
    var newIndex = curIndex;

    //오른쪽에서 온 경우 
    if (data.dx < 0){
      if (-finalX > centerX){
        if (newIndex < pages.length-1) newIndex++;
      } 
    } else {
      if (finalX > centerX){
        if (newIndex > 0) newIndex--;
      } 
    }
    
    if (newIndex === curIndex){ //현재 페이지를 원상 복구 
      auto = auto.from({x:data.p[0]}).to({x:0})
      auto.step(function(pos){
        rearrange(pos.x, curIndex);
//        pages[curIndex].style[v.transform.name] = "translateX(" + (pos.x) + "px)";
      }).start();
    } else {
      if (data.dx < 0) auto = auto.from({x:data.p[0]}).to({x:-size[0]});
      else auto = auto.from({x:data.p[0]}).to({x:size[0]});
      auto.step(function(pos){
        rearrange(pos.x, curIndex);
//        pages[curIndex].style[v.transform.name] = "translateX(" + (pos.x) + ")";
      }).start().then(function(d){
        curIndex = newIndex;
        rearrange(0, curIndex);
      });
    }
  };

  sObj.move = function(data){
    if (curIndex === 0 && data.dx > 0) return;
    if (curIndex === pages.length-1 && data.dx < 0 ) return;
    rearrange(data.dx, curIndex);
/*    pages[curIndex].style[v.transform.name] = "translateX(" + (curPos.x + data.dx) + "px)";
    if (curIndex < pages.length-1) pages[curIndex+1].style[v.transform.name] = "translateX(" + (curPos.x + data.dx) + "px)";
    if (curIndex > 0) pages[curIndex-1].style[v.transform.name] = "translateX(" + (curPos.x + data.dx) + "px)";*/
  };
};

/**
 * v.router + v.render
 * v.router.config()
 * v.router.routes(route, routeInfoObjet)
 * v.router.load(route [,target])
 * v.router.load(route, routeInfo);
 */
  
/*v.ani['right'] = function(elNew, elOld, isBack){
//  if (!elOld) return v.ani.moveX(elNew, 0, 0, 0);
  if (isBack){
    return v.ani.moveX(elNew, 0, 100, 350);
  } else {
    if (elOld) v.ani.moveX(elOld, 0, -30);
    return v.ani.moveX(elNew, 100, 0);
  }
}

v.ani['left'] = function(elNew, elOld, isBack){
  if (isBack){
    return v.ani.moveX(elNew, 0, -100, 250);
  } else {
//    if (elOld) v.ani.moveX(elOld, 0, 30, 300);
    return v.ani.moveX(elNew, -100, 0);
  }
}

v.ani['up'] = function(elNew, elOld, isBack){
  if (isBack){
    return v.ani.moveY(elNew, 0, 100);
  } else {
//    if (elOld) v.ani.moveY(elOld, 0, -30);
    return v.ani.moveY(elNew, 100, 0);
  }
}
  

v.ani['down'] = function(elNew, elOld, isBack){
  if (isBack){
    return v.ani.moveY(elNew, 0, -100, 100);
  } else {
//    if (elOld) v.ani.moveY(elOld, 0, 30);
    return v.ani.moveY(elNew, -100, 0);
  }
}

v.ani['down2'] = function(elNew, elOld, isBack){
  if (isBack){
    return v.ani.moveY(elNew, 0, -100, 2100);
  } else {
//    if (elOld) v.ani.moveY(elOld, 0, 30, 1000);
    return v.ani.moveY(elNew, -100, 0, 1000);
  }
};*/

v.ani['animationendfor'] = function(event){
  clearTimeout(this.timeoutId);
  this.timeoutId = 0;
  var prevEl = this.pairEl;
  var csss = this['cssanimated'].split(' ');
  this.removeEventListener(event.type, v.ani.animationendfor);
  this.css(csss[0], '');
  this.boundAnmiateendFunc = null;
  if (prevEl && csss[1]){
//    prevEl.css(csss[1],'');    
  }
  v.render.removePrevios(this, prevEl, this.options, true);
}

//back 이벤트에 응답
v.ani['animationback'] = function(event){
  clearTimeout(this.timeoutId);
  var prevEl = this.pairEl;
  var func = this.callback;
  var csss = this.options['animatecss'].split(' ');
  this.removeEventListener(event.type, v.ani.animationback);

  //스타일을 제거하는 경우 원 화면이 표시되는 것을 방지
//  this.css(csss[0] + 'Back', '');

  if (prevEl && csss[1]){
    prevEl.css(csss[1] + 'Back','');    
  }
  v.$$(this.options.target, -1).css('overlay-visible', '');
  var isPage = this.css('page');
  if (isPage) v.router.onpostroute(prevEl);
  this.dispose();
  if(v.isFunction(func)) func();
}

v.ani['cssback'] = function(targetEl, callback){
  var cssAni = targetEl['cssanimated'] || '';
  var csss = cssAni.split(' ');
  var isPage = targetEl.css('page');
  var pairEl = targetEl.pairEl;
  if (!csss.length){
    targetEl.dispose();
    if (isPage) v.router.onpostroute(pairEl);
    return;
  }
  var prevEl = targetEl.pairEl;

  csss[0] = csss[0] + 'Back';
  if (csss.length > 1){
     if (prevEl) prevEl.css(csss[1], '');
     csss[1] = csss[1] + 'Back';
  }
  targetEl.callback = callback;
  targetEl.addEventListener("animationend", v.ani.animationback, false);

  targetEl.timeoutId = setTimeout(function(){
//    targetEl.css(csss[0], '');
    if (prevEl && csss[1]) prevEl.css(csss[1],'');
    v.$$(targetEl.options.target, -1).css('overlay-visible', '');
    if (isPage) v.router.onpostroute(pairEl);
    targetEl.dispose();
    if(v.isFunction(callback)) callback();
  }, 800);

  if (prevEl && csss.length > 1){
    prevEl.css(csss[1], csss[1]);
  }
  targetEl.css(csss[0], csss[0]);
  targetEl['cssanimated'] = ''; 
}

v.ani['css'] = function(targetEl, prevEl, options, replace){
  var cssAni = options['animatecss'] || '';
  var csss = cssAni.split(' ');
  if (csss[0].length < 1) {
      if (options['replace']) v.render.removePrevios(targetEl, prevEl, options, replace);
      return;
  }

  if (!prevEl && csss.length > 1){
      if (options.target === '.overlay') prevEl = v.$$('.views .view', -1);
  }  

  targetEl['cssanimated'] = cssAni;
  targetEl.pairEl = prevEl;

//  var bindFunc = v.ani.animationendfor.bind(targetEl, prevEl, csss, options);
//  targetEl.boundAnmiateendFunc = v.ani.animationendfor.bind(targetEl, prevEl, csss, options);
  targetEl.addEventListener("animationend", v.ani.animationendfor, false);
  targetEl.timeoutId = setTimeout(function(){
    targetEl.css(csss[0], '');
    if (prevEl && csss[1]) prevEl.css(csss[1],'');
  }, 800);

  if (prevEl && csss.length > 1){
    prevEl.css(csss[1], csss[1]);
  }
  targetEl.css(csss[0], csss[0]);
}

v.render.startAnimation = function(ani, targetEl, prevEl, options, replace){
  var pairEl;
  if (!options.keep || replace) pairEl = prevEl;
  if (pairEl && pairEl['onunload']){
//    console.log('onunload finished');
    pairEl['unloaded'] = true;
    pairEl['onunload']();
  }
  if (window.cordova){
      v.render.removePrevios(targetEl, prevEl, options, replace);
  } else {
    ani(targetEl, pairEl).then(function(state){
      targetEl.animated = options.animate;
      v.render.removePrevios(targetEl, prevEl, options, replace);
    }, function(){
    });
  }
}

v.render.display3 = function(targetEl, prevEl, options, replace){
  if (targetEl.onload){
    //onload시 true 반환하면 animation도 하지 않는다.
    if (!targetEl.onload(targetEl, prevEl, options)){
      v.render.pop(options.qid, targetEl);
      v.ani.css(targetEl, prevEl, options, replace);
    } else {
      v.render.pop(options.qid, targetEl);
      v.ani.css(targetEl, prevEl, options, replace);
    }
  } else {
    v.render.pop(options.qid, targetEl);
    v.ani.css(targetEl, prevEl, options, replace);
  }
  L_GATHER();
}

v.render.display2 = function(targetEl, prevEl, options, replace){
  //data-css 속성이 있으면 
  if (options['animatecss'] && options['animatecss'] != 'none'){
    return v.render.display3(targetEl, prevEl, options);
  }

  var ani;
  var animate = options.animate || options.data.animate;
  if (animate) ani = v.ani[animate];

  //animation이 있어도 큐를 pop 시킨다.

//  var tmr = new v.Timer();

  if (targetEl.onload){
    //onload시 true 반환하면 animation도 하지 않는다.
    if (!targetEl.onload(targetEl, prevEl, options)){
      v.render.pop(options.qid, targetEl);
      if (ani) v.render.startAnimation(ani, targetEl, prevEl, options, replace);
      else{
        v.render.removePrevios(targetEl, prevEl, options, replace);
      } 
    } else {
      v.render.pop(options.qid, targetEl);
    }
  } else {
    v.render.pop(options.qid, targetEl);
    if (ani) v.render.startAnimation(ani, targetEl, prevEl, options, replace);
    else{
      v.render.removePrevios(targetEl, prevEl, options, replace);
    } 
  }

  L_GATHER();
  
//  console.log(targetEl, tmr.elapsed2());
}
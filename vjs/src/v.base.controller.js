
v.Controllers = {};

v.Controller = function(name, initfunction){
  this.bag = {debug:v.debug};
  this.debug = v.noop;
  this.bindfunction = initfunction;
  v.Controllers[name] = this;
  if (initfunction){
    initfunction.bind(this)();
//    this.bindfunction = initfunction.bind(this);
  }
}

v.Controller.prototype.oninit = v.noop;
v.Controller.prototype.onload = v.noop;
v.Controller.prototype.onunload = v.noop;
v.Controller.prototype.on = function(event, func){
   var evtName = 'on' + event;
   if (!this[evtName] || this[evtName] === v.noop){
      this[evtName] = func;
    }
};

v.Controller.prototype.bindto = function(obj, options){
  this.bag.root = obj;
  this.$ui=this.bag.root;
  this.debug=this.bag.debug.bind(this);
  if (this.bindfunction) this.bindfunction.call(obj, options);
};



//컨텐트 Manager

///구조
/// Uis << Ui{content/controller, Q[] << {element:el, context:ctx}}
/// 생성 : context가 함수이거나 HTML 문자열  
///   var uiObj = v.ui(name, context);
/// 큐 저장 : context가 object인 경우  
///   var uiObj = v.ui(name, {element:, context:ctx, params:params...})
///   또는 
///   uiObj.Q.push({element:, context:ctx, params:params...});
///   또는 
///   v.Uis[name].Q.push({element:,...})
/// 렌더 : Q에 저장된 target element에 uvObj.context.bind(uvObj.Q[1]) 함수를 적용시킨다.
///   target과 연결된 함수를 실행하는 경우 큐에 저장된 객체를 적용시킨다.
///   uvObj.render();
///      1. newFunc = uvObj.context.bind(uvObj.Q[1]);   //컨트롤러 내에서 this.context, this.param
///         html 결과를 보려면 newFunc();
///      2. newFunc.bindto(uvObj.Q[1].element);         this.onload 등의 이벤트를 대상 요소에 추가

v.Uis = {};

v.Ui = function(){
  this.content = undefined;
  this.Q = [];
};

v.Ui.prototype.createElement = function(compiled, options){
  var ctrl;
  var p, newElement;
  p = document.createElement('div');
  if (typeof compiled === 'string'){
    p.innerHTML = compiled;
    newElement = p.getChild(0);
    return newElement;
  }
  
  if (typeof compiled.controller === 'string'){
    ctrl =  v.Controllers[compiled.controller];
  }
  p.innerHTML = compiled.apply(options);
  
  if (ctrl){
    newElement = p.getChild(0);
    ctrl.bindto(newElement);
  } else if (typeof compiled === 'function'){
    newElement = p.getChild(0);
    compiled.bind(newElement)();
  }

  if (newElement.oninit){
    var result = newElement.oninit.apply(newElement);
    if (result && result.then){
      result.then(function(){
        var dest = options.target.getChild(-1);
        if (dest){
          if (dest.ani && dest.ani.tweenable) dest.ani.tweenable.stop(); 
          dest.unload();
          options.target.removeChild(dest);
        } else {
          options.target.innerHTML = '';
        }

        options.context = arguments.length > 1 ? arguments[1]: arguments[0];
        p.innerHTML = compiled.apply(options);
//        newElement.context = arguments.length > 1 ? arguments[1]: arguments[0];
//        newElement.outerHTML = compiled.call(newElement);

        newElement = p.getChild(0);
        if (ctrl) ctrl.bindto(newElement);
        else compiled.bind(newElement)();

        options.target.appendChild(newElement);
        if (newElement.onload) newElement.onload(newElement);
      }, function(err){
        alert(err);
      });
      return;
    } else{
      p.innerHTML = compiled.call(newElement);
      newElement = p.getChild(0);
    }
  }
  return newElement;
}

v.Ui.prototype.render = function(){
  if (!this.content) return;
  while(this.Q.length > 0){
    var q = this.Q.pop();
    var newEl = this.createElement(this.content, q);
    if (newEl) v.replaceElement(q.target, newEl);
  }
}

v.replaceElement = function(target, newEl){
  var dest = target.getChild(-1);
  if (dest){
    if (dest.ani && dest.ani.tweenable) dest.ani.tweenable.stop(); 
    dest.unload();
    target.removeChild(dest);
  } else {
    target.innerHTML = '';
  }

  var p = newEl.parentElement;

  target.appendChild(newEl);
  if (newEl.onload) newEl.onload(newEl, dest);
}

v.ui = function(uiName, args){
  if (!v.Uis[uiName]){
    v.Uis[uiName] = new v.Ui();
  };

 if (typeof args === 'function' || typeof args === 'string') {
    v.Uis[uiName].content = args;
  } else if (typeof args === 'object') {
    v.Uis[uiName].Q.push(args);
  }
  return v.Uis[uiName]
};

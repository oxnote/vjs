v.hasBack = 0;
v.router = (function(){'use strict';
  var config ={};
  var rootBag = {};
  var fn = {};
  
  var normalizePath = function(path){
    var npath = path.replace(window.location.protocol + '//' + window.location.host, '');
    if (npath.slice(0, 1) === "#" || npath.slice(0, 1) === "?") return npath.substring(1);
    else return npath;
  }
  
    
  var Router = function(){
    this.defaultTarget = '.pages';
    this.hostname = '';
    this.port = '80';
    this.popuplayer = '.overlay';   //v.router.popup('', 'modal')
    document.body['force'] = true;
    this.animate = '';
    this.lastSrc = '';
    this.lastOptions = {};
    this.controllerBase = 'controllers/';
    this.clickInfo = {};
  };
  
  Router.prototype.config = function(cfg, obj){
    if (typeof cfg === 'object'){
      for(var key in cfg){
        config[key] = cfg[key];
        for(var subkey in cfg[key]){
          config[key][subkey] = cfg[key][subkey];
        }
      }
    } else if (typeof cfg === 'string'){
      if (typeof obj=== 'object'){
        config[cfg] = {};
        for(var subkey in obj){
          config[cfg][subkey] = obj[subkey];
        }
      } 
    }
    return this;
  }; 
    
  Router.prototype.getRouterInfo = function(arg, target){
    var path;
    var fullpath;
    if (typeof arg==='string'){
      fullpath = arg;
    } else if (typeof arg==='object'){
      fullpath = arg['url'] || '/';
    }
    if (!fullpath) fullpath = '/';
    path = normalizePath(fullpath);
    return getRouter(path, target);
  }

  var modelessHandler = function(){
    v.router.back();
  }

 var renderBack = function(selector, func){
    //overlay가 있는 경우 overlay를 닫는다.
    var popupOpened = v.$(v.router.popuplayer + '.overlay-visible'); 

    if (selector !== v.router.popuplayer && popupOpened){
      selector = v.router.popuplayer;
      popupOpened.off('click', modelessHandler);
    }

    var parent = v.$(selector);
    if (parent.children.length > (popupOpened ? 0 : 1)){
      var elems;
      var currentEl = parent.getChild(-1);
      if (currentEl && currentEl.animated){
        var prom = v.ani[currentEl.animated](currentEl, undefined, true);
        prom.then(function(state){
          currentEl.dispose(true);
          parent.css('overlay-visible', '');
        });
      } else {
        currentEl.dispose(true);
        parent.css('overlay-visible', '');
      }
    }
    if (func) func();
  }  


  Router.prototype.close=function(func){
    var popupOpened = v.$(v.router.popuplayer + '.overlay-visible'); 
    if (!popupOpened) return;
    this.lastSrc = '';
    popupOpened.off('click', modelessHandler);
    
    var parent = v.$(this.popuplayer);
    if (parent.children.length > (popupOpened ? 0 : 1)){
      var elems;
      var currentEl = parent.getChild(-1);
      if (currentEl && currentEl.animated){
        var prom = v.ani[currentEl.animated](currentEl, undefined, true);
        prom.then(function(state){
          currentEl.dispose(true);
          parent.css('overlay-visible', '');
          if(v.isFunction(func)){
            func();
          } 
        });
      } else {
        currentEl.dispose(true);
        parent.css('overlay-visible', '');
        if(v.isFunction(func)){
           func();
        }
      }
    }
  }  

  Router.prototype.back = function(func){
    this.lastSrc = '';
    //overlay가 있는 경우 overlay를 닫는다.
    var selector = this.defaultTarget;
    var popupOpened = v.$(v.router.popuplayer + '.overlay-visible');  

    if (selector !== v.router.popuplayer && popupOpened){
      selector = v.router.popuplayer;
    }
    var parent = v.$$(selector, 10000);
    //기본적으로 .pages이지만 view를 열었을 경우 views를 대상으로한다.
    if (parent.children.length > (popupOpened ? 0 : 1)){
      var isclose = (popupOpened && parent.$$('.page').length < 2);
      var currentEl = parent.$$('.page', -1);
      if (!currentEl || !currentEl.pairEl) currentEl = parent.$$('.view', -1);
      var pairEl;
      if (currentEl) pairEl = currentEl.pairEl;
      if (currentEl && currentEl.cssanimated){
        v.ani.cssback(currentEl, func);
        return;
      }
      if (currentEl && currentEl.animated){
        var prom = v.ani[currentEl.animated](currentEl, undefined, true);
        prom.then(function(state){
          if (isclose) parent.css('overlay-visible', '');
          currentEl.dispose();
        });
      } else {
        if (isclose) parent.css('overlay-visible', '');
        if (currentEl) currentEl.dispose();
        else parent.getChild(-1).dispose();
      }
      this.onpostroute(pairEl);
    } else {
      // view를 back한다.
      parent = v.$$('.views', -1);
      if (parent.children.length > 1){
        var currentEl = parent.getChild(-1);
        if (currentEl && currentEl.cssanimated){
          v.ani.cssback(currentEl, func);
          return;
        }
        var pairEl = currentEl.pairEl;
        if (currentEl && currentEl.animated){
          var prom = v.ani[currentEl.animated](currentEl, undefined, true);
          prom.then(function(state){
            currentEl.dispose();
          });
        } else {
          currentEl.dispose();
        }
      }
      this.onpostroute(pairEl);
    }
    if(v.isFunction(func)){
      func();
    } 
  }    
  
  var getTargetFromPath = function(path){
    if (!path) return;
    var match = path.match(/.*(view|page)\..*/i);
    if (match) return '.' + match[1].toLowerCase() + 's';
  }
  
  Router.prototype.getFileName = function(src){
     var match = src.match(/.*\/(.*)\..*$/);
     if (match) return match[1];
     else return '';
  }

  Router.prototype.reload = function(options){
    v.extend(this.lastOptions, options);
    this.lastOptions.keep = 'inplace';    
    v.render.load(this.lastSrc, this.lastOptions);
  }

  Router.prototype.load = function(arg, target, fromHash){
    //해시변경이벤트에서 온것이 아니면 target이 지정되지 않았거나 타겟이 
    //히스트로리에 push할 것이라면 해시로 전달 
//    if (!target) target = v.router.defaultTarget;
    if (fromHash && arg) target.src = arg;
    var routeInfo = this.getRouterInfo(arg, target);
    var source = routeInfo['src'];
    var routeTarget;

    if (typeof target === 'object'){
      v.extend(routeInfo, target);
      v.extend(routeInfo['data'], target['data']);
      routeInfo.src = source;
      routeTarget = target.target || routeInfo['target'];
    } else {
      routeTarget = target || routeInfo['target'];
    }

    if (!routeTarget){
      routeTarget = getTargetFromPath(routeInfo.src || routeInfo.url) || this.defaultTarget;
    } 
    else{
      if (routeTarget === 'back' || routeTarget === '_back') {
        v.router.back();
        return;
      }
      if (routeTarget === '_blank') routeTarget = this.popuplayer;
      
    } 
    routeInfo.target = routeTarget;

   if (this.lastSrc == routeInfo.src) return;

   if (arg.slice(0,1)=='?') routeInfo.hash = 'no';
   {
      var redirect = this.onroute(routeInfo);
      if (redirect){
        routeInfo.src = redirect;
        v.router.currentOptions = {};
        v.extend(v.router.currentOptions, routeInfo);
        v.router.lastSrc = redirect;
        window.location.hash = routeInfo.src || routeInfo.url;
        return;
      } 

      if (v.config.hash && !fromHash && routeTarget && (routeInfo.hash != 'no')) {
        if (routeTarget === '.views' ||  routeTarget === this.defaultTarget){
          if (v.$(routeTarget).children.length < 13){
             if (routeInfo.push && routeInfo.push !=='push'){
                delete routeInfo.push;
             } else {
                var rehash = routeInfo.src || routeInfo.route || routeInfo.url; // || routeInfo.src;
                if (window.location.hash.slice(1) !== rehash)
                { 
                  v.router.currentOptions = {};
                  v.extend(v.router.currentOptions, routeInfo);
                  window.location.hash = rehash; // || routeInfo.url;
//                  if (v.iever !== 8) return;
                  return;
                } 
             }           
          }
        }
      }
    }  
    
    if (routeTarget===this.popuplayer || routeInfo.mode)
    {
      var page = v.$(routeTarget);
      if (!page) throw new Error(routeTarget + ' element cannoot be found!');
      if (routeInfo.mode && (routeInfo.mode !== 'modal')){
          page.on('click', modelessHandler);
          page.css('overlay-visible','overlay-visible');
          page.modal = false;
//          page.style.backgroundColor = 'rgba(0,0,0,0)';
      } else {
          page.css('overlay-visible','overlay-visible');
          page.modal = true;
//          page.style.backgroundColor = 'rgba(31,63,93,128)';
      }
    } 
    this.lastSrc = routeInfo.src || routeInfo.url; 
    this.lastOptions = v.clone(routeInfo);
    v.render.load(this.lastSrc, routeInfo);
    Router.prototype.currentOptions = {};
  }
  
  Router.prototype.getOverlayPage = function(){
    return v.$(v.router.popuplayer + '.overlay-visible');  
  }
  
  Router.prototype.currentOptions = {};
  
  Router.prototype.open=function(arg, options){
    var target = options || {};
    var routeInfo = this.getRouterInfo(arg, target);
    var source;
    var routeTarget = this.popuplayer;
    if (typeof target === 'object'){
      v.extend(routeInfo, target);
      v.extend(routeInfo['data'], target['data']);
      routeTarget = target.target || routeInfo['target'] || this.popuplayer;
    } else {
      v.extend(routeInfo, target);
      routeTarget = target.target || routeInfo['target'] || this.popuplayer;
    }
    routeInfo['target'] = routeTarget;
    routeInfo['keep'] = 'keep';
    v.router.load(routeInfo.src || routeInfo.url, routeInfo);
    v.router.currentOptions = {};
  }
  
  function getRouter(path, opt) {
    // 라우터 매개변수 초기화 
    var uriInfo = v.parseUri(path);
    path = uriInfo.uri;
    var queryParams = uriInfo.params;
    var ret = { src: path, url:path, params: queryParams, animate: v.router.animate};
    
    var routeParams = {};
    for (var route in config) {
      var matcher = new RegExp("^" + route.replace(/:[^\/]+?\.{3}/g, "(.*?)").replace(/:[^\/]+/g, "([^\\/]+)") + "\/?$");
      if (matcher.test(path)) {
        path.replace(matcher, function() {
          var keys = route.match(/:[^\/]+/g) || [];
          var values = [].slice.call(arguments, 1, -2);
          for (var i = 0; i < keys.length; i++) {
            routeParams[keys[i].replace(/:|\./g, "")] = decodeURIComponent(values[i]);
          }
        });

        if (config[route].controller) {
          if (!rootBag[route]) rootBag[route] = {};
          config[route].bag = rootBag[route];
        }

        ret.route = route;

        for (var key in config[route]) ret[key] = config[route][key];
        //찾았으면 shallow copy
        for (var key in routeParams) {
          ret.params[key] = routeParams[key];
        }
        break;
      }
    }
    if (opt && opt.animate) ret.animate = (opt.animate === 'false') ? '' : opt.animate;
    return ret;
  }
  
	var needsEvaluate = function(target) {
		switch (target.nodeName.toLowerCase()) {
      // Don't send a synthetic click to disabled inputs (issue #62)
      case 'button':
      case 'select':
      case 'textarea':
      case 'input':
      case 'label':
      case 'iframe': // iOS8 homescreen apps can prevent events bubbling into frames
      case 'video':
  			return false;
		}
		return true; //(/\bneedsclick\b/).test(target.className);
	};  

  //onclick 이벤트발생시 대상 요소 분석 
  var getPathInfo = function(targetElement){
    var targetElement;
    var ret = {};
    var loops = 4; //세번의 상위 요소까지   
    if (!targetElement) return;
    
    while(!targetElement['href'] && --loops){
      targetElement = targetElement.parentElement;
      if (!targetElement) break;      
    }
    
    if (targetElement){
      var href = targetElement['href'];
      if (!href) return;
      var sameHost = href.match(window.location.host);
      if (sameHost == null) return;
      var data = targetElement.data();
      v.extend(v.router.currentOptions, data);
      v.router.currentOptions['data'] = v.router.currentOptions.data || data; 
      if (data.target && data.target === '_blank'){
        if (data.push && data.push==='push') return;  //라우터가 정상 동작하도록 ...
      } 
      var host = href.replace(window.location.protocol + '//' + window.location.host, ''); 
      var url = window.location.pathname==='/' ? host.slice(1) : host.replace(window.location.pathname, '');
      var path = url || host;
      if (url.slice(0, 1) === "#"){
        path = url.substr(1);
      } else {
        ret['push'] = 'false';
      }
      ret.url = path;
      ret['data'] = {};
      v.extend(ret.data, data);
      v.extend(ret, data);
      return ret;
    } 
    return;
  }
  
  Router.prototype.onroute = function(options){
    return;
  }
  
  Router.prototype.onpostroute = function(targetEl, prevEl, options){
    return;
  }

	Router.prototype.clickEventHandler = function(event) {
    var targetElement;    
    targetElement = document.elementFromPoint(event.clientX, event.clientY) || activeElement;

    v.router.clickInfo = {targetElement: targetElement, pos:[event.clientX, event.clientY]};

    if (!needsEvaluate(targetElement)) return true;

    if (targetElement.getAttribute('disabled') !== null) {
      event.returnValue = false;
      event.cancelBubble = true;
      return false;
    }

    //라우터를 사용하지 않도록 설정한 경우 패스처리 않는다.
    if (!v.config.router) return;

    var path = getPathInfo(targetElement)
    event.returnValue = false;
    if (!path) return true;
    if (path){
      event.cancelBubble = true;
      // Cancel the event
      var popupOpened = v.$(v.router.popuplayer + '.overlay-visible');
      if (popupOpened && !popupOpened.modal) v.router.close(function(){
        v.router.load(path.src || path.url, path);
      });
      else v.router.load(path.src || path.url, path);
      return false;
    }
		return true;
	};
  
    
 Router.prototype.clickListnerHandler = function(event) {
    var targetElement, parentElement;
    console.log(event);
/*
    var x = event.pageX - window.pageXOffset;
    var y = event.pageY - window.pageYOffset;
    var res = [];

    var ele = document.elementFromPoint(x,y);
    while(ele && ele.tagName != "BODY" && ele.tagName != "HTML"){
        res.push(ele);
        ele.style.display = "none";
        ele = document.elementFromPoint(x,y);
    }

    for(var i = 0; i < res.length; i++){
        res[i].style.display = "";
    }

    console.log(res);*/

//    targetElement = document.elementFromPoint(event.pageX - window.pageXOffset, event.pageY - window.pageYOffset) || event.target || activeElement;
    targetElement = document.elementFromPoint(event.x, event.y) || activeElement;

//    v.router.clickInfo = {targetElement: targetElement, pos:[event.pageX - window.pageXOffset, event.pageY - window.pageYOffset]};
    v.router.clickInfo = {targetElement: targetElement, pos:[event.x, event.y]};
    
    if (!needsEvaluate(targetElement)) return true;

    if (targetElement.getAttribute('disabled') !== null) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }

    //라우터를 사용하지 않도록 설정한 경우 패스처리 않는다.
    if (!v.config.router) return;
        
    var path = getPathInfo(targetElement)

    if (!path) return true;
    
    if (path){
      event.preventDefault();
      event.stopPropagation();
      var popupOpened = v.$(v.router.popuplayer + '.overlay-visible');
      if (popupOpened && !popupOpened.modal) v.router.close(function(){
        v.router.load(path.src || path.url, path);
      });
      else v.router.load(path.src || path.url, path);
      return false;    
    }
		return true;
	};  
  
  return new Router();
})();

v.popup = v.open = v.router.open.bind(v.router);
v.load = v.router.load.bind(v.router);

function insertLayout(){
/*  var s= "html,body {position:relative;height:100%;width:100%;overflow-x:hidden;-webkit-overflow-scrolling:touch;}"; 
  s += ".views,.view,.pages,.page{margin:0;padding:0;border:0;-webkit-overflow-scrolling:touch;"+v.css.BOX_SIZING+"}";
  s += ".bar{position:fixed;width:100%;z-index:2}.bar.top{top:0;height:"+v.layout.top+"}.bar.bottom{bottom:0;height:"+v.layout.bottom+"}";
  s += ".views{position:relative;width:100%;height:100%;z-index:1}";
  s += ".view{position:absolute;width:100%;height:100%;z-index:1}";
  s += ".pages{position:fixed;width:100%;top:0;bottom:0;overflow:auto;}";
  s += ".pages.top{top:"+v.layout.top+";}.pages.bottom{bottom:"+v.layout.bottom+"}";
  s += ".page{position:absolute;left:0;top:0;width:100%;min-height:100%;overflow:hidden;}";
  s += ".page .page-content{position:relative;-webkit-overflow-scrolling:touch;"+v.css.BOX_SIZING+"}";
  s += ".overlay{position:absolute;left:0;top:0;width:100%;height:100%;background: rgba(31,63,93,0);z-index:1000;visibility:hidden;opacity:1;}.overlay.overlay-visible{visibility:'visible'}";*/
  s = "";
  var sheet = document.createElement ("style");
  sheet.id = v.css.rules.v_system_sheet + "Sheet";
  sheet.type = 'text/css';
  if (sheet.styleSheet){
    sheet.styleSheet.cssText = s;
  } else {
    sheet.appendChild(document.createTextNode(s));
  }
  v.css.rules.head.appendChild(sheet);
//  v.css.rules.head.insertBefore(sheet,v.css.rules.head.firstChild);
  v.router.app = v.$('.views');
  if (!v.router.app){
    throw new Error('The [views] class div is not found');
  }
  //overlay 있는지 확인 
  if (!v.$('.notibar')) v.router.app.insertAdjacentHTML("beforeBegin", '<div class="notibar"></div>');
  if (!v.$('.overlay')) v.router.app.insertAdjacentHTML("afterEnd", '<div class="overlay"></div>');
  if (!v.$('.sidepanel')) v.router.app.insertAdjacentHTML("afterEnd", '<div class="sidepanel"></div>');
  if (!v.$('.loading')) v.router.app.insertAdjacentHTML("afterEnd", '<div class="loading"><div class="loader"></div></div>');
}

function setupListner(){
  preventDefault =  function(e){e.preventDefault();};
  window.location.hash = '';
  v.router.hostname = window.location.hostname;
  v.router.port = window.location.port;

  insertLayout();

  //기본 뷰 객체와 overlay 객체등 문서 구조를 검사한다.
  v.router.host = window.location.host;

  if (document.body.addEventListener) {
    document.body.addEventListener('tap',v.router.clickListnerHandler);
//    document.body.addEventListener('touchmove',preventDefault);
//    document.body.addEventListener('touchstart',preventDefault);
//    document.body.addEventListener('touchend',preventDefault);
//    document.body.addEventListener('click', v.router.clickListnerHandler, true); 
  } else if (document.body.attachEvent)  {
    document.body.attachEvent('onclick', v.router.clickEventHandler);
  }

  //라우터를 사용하지 않도록 설정한 경우 해시 처리 않는다.
  if (!v.config.router) return;

  function hashchange() {
    if (window.location["hash"] == ""){
//        window.location.reload(true);
//        return;
    }
    var path = window.location["hash"].substring(1);
    v.router.load(path || "/", v.router.currentOptions, true);  //라우팅 소스가 hash changed
  };

  if(window.attachEvent) {
    window.attachEvent('onhashchange', hashchange);
  } else {
    window.addEventListener('hashchange', hashchange);
  };
}

v.global["logmessage"] = '';

function v_ready(){

  L_LANG =  document.documentElement.lang || navigator.language || navigator.userLanguage || L_DEFAULT_LANG; 
  L_APP_LANG = L_LANG;

  function __loadInit(){
   var hash = window.location.hash;
    setupListner();
    if (window.main){
      window.main();
    } else {
      var redirect;
      if (!hash || hash.length < 2){
        redirect = v.router.onroute({src:'/'});
      }
      else{
        redirect = v.router.onroute({src:hash});
      } 
      if (!redirect) v.render.ui("body", 'DOMReady');
      else v.router.load(redirect,{},true);
    } 
  }

  v.global['host'] = window.location.host;

  if (typeof L_GETDB != "function") L_GETDB = undefined;
  
  v.transform.init(document.body);
  if (!window.cordova && L_GETDB) L_GETDB(__loadInit);
  else  __loadInit();
}

document.onreadystatechange = function(){
  if (document.readyState === 'interactive'){
      var hash = window.location.hash;
      if (hash && hash.length < 2 && !window.cordova){
        window.location.hash = '';
//        window.location.reload(true);
      }
  } else if (document.readyState === 'complete'){
      if (window.cordova){
        document.addEventListener("deviceready", function(){
          v.global.logmessage += "deviceready\n";
          if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
            cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
            cordova.plugins.Keyboard.disableScroll(true);
          }
          if (window.StatusBar) {
            if (cordova.platformId == 'android') StatusBar.backgroundColorByHexString("#333");
            else StatusBar.overlaysWebView(false);
          }    
          v_ready();
        });
      }


      v.global.logmessage += "document completed\n"
      if (!window.cordova) v_ready();
  } 
};
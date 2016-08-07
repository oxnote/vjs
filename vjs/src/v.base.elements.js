v.transform = {
  name : '',
  FPS : 30,
  init : function(el){
    var styles = ['transform','webkitTransform','MozTransform', 'msTransform', 'OTransform'];
    for (var i = 0; i < styles.length; i++) {
      if (null != el.style[styles[i]]) {
        v.transform.name = styles[i];
        break;
      }
    };
  }
}

v.css = function(el, from, to){
  var css = el.className;
  if (!from && !to) return css;
  if (to !== undefined) css = css.replace(from, '') + ' ' + to;
  else css = from;
  el.className = css.replace('  ', ' ');
};

v.css.BOX_SIZING = '-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;';

v.css.getPos = function(el){
  try{
    var transformValue = window.getComputedStyle(el)[v.transform.name];
    if (transformValue === 'none'){
      return {
        x: el? el.offsetLeft :0,
        y: el? el.offsetTop : 0
      }
    }
    var re = /matrix\((.*)\)/;
    var pos = re.exec(window.getComputedStyle(el)[v.transform.name])[1].split(',').map(function (item) {
      return parseInt(item, 10)
    });
    return {
      x: el.offsetLeft + pos[4],
      y: el.offsetTop + pos[5]
    }
  } catch(e){
    return {
      x: el? el.offsetLeft :0,
      y: el? el.offsetTop : 0
    }
  }
}

v.css.getSize = function(el){
    var size = [0,0];
    size[0] = Math.max(el.scrollWidth, el.offsetWidth, el.clientWidth);
    size[1] = Math.max(el.scrollHeight, el.offsetHeight, el.clientHeight);
    return size;
}

v.css.getViewportSize = function() {
  var x, y;
  x = 0;
  y = 0;
  if (window.innerHeight) {
    x = window.innerWidth;
    y = window.innerHeight;
  } else if (document.documentElement && document.documentElement.clientHeight) {
    x = document.documentElement.clientWidth;
    y = document.documentElement.clientHeight;
  } else if (document.body) {
    x = document.body.clientWidth;
    y = document.body.clientHeight;
  }
  return {
    width: x,
    height: y
  };
};
  
v.css.rules = {
  sheetsBag : {},
  v_system_sheet :  '__v__system_sheet', 
  head : document.getElementsByTagName ("head")[0],
  sheet: undefined,
  rules:{},
  //lw5~lw100 lh5~lh100까지의 스타일을 w, h 기준으로 pixel 단위로 만든다.
  add : function(name, text){
    var idx = this.rules[name];
    if (idx){
      if (v.isie && v.iever == 8) this.sheet.rules[idx].style.cssText = text;
      else this.sheet.rules[idx].cssText = text;
    } else {
      idx = v.keys(this.rules).length || 0;
      this.rules[name] = idx;
      if (this.sheet.insertRule) {
        this.sheet.insertRule(name + " {" + text + "}", idx);        
      } else {
        this.sheet.addRule(name, text);
      }
    }
    return this;
  },
  addto :function(sheetName, styles, caller, path){
    //sheet가 존재하는지 확인
    var sheet = document.querySelector('style#'+sheetName);
    if (!sheet){
      sheet = document.createElement ("style");
      sheet.id = sheetName;
      sheet.type = 'text/css';

      var callerSheet;
      if (!caller){
         callerSheet = document.querySelector('style#'+v.css.rules.v_system_sheet + "Sheet");
      } else {
         callerSheet = document.querySelector('style#'+caller + "Sheet");
         if (!callerSheet) callerSheet = document.querySelector('style#'+v.css.rules.v_system_sheet + "Sheet");
      }
      
      if (callerSheet){
        this.head.insertBefore(sheet, callerSheet);
      } else {
        this.head.appendChild(sheet);
      }  
//      console.log('[ADD SHEET]' + sheetName);
      this.sheetsBag[sheetName] = 1;
    } else{
      var nCount = this.sheetsBag[sheetName];
      this.sheetsBag[sheetName] = nCount + 1;
      return;
    } 
    if (path){
      var a = path.split('/');
      a.pop();
      var curPath = '"' + a.join('/') + '/';
      a.pop();
      var pPath = '"' + a.join('/') + '/'; 
      styles = styles.replace(/"\.\//gm, curPath).replace(/"\.\.\//gm, pPath);
    }
    if (sheet.styleSheet){
      sheet.styleSheet.cssText = styles;
    } else {
      while(sheet.firstChild){
        sheet.removeChild(sheet.firstChild);
      }
      sheet.appendChild(document.createTextNode(styles));
    }      
    
  },
  removeSheet : function(sheetName){
//    console.log('[DEK SHEET]' + sheetName);
    if (this.sheetsBag[sheetName]){
      var nCount = this.sheetsBag[sheetName];
      nCount--;
      this.sheetsBag[sheetName] = nCount;
      if (nCount > 0) return;
    }
    var sheet = document.querySelector('style#' + sheetName);
    if (sheet){
      this.head.removeChild(sheet);
    }
  },
  getSheets : function(head){
    var sheets = v.each(head.$$('link'), function(el){
      if (el.rel === 'stylesheet') return el;
    });
    return sheets;
  }
}

if (typeof HTMLDocument !== 'undefined'){
  HTMLDocument.prototype.$ = function (selector) { // Only for HTML
    return this.querySelector(selector);
  };
  HTMLDocument.prototype.$$ = function (selector) { // Only for HTML
      return this.querySelectorAll(selector);
  };
} else {
  console.warn('HTMLDocument none');
}

v.elementArrayEach = function(iteratee, context){
    v.each(this, iteratee, context);
};

if (typeof Document !== 'undefined'){

  Document.prototype.$ = function (selector) { // Only for HTML
    return this.querySelector(selector);
  };
  Document.prototype.$$ = function (selector, index) { // Only for HTML
    var elements =this.querySelectorAll(selector); 
    if (typeof index === 'number'){
      if (elements.length == 0) return;
      if (index < 0){
        index = elements.length + index;
        if (index < 0) index = 0;
      } 
      if (elements.length > index) return elements[index];
      else return elements[elements.length-1];
    }
    else{
      elements.each = v.elementArrayEach.bind(elements);
      return elements;
    }  
  };
} else {
  console.warn('XMLDocument none');
}

if (typeof Element !== 'undefined'){

  Element.prototype.$ = function (selector) { // Only for HTML
    return this.querySelector(selector);
  };
  Element.prototype.$$ = function (selector, index) { // Only for HTML
    var elements =this.querySelectorAll(selector); 
    if (typeof index === 'number'){
      if (elements.length == 0) return;
      if (index < 0){
        index = elements.length + index;
        if (index < 0) index = 0;
      } 
      if (elements.length > index) return elements[index];
      else return elements[elements.length-1];
    }
    else{
      elements.each = v.elementArrayEach.bind(elements);
      return elements;
    }  
  };
  
  Element.prototype.transform = function(translate, attrName, attr){
    if (v.transform.name) this.style[v.transform.name] = translate;
    else if (attrName) this.style[attrName] = attr;
  }
  
  /**
   * el.css()             : 클래스 값 리턴 
   * el.css('', 'abc')        : abc 추가
   * el.css('abc')        : abc 추가
   * el.css('abc', '')    : abc 제거 
   * el.css('abc', 'def') : abc->'def' 변경 
   */
  Element.prototype.css = function(from, to){
    var css = this.className;
    if (!from && !to) return css;
    if (typeof to === 'undefined') {
      var match = '';
      var search = from.toLowerCase();
      for(var i = 0; i<this.classList.length; i++){
        if (this.classList[i].toLowerCase() === search){
          match = search;
          break;
        }        
      }
      return match;
    }
//    css = css.replace(from, to);
    css = css.replace(from, '') + ' ' + to;
//    this.className = css.replace(/(\s+)/g, ' ').replace(/(^\s|\s$)/, '');
    this.className = css.replace(/(^\s|\s+$)/, '');
    return this;
  },
  /**
   * el.html()       :innerHTML 리턴  
   * el.html('234')  :innerHTML 설정 
   */
  Element.prototype.html = function(html){
    if (!html) return this.innerHTML;
    else this.innerHTML = html;
    return this;
  },
  Element.prototype.replace = function(html, callback){
    var p = this.parentElement;
    var next = this.nextSibling;
    var tmp = document.createElement('span');
    tmp.innerHTML = html;
    if (next) p.insertBefore(tmp.getChild(0), next);
    else p.insertAfter(tmp.getChild(0), this);
    next = this.nextSibling;
    p.removeChild(this);
    return next;
  },
  Element.prototype['dispose'] = function(alsoPrevious){
    var p = this.parentElement;
    if (alsoPrevious){
      var prev = this.previousSibling;
      while(prev){
        if (prev && prev.nodeType === 1){
           prev.dispose();
        } else {
          p.removeChild(prev);
        }
        prev = this.previousSibling;
      }
    }
    
/*    var uiElements = this['uiList'];
    if (uiElements){
      var n = uiElements.length;
      for(var i = 0; i < n; i++){
        var c = uiElements[i];
        console.log(c['templateName']);
        c.dispose();
      }
//      return;
    }*/
    
    var n = this.children ? this.children.length : 0;
    for(var i = 0; i < n; i++){
      var c = this.children[i];
      if (c.nodeType === 1){
        c.dispose();
        i--; n--;
      } 
    }
    
    for(var event in this.events){
      this.off(event);
    }

    if (this['onunload']) { //} && this.nodeType === 1){
      this['onunload'](this);
    }
    if (p){
      if (this['templateName']){
        v.css.rules.removeSheet(this['templateName'] + 'Sheet');
      }
      p.removeChild(this);
    } 
  }

  Element.prototype.appendHTML = function(html, callback){
    var tmp = document.createElement('span');
    this.appendChild(tmp);
    tmp.outerHTML = html;
    if (callback){
       var ret = callback(this, children);
       if (ret && ret.then){
         ret.then(function(){});
       }
    }
    return this;
  },
  Element.prototype.previous = function(){
    var ret = this.previousElementSibling || this.previousSibling;
    return ret;
  }
  //node type 3이 아닌 요소를 구한다.
  //못찾으면 마지막 요소를 반환한다.
  Element.prototype.getChild = function(index){
    var el;
    if (index < 0){
      el = this.lastChild;
      while(el && el.nodeType !== 1){
        if (el.nodeType === 3){
          this.removeChild(el);
          el = this.lastChild;
        } else {
          el = el.previousSibling;
        }
      }
      return el;
    }

    el = this.firstChild;
    var startIdx = -1;
    if (!el) return undefined;
    if (el.nodeType === 1) startIdx++;
    while(el && el.nextSibling){
      if (startIdx === index) break;
      el = el.nextSibling;
      if (el.nodeType === 1) startIdx++;
    }    
    return (el.nodeType === 1 && startIdx <= index) ? el : undefined;
  },
  Element.prototype.insertHTML = function(html, index){
    var targetEl = this.getChild(index);
    var el = document.createElement('span');
    el.innerHTML = html;
    if (!targetEl) {
      v.each(el.children, function(el){
          if (el.nodeType !== 3){
            this.appendChild(el);
          }
        }.bind(this));
    } else {
      v.each(el.children, function(el){
          if (el.nodeType !== 3){
            this.insertBefore(el, targetEl);
          }
        }.bind(this));
    }
  },
  Element.prototype.update = function(){
    if (this.onupdate) this.onupdate(arguments);
  },
  Element.prototype.setContext = function(obj, objArgs){
    if (typeof obj === 'function'){
      var ret = obj(objArgs);
      if (ret && ret.then){
        ret.then(function(arg1, arg2){
          if (arg2) this.context = arg2;
          else this.context = arg1; 
          this.update();
        }.bind(this), function(err){
          alert(err);
        });
        return;
      } else this.context = ret;   
    } else this.context = obj;
    this.update();
  },
  Element.prototype.events = {},
  Element.prototype.on = function(eventName, callback){
    if (this.addEventListener) {
      this.addEventListener(eventName, callback, false); 
    } else if (this.attachEvent)  {
      this.attachEvent('on' + eventName, callback);
    }
    this.events[eventName] = callback;
    return this;
  },
  Element.prototype.off = function(eventName){
    var callback = this.events[eventName];
    delete this.events[eventName];
    if (!callback) return this;
    if (this.removeEventListener) {
      this.removeEventListener(eventName, callback, false); 
    } else if (this.detachEvent )  {
      this.detachEvent ('on' + eventName, callback);
    }
    return this;
  },
  Element.prototype.toggle = function(attr, val){
    if (this.style[attr]) this.style[attr] = '';
    else this.style[attr] = val;
    return this;
  },
  Element.prototype['attr'] = function(attr){
    return this.getAttribute(attr);
  },
  Element.prototype.data = function(){
    var dataItems = {};
    dataItems.parentElement = this.parentElement;
    for (var i = 0; i < this.attributes.length; i++){
      var item = this.attributes[i];
      if (item.nodeName.indexOf('data-') === 0){
        dataItems[item.nodeName.substr(5)] = item.value === 'true' ? true : item.value;
      } 
    }
    return dataItems;
  },
  Element.prototype.animate = function(from, optEnd, duration, func){
    var ani = new v.ani(duration);
    var self = this;
    ani.from(from);
    ani.to(optEnd);
    ani.step(func.bind(self));
    return ani.start();
  },
  Element.prototype.visible = function(){
    if (this.offsetWidth === 0 || this.offsetHeight === 0) return 0;
    var height = document.documentElement.clientHeight,
        rects = this.getClientRects(),
        on_top = function(r) {
           var x = (r.left + r.right)/2, y = (r.top + r.bottom)/2;
           document.elementFromPoint(x, y) === this;
         }.bind(this);
     for (var i = 0, l = rects.length; i < l; i++) {
        var r = rects[i],
           in_viewport = r.top > 0 ? r.top <= height : (r.bottom > 0 && r.bottom <= height);
        if (in_viewport && on_top(r)) return true;
    }
    return 0;
  }
} else {
  console.warn('HTMLElement none');
};

v.Templates = {};

v.template = (function(){
  function _Template(){
    this.code = undefined;
    this.Q = [];
  }
  
  //새 템플릿 정의 v.template(path, object) <-- 큐에 저장한다.
  //   아직 템플릿 함수가 정의되지 않았다. 템플릿이 없으면 새로 만든다.
  //   그래야 두번 비동기 로딩하지 않는다.
  // 비동기 로딩후 compile한 함수를 지정한다.
  function Template(pathOrName, opts){
    //options가 없으면
    var options = opts || {codebase:v.render.codebase, data:{}};
    var codebase = options.codebase || '';
    var name = Template.getTemplateName(codebase + pathOrName); //확장자를 제외한 이름
    options.sheetName = name.replace(/\//g, '_').replace(/(-|\.)/g,'_');  //나중에 자식 UI 호출할 때 caller 속성으로 넘긴다.
    var retTemplate = v.Templates[options.sheetName]; //[name];
    
    //정의된 템플릿이 없으면 만든다.
    if (!retTemplate) {
      var prom = v.promise(undefined, pathOrName);
      retTemplate = new _Template();
      v.Templates[options.sheetName] = retTemplate;
//      v.Templates[name] = retTemplate;
      retTemplate.Q.push({prom:prom, options: options});

//      v.render.push(name);
      
      v.getText(codebase + pathOrName, undefined, codebase + pathOrName).then(function(xhr, data){
        if (xhr.status && xhr.status !== 200){
          var q = retTemplate.Q.pop();
          q.prom(false, [new Error('Template Cannot be loaded from [' + codebase + pathOrName + ']\n' + xhr.responseText), xhr.status]);
          retTemplate.Q = [];
          return;
        }
        retTemplate.code = v.compile(data, options.sheetName, codebase + pathOrName, options.caller); //);
        if (retTemplate.code.controller){
          var controller = v.Controllers[retTemplate.code.controller];
          if (!controller){
            throw new Error(retTemplate.code.controller + ' is not defined [' + codebase + pathOrName + ']');
          }
          retTemplate.code.controller = controller;
        }
        
        //모든 큐에서 프로마지즈와 옵션을 꺼내어 컴파이한 결과를 리턴한다.
        retTemplate.Q.reverse();
        while(retTemplate.Q.length > 0){
          var q = retTemplate.Q.pop();
          var compiled = retTemplate.code;
          q.options.sheetName = compiled.sheetName;

         try{
//            v.render.push(name);
            q.prom(true, [retTemplate.code, q.options]);
         } catch(e){
            q.prom(false, [e, retTemplate.code]);
         }
        }
      }, function(err){
        alert(err);
        console.error(err);
        retTemplate.Q = [];
      });
      return prom;
    } else {
      if (typeof retTemplate.code === 'function'){
//        v.render.push(name);
        options.sheetName = retTemplate.code.sheetName;
        return  v.promise.sync([retTemplate.code, options], pathOrName);
      } else {
        var prom = v.promise(undefined, pathOrName);
        retTemplate.Q.push({prom:prom, options: options});
        return prom;
      }
    }
  }
  
  Template.getTemplateName = function(path){
    var domainMatchs = path.match(/(http.?\:\/\/)([^\/]*)(\/.*)/);
    var domain = domainMatchs ? domainMatchs[2].replace(':','') + '_' : ''; // path.replace(/(http.?\:\/\/)([^\/]*)(\/.*)/, '$2').replace(':','_');
    var uipath = path.replace(/(http.?\:\/\/)([^\/]*\/)/, '').replace(/\.[^\.]*$/, '');
    return domain + uipath;
  }

  return Template;

})();
  
v.render = (function(){
  var _getElementFromSelector = function(selector){
    if (typeof selector === 'string'){
      var el = v.$$(selector, 1000);
      if (el && el.nodeType === 1) return el;
      return;
    } 
    else return selector;
  }
  
  function Render(){
    this.codebase = '';
    this.Q = [];
    this.QI = {}; //큐 정보 저장 
    this.EQ = [];
  }
  
  var __renderLevel = 0;
  var __renderHistory = [];
  var __renderParams = {};

  var initQueue = function(){
    __renderLevel = 0;
    __renderHistory = [];
    __renderParams = {};
    v.render.Q = [];
    v.render.EQ = [];
    v.render.QI = {
      "1" : {qp:"", qc:{}, qid:"1"}
    };
  }
  
  Render.prototype.initQueue = function(){
    initQueue();
  }

  Render.prototype.push = function(data){
    __renderHistory.push(data);
    this.Q.push(data);          
  };
  
  var finalRender = function(options){
    if (options){
      v.log("Final Render : ", __renderLevel, options);
//      L_APPLY();
      if (v.render.EQ.length > 0) alert('Error occured while routing\nCheck the console log');
        var targetEl = v.$(options.target).getChild(-1);
        v.postMessage("Ready", targetEl, null);
        //Navbar Update 대상
        switch (options.target){
          case '.overlay':
          case '.pages':
          case '.views':
            if (targetEl.css('page') || targetEl.css('view')){
              v.router.onpostroute(targetEl, targetEl.pairEl, options);
            }
          break;
        }
      } 
      try{
        v.$(".loading").css('visible','');
      } catch(e) {}
      initQueue();
//      console.log("Render.prototype.pop ", v.render.Q.length);
//      console.log("L_APPLIED ", message, L_APP_LANG);
    
  }
  
  Render.prototype.pop = function(qid,el){
    var t, p;
    try{
      t = this.QI[qid];
      if (!t) return;
      p = v.isEmpty(t.qp) ? undefined : this.QI[t.qp];
    } catch (e){
      console.log(e);
      return;
    }
    //부모에 등록되어 있으면 자식을 삭제한다.
    if (p){
      delete p.qc[qid];
    }
    var toBeDel = [];
    //자식이 없으면 삭제한다.
    if (v.isEmpty(t.qc)){
      toBeDel.push(t.qid);
      var tp = this.QI[t.qp];
      while(tp && v.isEmpty(tp.qc)){
        //부모가 없으면 최후에 ...
        //부모에 다른 자식이 있으면 더이상 진행하지 않는다.
        if (!v.isEmpty(this.QI[tp.qid].qc)) break;
        if (!v.isEmpty(this.QI[tp.qp])){
          delete this.QI[tp.qp]['qc'][tp.qid];
        } 
        toBeDel.push(tp.qid);
        tp = this.QI[tp.qp];
      }
      for(var i = 0; i<toBeDel.length; i++){
        console.log("TODEL ", toBeDel[i]);
        delete this.QI[toBeDel[i]];
      }
      if (el){
        var onur = el.getAttribute('onuiready');
        if (onur){
          // Listen for the event.
          el.on('uiready', new Function(onur));
        }
        if (el.events['uiready']) el.dispatchEvent(v.uireadyevent);
      } 
      if (v.isEmpty(this.QI)){
        finalRender(v.render.Q[0]);
      }
    } 
  }
  
   //Render.ui에서 호출되는 실제 렌더 함수 
   //Render.load 함수에서 template을 구한 후 옵션을 추가해서 전달할 수도 있다.
   // ui요소는 항상 element이다.
   Render.prototype.renderUI = function(ui, options){
//     this.push(ui);
     __renderLevel++;
     if (__renderLevel > v.conf.MAX_LOAD){
       console.error('MAX_LOAD reached! If you want to load more, increse v.conf.MAX_LOAD value!!', __renderHistory);
       throw new Error('MAX_LOAD reached! If you want to load more, increse v.conf.MAX_LOAD value!!');
     } 
    var self = this;
    var opts ={data:{}};
    try{
      ui.css('ui', '');
    } catch(e){
      throw e;
    }
    v.extend(opts, options);
    v.extend(opts.data, ui.data());
   // ui에 data-options가 있는 경우 기존 옵션을 덮어쓴다.
    opts.src = (opts.src || ui.attr('src'));
    if (!opts.src) {
      var tag = v.tags[ui.tagName.toLowerCase()];
      if (typeof tag === 'object') v.extend(opts, tag);
      else opts.src = tag;

      if (!opts.src){
        v.debug('src is not defined');
        opts.src = 'v/tags/' + ui.tagName.toLowerCase() + '/';
      } 
    } 

    opts.data.animate = options.animate || opts.data['animate'];
    opts.params = opts.params || {};
    
    v.extend(opts.params, __renderParams);
    
    var srcInfo = v.parseUri(opts.src);
    v.extend(opts.params, srcInfo.params);
    opts.src = srcInfo.uri;

    if (!opts.target){
      //view와 페이지는 path이름으로 판별한다.
      if (this.Q.length === 1){
        opts.target = getTargetFromPath(opts.src);
//        if (!opts.target) return ;
      }
    } 

    opts.codebase = opts.codebase || this.codebase;
    if (ui.id) opts.id = ui.id;
    var contextObject =  self.decideContext(ui, opts);
    //promise 함수가 전달되면 decideContext 함수 내에서 처리한다.
    if (contextObject){
      if (contextObject.then) return;
      else opts.context = contextObject;
    }
    //context가 있는 경우와 없는 경우
//    v.template(opts.src, opts, ui).then(function(compiled){
    v.template(opts.src, opts).then(function(compiled, options){
      self.preDisplay(compiled, options, ui)
    },function(err, code){
      v.render.pop(options.qid);
    });
  }

  Render.prototype.preDisplay = function(compiled, options, ui){
    //컨트롤러중 context 함수가 있으면 optons context와 결합하여 
    //옵션에 추가한다.
    //컨트롤러는 options 자체를 바인딩한다.
    if (!compiled){
      this.pop(options.qid);
      return;
    } 
    var self = this;
    
    if (options.target !== '.overlay' && compiled.target){
      if (!options.target) throw new Error(compiled.target + ' template must have a name ended by ' + compiled.target + " or you hav to specify a target explicitly!");
      if (compiled.target !== options.target.toLowerCase()) throw new Error(compiled.target + ' cannot be rendered to ' + options.target);
    }
    
    if (!options.context) options.context = {};
    
    if (compiled.controller){
      if (!options.skipinit){
        try{
          var ret = compiled.controller.oninit(options);
          if (ret && ret.then){
            ret.then(function(){
              if (arguments.length > 0){
                if (v.isArray(arguments[arguments.length-1])) options.context = arguments[arguments.length-1];
                else v.extend(options.context, arguments[arguments.length-1]);
              } 
              self.display(compiled, options, ui);
            }, function(err){
              v.render.EQ.push(err);
              v.render.pop(options.qid);
              console.warn(err);        
            });
            return;
          } else {
            options.context = ret; //|| options.context;
          }
        } catch(e){
          v.render.EQ.push(e);
          v.render.pop(options.qid);
          console.warn(e);        
          return;
        }
      }
    } 
    this.display(compiled, options, ui);
  }
  
  Render.prototype.removePrevios = function(active, prevEl, options, replace){
    if (!prevEl) return;
    if (typeof prevEl.dispose === 'undefined') return;
    if (options && options.keep == 'keep') return;
    if (options && (options.keep=== 'replace' || options.keep==='inplace')) replace = true;
    prevEl.dispose(!replace);
  }
  
  Render.prototype.processPopup = function(fchild, options, ui){
      //options.position에 따라 위치 결정.
      //마지막 view의 왼쪽 
      var pc = v.$$(".page-content", 100);
      var pcPos = {x:0, y:0};
      if (pc) pcPos = v.css.getPos(pc);

      var refSelector = options.position.ref; 
      var ref = ui;
      if (refSelector) ref = v.$(refSelector) || ui;
      var offsetTop = options.position.top || 0;
      var offsetLeft = options.position.left || 0;
      var size = v.css.getSize(fchild);
      var refPos = v.css.getPos(ref);
      var refSize = v.css.getSize(ref);
      fchild.style.top = (refPos.y+offsetTop) + 'px';
      fchild.style.left = (refPos.x+offsetLeft+pcPos.x) + 'px';
//      console.log(v.css.getPos(ref));
//      console.log(v.css.getSize(ref));
      return;
  }

  var copyUIAttributes = function(ui, targetEl, replace, options){
    if (replace){
       if (ui.id) targetEl.id = targetEl.id || ui.id;
       var classAttr =  ui.className.replace(/(ui[\s]*)/, '') || options.data['css'];
       if (classAttr) targetEl.className = classAttr;
       var styleAttr = ui.getAttribute('style') || options.data['style'];
       if (styleAttr) targetEl.setAttribute('style', styleAttr);

       var onready = ui.getAttribute('onuiready');
       if (onready) targetEl.setAttribute('onuiready', onready);
    } else {
       var classAttr =  options.data['css'];
       if (classAttr) targetEl.className = classAttr;
       var styleAttr = options.data.style;
       if (styleAttr) targetEl.setAttribute('style', styleAttr);
    }
  }
  
  Render.prototype.html = function(html, options, ui){
    //표시할 객체를 만들고 컴파일된 내용으로 업데이트한다.
    var replace = (options.keep && options.keep !== 'keep');
    var html;
 
    var targetEl;
    var prevEl;
    if (replace){
      prevEl = ui;
      ui.insertAdjacentHTML('afterEnd', html);
      targetEl = prevEl.nextElementSibling || prevEl.nextSibling;
    } else{
      prevEl = ui.getChild(-1);
      ui.insertAdjacentHTML('beforeEnd', html);
      if (prevEl) targetEl = prevEl.nextElementSibling || prevEl.nextSibling;
      else targetEl = ui.getChild(-1);
    } 
    this.ui(targetEl);
    if (replace && !targetEl.id){
       if (ui.id) targetEl.id = ui.id;
       var classAttr =  ui.className.replace(/(ui[\s]*)/, '');
       if (classAttr) targetEl.className = classAttr;
       var styleAttr = ui.getAttribute('style');
       if (styleAttr) targetEl.setAttribute('style', styleAttr);
    }
    
    //display2에서 onload 재정의한다.
    v.render.display2(targetEl, prevEl, options, replace);
  }  
  
  Render.prototype.update = function(el, options){
    if (typeof el !== 'object') return;
    if (el.length){
      for(var i = 0; i < el.length; i++){
        if (el[i].update){
          el[i].update(options);
        }
      }
    } else {
      if (el.redraw) el.update(options);
    }
  }

  Render.prototype.display = function(compiled, options, ui){
    if (!ui.parentElement) return;
    //표시할 객체를 만들고 컴파일된 내용으로 업데이트한다.
    var tagName = ui.tagName.toLowerCase();
    var replace = (tagName !== 'div'); 
    if (options && options.keep){  //inplace 옵션은 router에서 부모 타켓으로 보내므로 별도 처리
      replace = (options.keep === 'replace');
    }
    var html;
    options.data.id = ui.id;
    if (compiled.controller){
      html = compiled.controller.render(options.context, true, options.params, options.data);
    }
    else{
      html = compiled(options.context, true, options.params, options.data);
    } 
    
    var targetEl;
    var prevEl;

    if (replace){
      prevEl = ui;
      targetEl = ui.insertAdjacentHTML('afterEnd', html);
      targetEl = prevEl.nextElementSibling || prevEl.nextSibling;
      copyUIAttributes(ui, targetEl, replace, options);
    } else{
      prevEl = ui.getChild(-1);
      ui.insertAdjacentHTML('beforeEnd', html);
      if (prevEl) targetEl = prevEl.nextElementSibling || prevEl.nextSibling;
      else targetEl = ui.getChild(-1);
      copyUIAttributes(ui, targetEl, replace, options);
    } 
/*    if (!targetEl.context) targetEl.context = options.context;
    else  v.extend(targetEl.context, options.context);
*/
    targetEl.pairEl = prevEl;


    options['animatecss'] = options['animatecss'] || targetEl.attr('animatecss');
 
    L_APPLY(targetEl);

    
    targetEl['templateName'] = options.sheetName;
    targetEl.options = v.clone(options);
    if (compiled.controller){
      compiled.controller.bindto(targetEl,options);
      targetEl._updatefunc = compiled.controller.render;
    } else {
      targetEl._updatefunc = compiled;
    }


//    v.extend(targetEl.options['data'], options.data);
    v.extend(targetEl.options['params'], options.params);
    targetEl.context = options.context;
    targetEl.update = function(opt){
      v.extend(this.options, opt);
/*      v.extend(this.options['data'], opt.data);
      v.extend(this.options['params'], opt.params);*/
      this.options.keep = "replace";  //redraw용
      this.options['qid'] = "1";
      v.render.renderUI(this, this.options);
    }.bind(targetEl);

    if (options.position){
      this.processPopup(targetEl, options, ui);
    } 


/*    var noui =  targetEl.attr('type');
    if (!noui || noui.toLowerCase() !=="html"){*/
    var newOpt = v.clone(options);
    newOpt['data'] = v.clone(options.data);
    newOpt['animatecss'] = '';
    newOpt.data['animate'] = '';
    newOpt['animate'] = '';
    this.ui(targetEl, undefined, options.codebase, options.sheetName, newOpt);
/*    } */
    //속성 복사 
    //display2에서 onload 재정의한다.
    targetEl.pairEl = prevEl;
    v.render.display2(targetEl, prevEl, options, replace);
  }
  
  Render.prototype.display2 = function(targetEl, prevEl, options, replace){
   if (targetEl.onload){
      if (!targetEl.onload(targetEl, prevEl, options)){
        this.removePrevios(targetEl, prevEl, options, replace);
      }
    } else {
      this.removePrevios(targetEl, prevEl, options, replace);
    }

/*    var noui =  targetEl.attr('type');
    if (!noui || noui.toLowerCase() !=="html"){
      this.ui(targetEl, undefined, options.codebase, options.sheetName);
    }*/
    
    v.render.pop(options.qid, targetEl);
 }

  Render.prototype.renderAsyncFunction = function(ui, func, options){
      var self = this;
      var ret = func(options);
      if (ret && ret.then){
        return ret.then(function(){
          var argLen = arguments.length;
          if (argLen > 0) options.context = arguments[argLen-1];
          else options.context = null;
           v.template(options.src, options).then(function(compiled, options){
             self.preDisplay(compiled, options, ui);
           }, function(err, code){
             v.render.pop(options.qid);
             alert(err);
           })
        })
      }
      return ret;
    }

  //element 스스로 렌더링한다.
  Render.prototype.ui = function(selector, message, codebase, parentSheet, options){
    var element = _getElementFromSelector(selector);
    if (!element) throw new Error('Invalid Target "' + selector + '"!');
    
    var noui =  element.attr('type');
    if (noui && noui.toLowerCase() =="html") return;


    var self = this;
    var ui = element.$$(".ui");
    if (!options) options = {};

   var i = 0;
   var qpid = options.qid || "1";  //부모의 Q ID
   v.each(ui, function(el){
      var qid = (parseInt(qpid) + 100 + i++).toString();
      if (!v.render.QI[qid]){
        v.render.QI[qid] = {qp:qpid, qc:{}, qid:qid};
        if (v.render.QI[qpid]) v.render.QI[qpid]['qc'][qid] = ""; 
      }
    });

    i = 0;
    v.each(ui, function(el){
      var opt = {params:{}, data:{}};
      if (options.params) v.extend(opt.params, options.params);
      if (options.data) v.extend(opt.data, options.data);
      if (codebase) opt['codebase'] = codebase;
      opt['caller'] = parentSheet;
      var qid = (parseInt(qpid) + 100 + i++).toString();
      opt['qid'] = qid;
      self.renderUI(el, opt);
//      self.renderUI(el, codebase ? {codebase:codebase, caller:parentSheet} :  {caller:parentSheet});
    });
  }

    //context에 함수가 포함된 경우 renderAsyncFunction
  Render.prototype.decideContext = function(ui, opts){
    //context가 있는 경우와 없는 경우
    opts.context = opts.context || opts['data'].context;
    if (opts.context){
      var ctx;
      //최종 컨텍스트 타입을 확인한다.
      if (typeof opts.context === 'string'){
        //v.Context[]에 있는지 검사
        ctx = v.context(opts.context);
        if (ctx){
          if (typeof ctx === 'function'){
              return this.renderAsyncFunction(ui, ctx, opts);
          } else return ctx;
        } else return ctx;
      } else if (typeof opts.context === 'function'){
        return this.renderAsyncFunction(ui, opts.context, opts)
      } else return ctx;
    }
    return;
  }
    
    
  Render.prototype.to = function(path, target){
    Router.prototype.load(path, target);
  }
  
  var getTargetFromPath = function(path){
    var match = path.match(/.*(view|page)\..*/i);
    if (match) return '.' + match[1].toLowerCase() + 's';
    return '';
  }
 
  Render.prototype.showloader = function(options){
    if (options.data && options.data.loading){
      try{
        var maxTime = parseInt(options.data.loading);
        if (maxTime > 1000){
          v.$('.loading').css('visible', 'visible');
          setTimeout(function(){
            v.$('.loading').css('visible', '');
          }, maxTime);
        }
      } catch(e) {
        debugger;
      }
    }
  }
  
  Render.prototype.load = function(path, target){
    var options = {};
    if (typeof target === 'object') v.extend(options, target);
    else if (typeof target === 'string') options['target'] = target; 
    if (v.isEmpty(target) || !options.target){
      //view와 페이지는 path이름으로 판별한다.
      options.target = getTargetFromPath(path);
      if (!options.target) return ;
    } 
    var element;
    if (options.target === '.overlay') element = v.$('.overlay');
    else element = _getElementFromSelector(options['target']);
    if (!element){
      console.warn(options['target'] + ' is not found!');
      return; // throw new Error('Invalid Target "' + options['target'] + '"!');
    } 
    if (path) options['src'] = path;

    v.extend(__renderParams, target.params);

    initQueue();
    this.push(options);
/*    var qid = "1";
    this.QI[qid] = {};
    this.QI[qid]['qp'] = "";
    this.QI[qid]['qc'] = {};
    this.QI[qid]['qid'] = qid;*/
    options['qid'] = "1";
    this.showloader(options);
    this.renderUI(element, options);
  }
  
  Render.prototype.open = function(path, target){
    var options = {target: '.overlay', src:path, keep:"modal"};
    if (typeof target === 'object') v.extend(options, target);
    else if (target) options.target = target;
    
    var element = _getElementFromSelector(options['target']);
    if (!element){
      console.warn(options['target'] + ' is not found!');
      return;
    } 

    if (path) options['src'] = path;   

    v.extend(__renderParams, target.params);
    
    initQueue();
//    this.push({message:"Ready", options:options});
    this.push(options);
    v.$$(options.target, 1000).css('overlay-visible','overlay-visible');
    options['qid'] = "1";
    this.showloader(options);
    this.renderUI(element, options);
  }
  
  Render.prototype.close = function(){
  }

  return new Render();
})();  

// 템플릿을 컴파일과 외부 환경과 연결하는 링크과정으로 나뉜다.
v.compile = function(source, templName, path, caller) 
{
  var templateName = templName;
  var m_styles = '';
  //첫번째 라인에서 template인지 결정
//  var matches = source.match(/^template\.name\s*?=\s*(\S*)/); 
  var controller = source.match(/^controller\s*=\s*["']?(\w+)["']?(\S*)/);
  var imports = source.match(/^#import\s+["']?(.+)["']?\S*/gm);
  //script name="controllername"찾기
  var scriptControllerSource = '';
  var scriptControllerName = '';
  var controllerObject;
  if (controller) controllerObject = v.Controllers[controller[1]];
  source = source.replace(/\<script\s*name\s*=["']?(\w*)["']?\>[\s\S]([\s\S]*?)\<\/script\>/mi, function(){
    scriptControllerName = arguments[1] || templName + 'Controller';
    if (scriptControllerName && v.Controllers[scriptControllerName]){
      var errMsg = 'Same Controller is exist. Change the controller Name of ' + path; 
      alert(errMsg);
      console.error(errMsg);
      throw new Error(errMsg);
    }
    scriptControllerSource = "\nvar $ui=this;\nvar debug=function(){console.log((new Error).stack);};\n";

    if (v.config.debug){
    scriptControllerSource += arguments[2].replace(/((?:[^\:])|^)(\/\/.*[\r\n])/g, '$1');//.replace(/(^[\s]*)/gm, '');
    }
    else 
    scriptControllerSource += arguments[2].replace(/(\/\*[\s\S]*?\*\/)/gm, '').replace(/((?:[^\:])|^)(\/\/.*[\r\n])/g, '$1').replace(/(^[\s]*)/gm, '');
    return '';
  })

  var controllerName = scriptControllerName || (controller ? controller[1] : '');
  
/*  if (!matches || matches.length < 2) return sanitize(src, pretty);
  else templateName = matches[1];*/
  var src;
//  if (!matches || matches.length < 2){
//     templateName = templName;
//  } else{
//    templateName = matches[1];
//  } 
  src = source.replace(/\r/gm, '');

  if (!templateName) throw new Error('Template Name is Empty!'); // return sanitize(src);
  
//  src = src.replace(/template\.name\s*=(.+[\s\S])/, '<?\n?>');  //첫줄 <script가 없는 경우 오류가 생겨서...강제 추가
  //정리한 소스를 함수 템플릿을 만들기 위한 함수에 전달
//  var ret = makeFunctionTemplate("<?;?>" + sanitize(src), path, caller);
  var ret = makeFunctionTemplate(sanitize(src), path, caller, controllerName);
  ret.controller = ret.controller || controllerName;
  ret.sheetName = m_styles ? templateName : undefined;
  return ret;
  
  function stripComments(src){
    return src.replace(/^([\s\S]*?)(?=\<)/m,'');//.replace(/((?:[^\:])|^)(\/\/.*[\r\n])/g, '$1').replace(/(^[\s]*)/gm, '').replace(/(\/\*[\s\S]*?\*\/)/gm, '');
  }
  
  //템플릿 소스를 정규식 처리하기 위해 전처리한다.  
  function sanitize(src1)
  {
    var cleanSource = '';
    var src = stripComments(src1);    
    if (Array.isArray(src)) {
      for (var i = 0; i < src.length; i++) {
        cleanSource += src[i].replace(/^ +/gm, ''); //.replace(/\r/gm, '');
      }

    } else
      cleanSource = src.replace(/^ +/gm, ''); //.replace(/\r/gm, ''); 
    return cleanSource;
  }

  //1.소스 정리
  //2.eval용 헤더 테일  
  function makeFunctionTemplate(str, path, caller, controllerName){
      str = parseStyle(str);
      var script = '';
      var head = '';
      //html 요소의 이스케이핑 
      var styleSheetName = templateName + 'Sheet';

      if (m_styles && v.css.rules){
        script += '\nif (init) v.css.rules.addto("' + templateName + 'Sheet", "' + m_styles + '","'+(caller || '')+'", "'+path+'");\n';
      }
      head +='var zQx =\'';
      var s = parse(str);
      if (controllerName) s = s.replace(/\$this/gm, 'v.Controllers.'+controllerName);
      //최초 div class="view / page" 판다.
      //{{ }} 템플릿 지원
      if (v.conf.useCurly){
        s = s.replace(/({{)(.*?)(})}/gm, function(){
            return '\'\n+(' + arguments[2].replace(/\\\'/g, '\'') + ')\n+\'';
        });
      }

//      var tail = '\';} catch(e) {throw e}\nreturn zQx.replace(/(\<!--[\s\S]*?--\>)/gm,\'\');';
      var tail = '\';}\ncatch(e){throw e}\nreturn zQx;';
      var retFunction;
      try{
        retFunction = new Function("return function " + templateName + "(context, init, params, data){\nvar $PATH='" + path + "';\n"+ script +"\ntry {\n" + head + s + tail + "}")();
        window[templateName] = retFunction;
//        retFunction = new Function(["context", "init", "params", "data"], script + head + s + tail);
        if (controllerObject){
          controllerObject.render = retFunction; // retFunction.bind(controllerObject);
        } else {
          if (scriptControllerName){
              if (!v.Controllers[scriptControllerName]){
                try{
                  var bindFunc = new Function("return function " + templateName + "(){" + scriptControllerSource + "}");
                  new v.Controller(scriptControllerName, bindFunc());
                  v.Controllers[scriptControllerName].render = retFunction; //.bind(v.Controllers[scriptControllerName]);
                  window[templateName].controller = scriptControllerName;
                } catch(e){
                  throw e;
                }
              }
          }
        }
        return retFunction; 
      } catch(e){
          var stack; // = '<script>function ' + templateName + '(){\n' + head + s + tail +  ';\n}</script>';
          var r =  head + s.replace(/\\\n/gm, '\n');
          console.warn("function " + templateName + "(context, init, params, data){\nvar $PATH='" + path + "';\n" + script + "\ntry {\n" + r + tail +";}");
          console.error(e.message + " : " + path);
          throw e;
      }
  }
  
  function parseStyle(str){
    var matches = str.match(/(?:\<style.*?\>)([\s\S]*?)(?:\<\/style\>)/gm);
    if (!matches) return str;
    if (matches.length > 0){
      for(var idx = 0; idx < matches.length; idx++){
        m_styles += matches[idx].replace(/(\<style.*?\>)([\s\S]*?)(\<\/style\>)/gm, function(){
          var arg = arguments[2] || '';
          return arg.replace(/\n/gm, '\\n').replace(/"/gm, '\\"');
        });
      }
      if (m_styles.length <20) m_styles = '';
    }
    return str.replace(/\<style.*?\>[\s\S]*?\<\/style\>/gm, '');
  }
  
/*   function parse(src1) {
    var isfirst = true;
//    var str = src1.replace(/\<script\>/gm, '<?').replace(/\<\/script\>/gm, '?>');
    var str = src1.replace(/(\<script\>)([\s\S]*?)(\<\/script\>)/gm, '<?$2?>');
    var ret = escapeTemplateAll(str)
    return ret;
  }
*/  
function parse(src1){
    function finalizeToken(ret, lastDelim){
      if (lastDelim){
        ret[0].push(";\n");
        ret[0].push(ret[1].join(''));
        ret[0].push("\nzQx += '");
      } 
      else{
        ret[0].push(";\n+" + ret[0].push(ret[1].join('')) + "+\n zQx += '");
      } 
      ret[1] = [];
      lastDelim = '';
      return 0; //mode;
    }

    var str = src1.replace(/(\<script\>)([\s\S]*?)(\<\/script\>)/gm, '<?$2?>');
    var ret = [];
    ret[0] = [];
    ret[1] = [];
    var pushedToken = '';
    var blanks = '';
    var lastDelim = '';  //mode 1일때 마지막 공백 아닌 문자 저장
    var mode = 0;   //1script
    var idx = 0;
    var i = 0;
    var ch = str[i];
    var isComment =false;
    while(ch){
      if (isComment){
        switch(ch){
          case '-':
            if (pushedToken !=='!') pushedToken=ch;
            break;
          case '>':
            if (pushedToken=='-'){
              isComment=false;
            }
            pushedToken = '';
            break;
          default:
            pushedToken = '';
            break;
        }
        ch = str[++i];
        continue;
      }
      switch(ch){
        case '!':
          if (mode==0 && pushedToken=='<'){
            isComment = true;
            pushedToken='!';
          } 
          break;
        case '<':
          if (pushedToken){
            if (pushedToken == '?' || pushedToken == '@'){
              ret[0].push(pushedToken);
              pushedToken = ch;
            }
            else {
              ret[mode].push(pushedToken); pushedToken = ''
              blanks = '';
            } 
          }
          else{
            ret[0].push(blanks);
            pushedToken = ch;
            blanks = '';
          } 
          break;
        case '>':
          if (pushedToken === '?' || pushedToken === '@'){
            mode = finalizeToken(ret, lastDelim);
          } else {
            ret[mode % 2].push(ch);
          } 
          pushedToken = '';
          break;
        case '?':
        case '@':
          if (!pushedToken) pushedToken = ch;
          else {
            if (pushedToken === '<'){
              ret[0].push("'")
              mode = 1;
            } else {  //<?가 아닌 경우에 대한 처리는 나중에
              ret[0].push(pushedToken + ch);
            }  
            pushedToken = '';
          }
          break;
        case '#':
          if (!pushedToken) pushedToken = ch;
          else {
            if (pushedToken === '#'){
              ret[0].push("'")
              mode = 3;   //@sign \r\n이 나올때 까지 반복
            } else {  //<?가 아닌 경우에 대한 처리는 나중에
              ret[0].push(pushedToken + ch);
            }  
            pushedToken = '';
          }
          break;          
        case '\r':
          if (mode == 3){
            mode = finalizeToken(ret, lastDelim);
            ret[0].push("\\\n");
          }
          break;
        case '\n':
          if (mode == 3){
            mode = finalizeToken(ret, lastDelim);
            ret[0].push("\\\n");
          } else {
            if (mode === 1) ret[1].push(ch);
            else ret[0].push("\\\n");
          }
          break;
        case '\'':
          if (pushedToken){
            ret[0].push(pushedToken);
            pushedToken = '';
          }
          if (mode === 0) ret[0].push('\\\'');
          else  ret[mode%2].push('\'');
          break;
        default:
          if (pushedToken) ret[mode%2].push(pushedToken);
          pushedToken = '';
          if (mode > 0){
            switch(ch){
              case ";":
              case "{":
              case "}":
                 lastDelim = ch;
                 break;
            }
            ret[mode%2].push(ch);
          } else {
            //일반 모드일 경우 공백이 계속되면 
            switch(ch){
              case " ":
              case '\t':
                blanks += ch;
                break;
              default:
                ret[0].push(blanks);
                ret[0].push(ch);
                blanks = '';
                break;
            }
          }
      }
      ch = str[++i];
    }
    if (mode !== 0) ret[0].push(';');
    return ret[0].join('');//.replace(/\<\!--[\s\S]*?--\>/gm,'');
  }
  
};


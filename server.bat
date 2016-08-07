@ECHO OFF
SET WEBROOT=www
SET PHPROOT=server
pushd "%~dp0"
SET param=%~1
SET phpport=%~2
SET phppath=%~3
IF "%param%"=="" SET param=8000
cd nginx

GOTO killproc

:start
(echo listen %param%;) > conf\nginx.ini
(echo server_name  localhost;) >> conf\nginx.ini
(echo index  index.html index.htm;) >> conf\nginx.ini
(echo root '%~dp0%WEBROOT%';) >> conf\nginx.ini
 
(echo location / {) >> conf\nginx.ini
(echo     root   '%~dp0%WEBROOT%';) >> conf\nginx.ini
(echo     index  index.html index.htm;}) >> conf\nginx.ini
 
IF "%phpport%"=="" GOTO onlynginx
(echo include php.cgi.ini;) >> conf\nginx.ini
ECHO Starting PHP FastCGI...
call RunHiddenConsole.exe %phppath%php-cgi.exe -b localhost:%phpport%
if %ERRORLEVEL% NEQ 0 goto fail
:onlynginx
IF "%phpport%"=="" SET phpport=9000
(echo location ~ \.php$ {) >conf\php.cgi.ini
(echo   fastcgi_pass localhost:%phpport%;) >> conf\php.cgi.ini
(echo   root '%~dp0server';) >> conf\php.cgi.ini
(echo   fastcgi_split_path_info ^^^(.+?\.php^)^(/.*^)$;) >> conf\php.cgi.ini
(echo   if ^(!-f $document_root$fastcgi_script_name^) { return 404;}) >> conf\php.cgi.ini
(echo   fastcgi_index  index.php^;) >> conf\php.cgi.ini
(echo   fastcgi_param  SCRIPT_FILENAME  $document_root$fastcgi_script_name^;) >> conf\php.cgi.ini
(echo   include fastcgi_params^;) >> conf\php.cgi.ini
(echo }) >> conf\php.cgi.ini
ECHO Starting NGINX...
call RunHiddenConsole.exe nginx-local.exe
popd
exit /b

:killproc
IF EXIST logs\nginx.pid. (
  set /p PID=<logs\nginx.pid
  ECHO "프로세스 실행 중..." %PID%
  ECHO Taskkill /PID %PID% /F
  call nginx-local -s stop 2>NUL
)
call taskkill /F /IM php-cgi.exe /T 2>NUL
IF "%param%"=="stop" (
  popd
  exit /b
)
goto start
:fail
popd
ECHO "USAGE : server.bat [stop | nginx_port] [php-cgi_port] [php_path\]      "
ECHO "   options:                                                            "
echo "      stop : Stop server                                               "
echo "      nginx_port : nginx server listen port (default:8000)             "
echo "      php-cgi_port : php-cgi listen port (default:9000)                "
echo "      php_path : the path containing php-cgi.exe (default:none)        "
echo "                 if empty server find the php-cgi from PATH Environment" 
popd
exit /b

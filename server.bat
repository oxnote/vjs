@ECHO OFF
pushd "%~dp0"
SET param=%~1
SET phpport=%~2
SET phppath=%~3
IF "%param%"=="" SET param=8000
cd nginx

IF "%param%"=="stop" GOTO end

call nginx-local -s stop 2>NUL
call taskkill /F /IM php-cgi.exe /T 2>NUL

(echo listen %param%;root '%~dp0www';) > conf\nginx.ini
IF "%phpport%"=="" GOTO onlynginx
ECHO Starting PHP FastCGI...
call RunHiddenConsole.exe %phppath%php-cgi.exe -b localhost:%phpport%
if %ERRORLEVEL% NEQ 0 goto fail
:onlynginx
IF "%phpport%"=="" (echo fastcgi_pass localhost:9000;root '%~dp0server';) > conf\php.cgi.ini
ECHO Starting NGINX...
call RunHiddenConsole.exe nginx-local.exe
popd
exit /b

:end
call nginx-local -s stop 2> NUL
call taskkill /F /IM php-cgi.exe /T 2> NUL
popd
exit /b
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

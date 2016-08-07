# Simple Nginx Server For VJS-Windows

Windows용입니다. 리눅스 버전은 이미 서버 환경이 구축되었다고 가정하기 때문에 이 유틸리티가 필요없습니다.

## 뭐하러 만들었나?
개발할때마다 웹 서버를 실행하기 귀찮고 PHP 서버도 함께 실행할 경우 더 귀찮아서...

## 어떻게 사용하나?

### 클라이언트 웹만 개발하는 경우 
메인 디렉토리에 있는 server.bat 파일을 실행하면 끝.
혹시 포트를 바꾸고 싶은 경우 server 8100으로 실행

### PHP도 함께 사용하는 경우
Windows용 PHP를 다운로드합니다. 7.0.9버전의 경우 (여기)[http://windows.php.net/downloads/releases/php-7.0.9-nts-Win32-VC14-x64.zip]에서 다운로드 한 후 적당한 폴더에 압축을 풉니다. 이 예제에서는 d:\php\php709 폴더에 풀었다고 가정합니다.

개발용이므로 php.ini.development를 php.ini로 이름 변경합니다. 

```sh
server 8000 9000 d:\php\php709
```

이제 localhost:8000번에서는 정적 페이지를 서비스하는 웹 서비스가 실행되면서 확장자가 .php인 경우 server.bat 파일 상단에
지정한 PHPROOT 변수의 폴더에서 파일을 찾습니다.

주의:PHP이외의 모든 파일은 WEBROOT로 지정(기본값 www) 폴더에서 찾습니다.

## 여러번 반복 실행하는 경우에는 이전 프로그램을 자동으로 종료하고 새로 시작합니다.

## 완전히 끝낼때에는 server stop (대소문자 구분)을 실행합니다.



//path 라이브러리 사용(폴더경로 연산)
const path = require('path')
const crypto = require('crypto');
const fs = require('fs');

//오버라이드 모듈 사용
const methodOverride = require('method-override');

//서버로써 express 프레임 워크 사용
const express = require('express')

//.env의 비밀키들을 process.env에 넣어 process.env.COOKIE_SECRET처럼 키 사용
require('dotenv').config();

// 기본 라우터
const pageRouter = require('./routes/users');

//express 서버 1개를 생성
const app = express()

// Express 서버 포트 설정
const port = 4300

//쿠키를 사용하기 위한 모듈 - 미들웨어
const cookieParser = require('cookie-parser');
//express-session 모듈을 로드
const session = require('express-session');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser('project1-master'));
// 요청객체 req에 cookies 속성이 추가되고, 응답 객체 res에서 cookie()메서드를 호출 가능
app.use(cookieParser());

// session
//저장소를 앞서 DB 연결로 생성된 sessionStore 객체로 지정합니다. (제가 지정한 DB에 session 테이블이 생성됨을 확인할 수 있습니다.)
app.use(session({
  secret: 'test', //세션의 비밀 키, 쿠기값의 변조를 막기 위해서 이 값을 통해 세션을 암호화 하여 저장
  resave: false, // 세션을 항상 저장할지 여부(false를 권장)
  saveUninitialized: true,
  secret: process.env.COOKIE_SECRET,
  cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 24000 * 60 * 60 // 쿠키 유효기간 24시간
  },
}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// app.get('/', (req, res) => {
//   res.render(path.join(__dirname + '/views/index.ejs'))
// })
app.get('/', async function (req, res) {
  res.render('index');
})

app.get('/sidebar', async function (req, res) {
  res.render('sidebar');
})

//오버라이드 사용
app.use(methodOverride('_method'));

app.use("/", express.static(__dirname))
app.use("/public", express.static(__dirname + '/public'))
app.use("/css", express.static(__dirname + '/css'))
app.use("/js", express.static(__dirname + '/js'))
app.use("/images", express.static(__dirname + '/images'))
app.use("/fonts", express.static(__dirname + '/fonts'))

app.use("/public", express.static(__dirname + '/public'));

app.use('/', pageRouter);

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

const express = require('express');
const path = require('path');
const url = require('url');
const fs = require('fs');
const crypto = require('crypto');
const router = express.Router();

// sequelize 초기화
const { Sequelize, DataTypes, Model } = require('sequelize');

// 연결할 DB 설정 (DB schema, ID, PW, 위치)
const sequelize = new Sequelize('test', 'root', 'kulsict2021@', {
  host: 'localhost',
  dialect: 'mysql'
});

const fetch = require('node-fetch');
const { off } = require('process');

// 읽어들일 Table 모양(schema) 정의
const usersTable = sequelize.define('users', {
  _id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING(45),
    allowNull: false,
    primaryKey: true,
    validate: {
      isEmail: true
    },
  },
  password: {
    type: DataTypes.STRING(256),
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  telephone: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  salt:{
    type: DataTypes.STRING(255)
  },
}, {
  tableName: 'users',
  timestamps: false,
});
sequelize.sync()

//회원가입 GET: 회원가입 뷰 페이지를 응답하는 방식
router.get('/signup', (req, res) => {
  res.render('user/signup');
});

//회원가입 POST: 회원가입 버튼을 클릭했을 때 처리
router.post('/signup', async (req, res) => {
  let body = req.body;
  //암호화
  let inputPassword = body.password;
  let salt = Math.round((new Date().valueOf() * Math.random())) + "";
  let hashPassword =  crypto.createHash("sha512").update(inputPassword + salt).digest("hex");
  // DB 연결 체크
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
  } catch (err) {
    console.error('Unable to connect to the database:', err);
    res.send('<script type="text/javascript">alert("서버 에러");location.href="/sign_up";</script>');
    return;
  }
  
  // 새로운 item 생성, DB에 insert 해주는 구문
  try {
    let user = await usersTable.create({
      name: body.name,
      email: body.email,
      password: hashPassword,
      telephone: body.telephone,
      salt: salt,
    });
  }catch (err) {
    console.log(err);
    res.send('<script type="text/javascript">alert("회원가입 실패");location.href="/signup";</script>');
    return;
  }
  res.send('<script type="text/javascript">alert("가입 성공");location.href="/users";</script>');
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//로그인 창(화면) - ejs는 무조 건 render
router.get('/users', async (req, res) => {
  if (req.session.email == null) {
    res.render('user/login');
  } else {
    let user = {
      email: req.session.email,
      name: req.session.name
    }
    try {
      //select * from test.board3;
      let myList = await board3Table.findAll({});
      res.render('list', {user: user, board3: myList});
    } catch (err) {
      console.log(err)
      res.render('list', {user: user, board3: []});
    }
  }
});

//로그인 데이터용
router.post('/users', async (req, res) => {
  let body = req.body;
  console.log(body)

  //id나 password가 빈칸이면
  if (body.email == null || body.password == null) {
    res.send('<script type="text/javascript">alert("잘못된 ID 혹은 비밀번호입니다.");location.href="/users";</script>');
    return;
  }
  // DB 연결 체크
  try {
    await sequelize.authenticate();
    console.log('users db Connection has been established successfully.');
  } catch (err) {
    console.error('Unable to connect to the database:', err);
    res.send('<script type="text/javascript">alert("서버 에러");location.href="/signup";</script>');
    return;
  }
  
  // let user;
  try {
    let user = await usersTable.findOne({
      where: {
        email: body.email,
//         dbPassword: body.password
      }
    });

    //DB에 들어가 있는 비밀번호와 입력한 비밀번호가 일치하는지 확인
    let dbEmail = body.email;
    let dbPassword = user.dataValues.password;
    let inputPassword = body.password;
    let salt = user.dataValues.salt;
    let hashPassword = crypto.createHash("sha512").update(inputPassword + salt).digest("hex");
//     console.log(inputPassword);
//     console.log(dbPassword);
//     console.log(hashPassword);
    if (user == null || user == '') {
      res.send('<script type="text/javascript">alert("등록되지 않은 사용자");location.href="/users";</script>');
      return;
    }
    if(inputPassword == null || inputPassword == ''){
      res.send('<script type="text/javascript">alert("비밀번호 ");location.href="/users";</script>');
      return;
    }
    if(dbEmail != body.email){
      res.send('<script type="text/javascript">alert("id틀림 ");location.href="/users";</script>');
      return;
    }
    if(dbPassword != hashPassword){
      res.send('<script type="text/javascript">alert("pw틀림 ");location.href="/users";</script>');
      return;
    }
    else if(dbPassword == hashPassword){
      // 세션 설정
      req.session.email = user.email;
      req.session.name = user.name;
      req.session.telephone = user.telephone;
      req.session.userId = user._id;
      res.send('<script type="text/javascript"> location.href = "/" </script>');
      return;
    }
  } catch (err) {
    // console.log();
    res.send('<script type="text/javascript">alert("서버 에러");location.href="/users";</script>');
  }
});

// 로그아웃
router.get("/logout", async function(req,res, next){
  // let locations = await getPopularLocation();
  if(req.session.name) {
    req.session.name = undefined;
    req.session.destroy(function(err) { //세션을 삭제하는 메서드 destroy
      if(err) {
        console.log(err);
      }else{
        res.send('<script type="text/javascript">alert("logout");location.href="/users";</script>');
        
      }
    })
  } else{
    res.send('<script type="text/javascript">alert("logout");location.href="/users";</script>');

  }
});

//profile
router.get('/profiles', (req, res) => {
  if (req.session.email == null) {
    res.render('user/login');
  } else {
    let user = {
      email: req.session.email,
      name: req.session.name,
      telephone: req.session.telephone,
    }
    res.render('profile_s', {user: user});
  }
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//cart test
//cart
const cartTable = sequelize.define('cart', {
  userId: { //게시글 아이디
    type: DataTypes.INTEGER,
    // allowNull: true, // Not NULL (NN)
    primaryKey: true // PK
  },
  id: {
    type: DataTypes.STRING(45),
    // allowNull: false, // Not NULL (NN)
    primaryKey: true, // PK
    unique: true
  },
  place_name: {
    type: DataTypes.STRING(45),
    allowNull: false, // Not NULL (NN)
    primaryKey: false // PK
  },
  phone: {
    type: DataTypes.STRING(45),
    allowNull: false, // Not NULL (NN)
    primaryKey: false // PK
  },
  x: {
    type: DataTypes.STRING(45),
    allowNull: false, // Not NULL (NN)
    primaryKey: false // PK
  },
  y: {
    type: DataTypes.STRING(45),
    allowNull: false, // Not NULL (NN)
    primaryKey: false // PK
  }
}, {
  tableName: 'cart',
  timestamps: true,
});

usersTable.hasMany(cartTable, {foreignKey: 'userId', sourceKey: '_id'});
cartTable.belongsTo(usersTable, {foreignKey: 'userId', targetKey: '_id'});
sequelize.sync()

// router.get('/cart', (req, res) => {
//   res.render('profile');
// });

// 
////////////cart_get
router.get('/cart', async (req, res) => {
  if (req.session.email == null) {
    res.render('user/login');
  } else {
    // DB 연결 체크
    try {
      await sequelize.authenticate();
      console.log('cart get db Connection has been established successfully.');
    } catch (err) {
      console.error('Unable to connect to the database:', err);
      res.send('<script type="text/javascript">alert("서버 에러");location.href="/sign_up";</script>');
      return;
    }
    let user = {
      email: req.session.email,
      name: req.session.name
    }

    let myCart;
    try {
      myCart = await cartTable.findAll({
        where: {
          userId: req.session.userId
        }
      });
      myCartWithName = await cartTable.findAll({
        include: [
          {
            model: usersTable,
            required: true
          }
        ],
        where: {
          userId:  req.session.userId
        }
      })
      myCart.reverse();
      console.log(myCart);
      console.log(myCartWithName);
      myCartWithName.reverse();
      res.render('cart', {user: user, cart: myCartWithName});
    } catch (err) {
      console.log(err)
      res.render('cart', {user: user, cart: []});
    }
  }
});

router.post('/cart', async (req, res) => {
  // let body = req.body;
  // console.log(body) //place에 문자를 담은게 나옴
  // let place = JSON.parse(decodeURIComponent(body.place)); //문자열을 객체화 
  
  // DB 연결 체크
  try {
    await sequelize.authenticate();
    console.log('cart post db Connection has been established successfully.');
  } catch (err) {
    console.error('Unable to connect to the database:', err);
    res.send('<script type="text/javascript">alert("서버 에러");location.href="/profiles";</script>');
    return;
  }
  
  // 새로운 item 생성 (새로운 사용자 생성)
  try {
    place.userId = req.session.userId;
    console.log(place);
    await cartTable.create(place);
  } catch (err) {
    console.log(err);
    res.send(null);
    return;
  }
  res.send('<script type="text/javascript">alert("추가 성공");location.href="/profiles";</script>');
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// test
// 게시판 
const board3Table = sequelize.define('board3', {
  idx:{
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: DataTypes.INTEGER
  },
  userId: { //게시글 아이디
    type: DataTypes.INTEGER,
    allowNull: false, // Not NULL (NN)
    // primaryKey: true // PK
  },
  id: {
    type: DataTypes.STRING(45),
    allowNull: false, // Not NULL (NN)
//     primaryKey: true, // PK
    // unique: true
  },
  name: {
    type: DataTypes.STRING(45),
    allowNull: false, // Not NULL (NN)
    primaryKey: false // PK
  },
  title: {
    type: DataTypes.STRING(45),
    allowNull: false, // Not NULL (NN)
    primaryKey: false // PK
  },
  content: {
    type: DataTypes.STRING(3000),
    allowNull: false, // Not NULL (NN)
    primaryKey: false // PK
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false, // Not NULL (NN)
    defaultValue: sequelize.literal('now()'),
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false, // Not NULL (NN)
    defaultValue: sequelize.literal('now()'),
  },
}, {
  tableName: 'board3',
  timestamps: true,
});

usersTable.hasMany(board3Table, {foreignKey: 'userId', sourceKey: '_id'});
board3Table.belongsTo(usersTable, {foreignKey: 'userId', targetKey: '_id'});
sequelize.sync()

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//게시글 작성 페이지로 이동
router.get('/post', async (req, res) => {
  if (req.session.email == null) {
    res.render('user/login');
  } else {
    // DB 연결 체크
    try {
      await sequelize.authenticate();
      console.log('post1 get db Connection has been established successfully.');
      console.log('dssfsfd');
    } catch (err) {
      console.error('Unable to connect to the database:', err);
      res.send('<script type="text/javascript">alert("서버 에러");location.href="/sign_up";</script>');
      return;
    }
    //새로운 item 생성
    let user = {
      email: req.session.email,
      name: req.session.name,
      userId: req.session.userId
    }
    try {
      res.render('post', {userId: user.userId, email: user.email, name: user.name});
    } catch (err) {
      console.log(err)
//       res.render('post', {user: user, post: []});
      res.render('post');
    }
  }
});

//게시글 작성 - 등록 버튼 누르면 나오는 화면
router.post('/post', async (req, res) => {
  // let userId = req.session.userId;
  // let id = req.session.email;
  // console.log(id);
  let body = req.body;

  let user = {
      email: req.session.email,
      name: req.session.name
    }
  // DB 연결 체크
  try {
    await sequelize.authenticate();
    console.log('post2 post db Connection has been established successfully.');
  } catch (err) {
    console.error('Unable to connect to the database:', err);
    res.send('<script type="text/javascript">alert("서버 에러");location.href="/post";</script>');
    return;
  }
  
  // 새로운 item 생성 (새로운 사용자 생성)
  try {
    //DB에 insert해주는 await
    let board = await board3Table.create({
      userId: body.userId,
      id: body.email,
      name: body.name,
      title: body.title,
      content: body.content,
    });
  } catch (err) {
    console.log(err);
    res.send(null);
    return;
  }
  res.send('<script type="text/javascript">alert("추가 성공");location.href="/";</script>');
});


//게시판 목록
//list
router.get('/list', async (req, res) => {
  if (req.session.email == null) {
    res.render('user/login');
  } else {
    // DB 연결 체크
    try {
      await sequelize.authenticate();
      console.log('list get db Connection has been established successfully.');
    } catch (err) {
      console.error('Unable to connect to the database:', err);
      res.send('<script type="text/javascript">alert("서버 에러");location.href="/sign_up";</script>');
      return;
    }
    let user = {
      email: req.session.email,
      name: req.session.name
    }

    try {
      //select * from test.board3;
      let myList = await board3Table.findAll({});
      res.render('list', {user: user, board3: myList});
    } catch (err) {
      console.log(err)
      res.render('list', {user: user, board3: []});
    }
  }
});

//상세보기
router.get('/edit/:idx', async (req, res) => {
  if (req.session.email == null) {
    res.render('user/login');
  } else {
    // DB 연결 체크
    try {
      await sequelize.authenticate();
      console.log('edit get db Connection has been established successfully.');
    } catch (err) {
      console.error('Unable to connect to the database:', err);
      res.send('<script type="text/javascript">alert("서버 에러");location.href="/sign_up";</script>');
      return;
    }
    let user = {
      email: req.session.email,
      name: req.session.name
    }
    let postID = req.params.idx;
    try {
      //select * from test.board3 where idx='postID';
      let myLists = await board3Table.findOne({
        where: {idx: postID}
      });
      res.render('reads', {user: user, board3: myLists});
    } catch (err) {
      console.log(err)
      // res.render('reads', {user: user, board3: []});
      res.redirect('/');
    }
  }
});

//Update(수정하기)
router.post('/update', async (req, res) => {
  if (req.session.email == null) {
    res.render('user/login');
  } else {
    // DB 연결 체크
    try {
      await sequelize.authenticate();
      console.log('edit get db Connection has been established successfully.');
    } catch (err) {
      console.error('Unable to connect to the database:', err);
      res.send('<script type="text/javascript">alert("서버 에러");location.href="/sign_up";</script>');
      return;
    }
    let user = {
      email: req.session.email,
      name: req.session.name
    }
    let postID = req.body.idx;
    try {
      //update test.board3 set title=?, name=?, content=? where idx=?;
      await board3Table.update({
        title: req.body.title,
        name: req.body.name,
        content: req.body.content,
      },{
        where: {idx: postID}
      });
        res.redirect('/list');
    } catch (err) {
      console.log(err)
      // res.render('reads', {user: user, board3: []});
      res.redirect('/list');
    }
  }
});

//Delete(삭제하기)
router.post('/edit/:idx/delete', async (req, res) => {
  if (req.session.email == null) {
    res.render('user/login');
  } else {
    // DB 연결 체크
    try {
      await sequelize.authenticate();
      console.log('edit get db Connection has been established successfully.');
    } catch (err) {
      console.error('Unable to connect to the database:', err);
      res.send('<script type="text/javascript">alert("서버 에러");location.href="/sign_up";</script>');
      return;
    }
    let user = {
      email: req.session.email,
      name: req.session.name
    }
    let postID = req.params.idx;
    try {
      //delete from test.board3 where idx=?;
      await board3Table.destroy({
        where: {idx: postID}
      });
        res.redirect('/list');
    } catch (err) {
      console.log(err)
      // res.render('reads', {user: user, board3: []});
      res.redirect('/list');
    }
  }
});


//pagination
// router.get('/page', async (req, res) => {
//   if (req.session.email == null) {
//     res.render('user/login');
//   } else {
//     // DB 연결 체크
//     try {
//       await sequelize.authenticate();
//       console.log('list get db Connection has been established successfully.');
//     } catch (err) {
//       console.error('Unable to connect to the database:', err);
//       res.send('<script type="text/javascript">alert("서버 에러");location.href="/sign_up";</script>');
//       return;
//     }
//     let user = {
//       email: req.session.email,
//       name: req.session.name
//     }
//     //offset : 몇 번째부터 조회할 것인지 여부
//     // limit : 조회할 개수
//     let pageNum = req.query.page;
//     let size = req.query.size;
//     // let offset = 0;
//     const offset = pageNum > 1 ? PER_PAGE*(pageNum-1) : 0
//     try {
//       if(pageNum>1){
//         offset = 5 * (pageNum - 1);
//       }
//       //select * from test.board3;
//       let myList = await board3Table.findAll({
//         offset: offset,
//         limit: 10
//       });
//       res.render('page', {user: user, board3: myList});
//     } catch (err) {
//       console.log(err)
//       res.render('page', {user: user, board3: []});
//     }
//   }
// });
module.exports = router;

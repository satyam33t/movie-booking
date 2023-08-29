var admin = require("firebase-admin");
var serviceAccount = require("./ss.json");
const dateTime = require('date-time');
const secure = require('./encryption.js');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://rsi-project-656a3.firebaseio.com"
});

var ref = admin.database().ref('Movies');

const idVerify = (user, callback) => {
    var uid = admin.database().ref('UserSignIn2/'+user);
 return new Promise ((resolve, reject) => {uid.on('value', function(snapshot) {
   if(snapshot.val()!==null){
     resolve();
   }else{
     reject();
   }
});})}

// ====================== mobNO and password Verification Promise =====================

const authenticate = (user, mobno, pass) => {
  return new Promise((resolve, reject)=>{
    let uid = admin.database().ref('UserSignIn2/' + user).once('value');
  uid.then((e) => {
    return e.toJSON();
  })
  var ref = admin
  .then((data) => {
    if(data.mobno.length < 15){
      if(data.mobno === mobno && data.pass === pass)
        {
          let enc = [secure.encrypt(mobno), secure.encrypt(pass)];
          Promise.all(enc)
          .then((enc_data) => {
            admin.database().ref('UserSignIn2/' + user + '/mobno').set(enc_data[0])
            .then(() => {
              return admin.database().ref('UserSignIn2/' + user + '/pass').set(enc_data[1]);
            })
            .then(() => {
              resolve();
            })
            .catch((e) => {
              console.log(e);
              reject();
            })
          });
        }
      else 
        console.log(false, 0);
    }
    else
    {
      let dec = [secure.decrypt(data.mobno), secure.decrypt(data.pass)];
      Promise.all(dec)
      .then((dec_data) => {
        if(dec_data[0] === mobno && dec_data[1] === pass)
          resolve();
        else 
          reject();
      });    
    }
  });
  })
}

// ============================== mobNo And User Verification ===============================
const authMobNo = (user, mobile) => {
  return new Promise((resolve, reject) => {
    let mob = admin.database().ref('UserSignIn2/' + user).once('value');
    mob.then((o) => o.toJSON())
    .then(data => {
      if(data.mobno.length < 15)
      {
        if(mobile === data.mobno)
          {
          secure.encrypt(mobile)
          .then((enc) => {
            return admin.database().ref('UserSignIn2/' + user + '/mobno').set(enc)
          })
          .then(() => {resolve()}, () => {reject()})
          .catch(e => {
            console.log(e)});
          }
        else
        {
          reject();
        }
      }
      else
      {
        secure.decrypt(data.mobno)
        .then((mobNo) => {
          if(mobile === mobNo)
          resolve();
          else
          reject();
        })
        .catch(e => {console.log(e)});
      }
    })
    .catch(e => {console.log(e)});
  })
}

// ============================== Change Password =================================

const updatePass = (user, newPass) => {
  return new Promise((resolve, reject) => {
    secure.encrypt(newPass)
  .then(
    (enc) =>
     {
      return admin.database().ref('UserSignIn2/'+user + '/pass').set(enc);
    },
    () => 
    {
      reject();
    }
  )
  .then(()=>
  {
    resolve()
  }, ()=>
  {
    reject()
  })
  .catch((e)=>{console.log(e)});})  
}

// ============================== Change Mobile Number ============================

let changeMobNo = (user,newMobile) => {
  return new Promise((resolve, reject) => {idVerify(user)
  .then(() => {
    secure.encrypt(newMobile)
    .then((enc) => {
      return admin.database().ref('UserSignIn2/'+user+'/mobno').set(enc);
    })
    .then(() => {resolve()}, ()=> {reject()})
    .catch((e) => {console.log(e)});
  },
  () => {
    reject();
  })
  .catch((e)=>{console.log(e)});})
}

// ========================= Get Total Price ======================================
let getTotalPrice = (rsiId,movieKey) => {
  let guestPrice;
  let membersPrice;
  let dependentPrice;
  let dependentCount=null;
  let settings = admin.database().ref();
  return new Promise((resolve, reject) => {settings.on('value', function(snapshot)
  {
      snapshot.forEach(childSnapshot=>
      {
        if(childSnapshot.key==='Settings')
        {
          var prices=admin.database().ref('Settings');
          prices.once('value',snapshot=>
          {
            guestPrice=snapshot.val().guePrice;
            membersPrice=snapshot.val().memPrice;
            dependentPrice=snapshot.val().memPrice;
          })
        }
        if(childSnapshot.key==='DepCount')
        {
          var refer=admin.database().ref('DepCount');
          refer.once('value',snapshot=>
          {
            if(snapshot.hasChild(rsiId))
            {
              refer1=admin.database().ref('DepCount/'+rsiId+'/depCount');
              refer1.once('value',snapshot1=>
              {
                dependentCount=snapshot1.val();
              })
            }
            else
            {
              admin.database().ref('DepCount/'+rsiId).set({
                depCount : "0",
                rsiID : rsiId
              });
              dependentCount=0;
            }
          })
          }
      });
    //   console.log("DepCount :"+dependentCount);
    //   console.log("Total_Prices :"+guestPrice+" "+membersPrice+" "+dependentPrice+" "+dependentCount);
      var refff=admin.database().ref('Movies/'+movieKey);
      refff.once('value',snapshot=>
      {
        var date=snapshot.val().date;
        var time = snapshot.val().timing;
        var reffff=admin.database().ref('Summary/'+date+'/'+time);
        reffff.once('value',snapshot1=>
        {
          if(snapshot1.hasChild(rsiId))
          {
            var refffff=admin.database().ref('Summary/'+date+'/'+time+'/'+rsiId);
            refffff.once('value',snapshot2=>
            {
            //   console.log(snapshot2.val().guest+" "+snapshot2.val().member+"Sanjay");
              if(guestPrice!=null && membersPrice!=null && dependentPrice!=null)
              {
              let obj = {
                Gp: guestPrice,
                Mp: membersPrice,
                Dp: dependentPrice,
                Dc: parseInt(snapshot2.val().dcount_lim)-parseInt(snapshot2.val().dependents),
                Gc :6-parseInt(snapshot2.val().guest),
                Mc :1-parseInt(snapshot2.val().member),
                fl : 1
              };
              resolve(obj); 
            }
            else
            {
              reject();
            }  
            })
          }
          else
          {
              if(guestPrice!=null && membersPrice!=null && dependentPrice!=null)
              {
                let obj = 
                {
                  Gp: guestPrice,
                  Mp: membersPrice,
                  Dp: dependentPrice,
                  Dc: dependentCount,
                  Gc :6,
                  Mc :1,
                  fl :0
                };
                resolve(obj);
              }
              else
              {
                reject();
              }
          }
        });
      });
  });
});
}

let checkBooking = (rsiid, movieKey) => {
  var dateOfMovie,nameOfMovie,timing;
//   console.log(movieKey);
  return new Promise((resolve,reject)=>
  {
    if(movieKey)
    {
      var ref = admin.database().ref('Movies/'+movieKey);
      ref.on('value',function(snapshot)
      {
        snapshot.forEach(childSnapshot=>
          {
            if(childSnapshot.key==='date')
            {
              dateOfMovie=childSnapshot.val();
            }
            if(childSnapshot.key==='name')
            {
              nameOfMovie=childSnapshot.val();
            }
            if(childSnapshot.key==='timing')
            {
              timing=childSnapshot.val();
            }
          })
        //   console.log(dateOfMovie);
          var refff=admin.database().ref('Summary/'+dateOfMovie+'/'+timing);
          refff.once('value',snapshot=>
          {
                if(snapshot.hasChild(rsiid))
                {
                    var reffff=admin.database().ref('Summary/'+dateOfMovie+'/'+timing+'/'+rsiid);
                    reffff.once('value',snapshot=>
                    {
                      var dependents=snapshot.val().dependents;
                      var member=snapshot.val().member;
                      var guest=snapshot.val().guest;
                      var refer = admin.database().ref('DepCount/'+rsiid+'/depCount');
                      refer.once('value',(snapshot)=>{
                        var dcount_lim=snapshot.val();
                        admin.database().ref('Summary/'+dateOfMovie+'/'+timing+'/'+rsiid+'/dcount_lim').set(dcount_lim);
                        if(dcount_lim==dependents&&member==1&&guest==6)
                        {
                          reject();
                        }
                        else
                        {
                          resolve();
                        }
                      });
                    });
                }
                else
                {
                  resolve();
                }
          })   
          })
    }
    else
    {
      reject();
    }
})
}

// ============================= Get Movies =======================================

let getMovies=function(rsiid)
{
  let movieDetails=admin.database().ref('Movies/').orderByChild('date');
  return new Promise((resolve,reject)=>
  {
    if(rsiid!='A-007'){
      movieDetails.on('value',function(snapshot)
      {
        var obj=[];
        snapshot.forEach(childSnapshot=>
          {
            
            var dateComing = childSnapshot.val().date;
            // var timeComing = childSnapshot.val().timing;
            if(dateComing){
              var dt = dateTime();
              // console.log("Date :"+dt);
              var arr = dt.split(" ");
              var date = arr[0][8]+arr[0][9]+arr[0][7]+arr[0][5]+arr[0][6]+arr[0][4]+arr[0][0]+arr[0][1]+arr[0][2]+arr[0][3];
              var time = arr[1];

              var dayc = dateComing[0]+dateComing[1];
              var day = date[0]+date[1];
              // console.log(dayc + " " + dateComing[0]+" "+dateComing[1]);

              var monthc = dateComing[3]+dateComing[4];
              var month = date[3]+date[4];

              var yearc = dateComing[6]+dateComing[7]+dateComing[8]+dateComing[9];
              var year = date[6]+date[7]+date[8]+date[9];

              if (("18:00"<time && dayc===day && monthc===month && yearc===year)||(dayc<day && monthc===month && yearc===year)||(monthc<month && yearc===year)||(yearc<year))
              {
                //console.log("Date Time Issue!!!");
              }
              else{
                let newobj=
                {
                  movieKey:childSnapshot.key,
                  certification:childSnapshot.val().certification,
                  date:childSnapshot.val().date,
                  duration:childSnapshot.val().duration,
                  image_url:childSnapshot.val().image_url,
                  language:childSnapshot.val().language,
                  name:childSnapshot.val().name,
                  timing:childSnapshot.val().timing,
                  rsiid:rsiid
                }
                obj.push(newobj);
              }
            }
          })
          resolve(obj);
        }) 
    }
    else{
      movieDetails.on('value',function(snapshot)
      {
        var obj=[];
        snapshot.forEach(childSnapshot=>
          {
              let newobj=
              {
                movieKey:childSnapshot.key,
                certification:childSnapshot.val().certification,
                date:childSnapshot.val().date,
                duration:childSnapshot.val().duration,
                image_url:childSnapshot.val().image_url,
                language:childSnapshot.val().language,
                name:childSnapshot.val().name,
                timing:childSnapshot.val().timing,
                rsiid:rsiid
              }
              obj.push(newobj);
          })
          resolve(obj);
        })
    } 
  })
}

// ======================================= Get Summary ============================

let getSummary = (movieId)=>{
  let movie = admin.database().ref('Movies/'+movieId);
  let details = {};
  return new Promise((resolve, reject) => {
    movie.once('value', (snapshot)=>{
      details.time = snapshot.val().timing;
      details.date = snapshot.val().date;
      details.name = snapshot.val().name;
    });
    resolve(details);
  });
}

// ============================ Book ticket =======================================

let bookTicket = (arr, movieKey)=>{
    var i;
    var flag=0;
    return new Promise((resolve, reject) => { for(i=0; i<arr.length; i++){
        admin.database().ref('Movies/'+movieKey+'/hall/status/'+arr[i]).set("R");  
        flag+=1;
      }
      if(flag===arr.length)
      {
        resolve();
      }
  });
}

// ============================ Insert Ticket Data ================================

let insertTicket = (userID, arr,seatValues, movieNmae, movietime, date, cost,member,dependents,guests) => {
  admin.database().ref('Tickets/'+userID+"/").push({
    cost : cost,
    date : date,
    movieNmae : movieNmae,
    movietime : movietime,
    provisional : true,
    timestamp : dateTime(admin.database.ServerValue.TIMESTAMP),
    userID : userID,
    seatsList : arr
});
admin.database().ref('Tickets/'+'A-007'+"/").push({
  cost : cost,
  date : date,
  movieNmae : movieNmae,
  movietime : movietime,
  provisional : true,
  timestamp : dateTime(admin.database.ServerValue.TIMESTAMP),
  userID : userID,
  seatsList : arr
});



var ref = admin.database().ref('Summary/'+date+'/'+time);
ref.once('value',(snapshot)=>{
    if(snapshot.hasChild(userID)){
        var reff = admin.database().ref('Summary/'+date+'/'+time+'/'+userID);
        reff.once('value',snapshot=>{
            var gst =snapshot.val().guest;
            var mem = snapshot.val().member;
            var dep = snapshot.val().dependents;
            var tc = snapshot.val().totalCost;
            var sts = snapshot.val().seats;
            var dl=snapshot.val().dcount_lim;
            var totalc=parseInt(cost)+parseInt(tc);
            admin.database().ref('Summary/'+date+'/'+time+'/'+userID).set({
                date  :date,
                dcount_lim :String(dl),
                dependents :String(parseInt(dependents)+parseInt(dep)),
                guest :String(parseInt(guests)+parseInt(gst)),
                member :String(parseInt(member)+parseInt(mem)),
                movieName :movieNmae,
                rsiID :userID,
                seats : seatValues+","+sts,
                time : movietime+" hr",
                totalCost : String(totalc),
                typeOfTicket : 'Provisional Ticket'
            });
        });
    }else{
        var refff=admin.database().ref('DepCount/'+userID+'/depCount');
        refff.once('value',snapshot=>
        {
            var totalc=parseInt(cost);
          admin.database().ref('Summary/'+date+'/'+time+'/'+userID).set({
            date  :date,
            dcount_lim :snapshot.val(),
            dependents :dependents,
            guest :guests,
            member :member,
            movieName :movieNmae,
            rsiID :userID,
            seats : seatValues,
            time : movietime+" hr",
            totalCost : String(totalc),
            typeOfTicket : 'Provisional Ticket'
        });
        });
    }
});
}

// ========================== Get Tickets =========================================

let getTickets = (user) => {
  let ticketArr = [];
  let seatsArr = [];
  return new Promise ((resolve, reject) => 
  { let tickets = admin.database().ref('Tickets/' + user).orderByChild('date');
    tickets.on('value', (snapshot) => 
    {
    snapshot.forEach(childSnapshot =>
    {
      let map={};
      map['cost']=childSnapshot.val().cost;
      map['date']=childSnapshot.val().date;
      map['movieNmae']=childSnapshot.val().movieNmae;
      map['movietime']=childSnapshot.val().movietime;
      map['provisional']=childSnapshot.val().provisional;
      map['seatsList']=childSnapshot.val().seatsList;
      map['timestamp']=childSnapshot.val().timestamp;
      map['userID']=childSnapshot.val().userID;
      
      seatsArr=childSnapshot.val().seatsList;

let seatsMap =[];
var mapp = {};
var i;
for(i=0; i<359; i++){
    if(i>=0 && i<22){
        mapp[i]='B'+(i+1);
    }
    else if(i>=22 && i<42){
        mapp[i]='C'+(i-21);
    }
    else if(i>=42 && i<64){
        mapp[i]='D'+(i-41);
    }
    else if(i>=64 && i<84){
        mapp[i]='E'+(i-63);
    }
    else if(i>=84 && i<106){
        mapp[i]='F'+(i-83);
    }
    else if(i>=106 && i<126){
        mapp[i]='G'+(i-105);
    }
    else if(i>=126 && i<148){
        mapp[i]='H'+(i-125);
    }
    else if(i>=148 && i<168){
        mapp[i]='I'+(i-147);
    }
    else if(i>=168 && i<190){
        mapp[i]='J'+(i-167);
    }
    else if(i>=190 && i<210){
        mapp[i]='K'+(i-189);
    }
    else if(i>=210 && i<232){
        mapp[i]='L'+(i-209);
    }
    else if(i>=232 && i<252){
        mapp[i]='M'+(i-231);
    }
    else if(i>=252 && i<274){
        mapp[i]='N'+(i-251);
    }
    else if(i>=274 && i<294){
        mapp[i]='O'+(i-273);
    }
    else if(i>=294 && i<316){
        mapp[i]='P'+(i-293);
    }
    else if(i>=316 && i<336){
        mapp[i]='Q'+(i-315);
    }
    else if(i>=336 && i<358){
        mapp[i]='R'+(i-335);
    }
}

for(let key in seatsArr)
{
  seatsMap.push(mapp[seatsArr[key]]);
}
      map['seatsMap']=seatsMap;
      ticketArr.push(map);
    })
      resolve(ticketArr);
    });    
  });
}

// ========================== EXPORTS =============================================
module.exports.idVerify = idVerify;
module.exports.authenticate = authenticate;
module.exports.authMobNo = authMobNo;
module.exports.updatePass = updatePass;
module.exports.getTotalPrice = getTotalPrice;
module.exports.getMovies = getMovies;
module.exports.getSummary = getSummary;
module.exports.bookTicket = bookTicket;
module.exports.insertTicket = insertTicket;
module.exports.getTickets = getTickets;
module.exports.changeMobNo = changeMobNo;
module.exports.checkBooking = checkBooking;